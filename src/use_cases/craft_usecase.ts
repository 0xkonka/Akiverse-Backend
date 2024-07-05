import { Context } from "../context";
import { ArcadeMachine, ArcadePartCategory, NftState } from "@prisma/client";
import {
  AbstractUseCaseError,
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InternalServerUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "./errors";
import { arcadeMachines } from "../metadata/arcade-machines";
import { GameId } from "../metadata/games";
import {
  AccumulatorId,
  accumulators,
  CabinetCategoryId,
  getJunkMetadata,
  lowerCabinets,
  roms,
  upperCabinets,
} from "../metadata/arcade-parts";
import { Inject, Service } from "typedi";
import { CRAFT_BASE_FEES } from "../constants";
import { Prisma } from "@prisma/client";
import { notifyCraft } from "../helpers/event_notification";
import { distributionRewardCraftCount } from "../helpers/campaign";
import { RankingUseCase } from "./ranking_usecase";

export type CraftCurrencyType = "TERAS" | "AKV";
export interface CraftUseCase {
  craft(
    ctx: Context,
    parts: CraftPartType[],
    currencyType: CraftCurrencyType,
  ): Promise<ArcadeMachine>;
}

export type CraftPartType = CraftArcadePart | CraftJunkPart;
type CraftPart = { category: ArcadePartCategory; useJunk: boolean };
export type CraftArcadePart = CraftPart & { tokenId: string; useJunk: false };
export type CraftJunkPart = CraftPart & { subCategory: string; useJunk: true };
type CraftArcadePartWithSubCategory = CraftArcadePart & { subCategory: string };
type CraftJunkPartWithNeededCount = CraftJunkPart & {
  junksPerPart: number;
};

@Service("craft.useCase")
export class CraftUseCaseImpl implements CraftUseCase {
  constructor(
    @Inject("ranking.useCase")
    private readonly rankingUseCase: RankingUseCase,
  ) {}
  async craft(
    ctx: Context,
    parts: CraftPartType[],
    currencyType: CraftCurrencyType,
  ): Promise<ArcadeMachine> {
    // 一応チェック
    const categorySet = new Set<ArcadePartCategory>();
    parts.map((value) => {
      categorySet.add(value.category);
    });
    if (categorySet.size !== 4) {
      throw new InternalServerUseCaseError(
        "parts category required 4 unique types",
      );
    }

    const useJunks: CraftJunkPart[] = parts
      .filter((value) => {
        return value.useJunk;
      })
      .map((value) => {
        return value as CraftJunkPart;
      });
    const useArcadeParts: CraftArcadePart[] = parts
      .filter((value) => {
        return !value.useJunk;
      })
      .map((value) => {
        return value as CraftArcadePart;
      });

    const junksWithNeededCount: CraftJunkPartWithNeededCount[] = [];
    // JunkPartの必要数保持しているか確認
    if (useJunks.length > 0) {
      const junkPartsAmount = await ctx.prisma.junk.findMany({
        where: {
          OR: useJunks.map((value) => {
            return {
              category: value.category,
              subCategory: value.subCategory,
              userId: ctx.userId,
            };
          }),
        },
      });
      if (junkPartsAmount.length !== useJunks.length) {
        throw new InvalidArgumentUseCaseError("Insufficient quantity of parts");
      }
      for (const junkPartsAmountElement of junkPartsAmount) {
        try {
          const { junksPerPart } = getJunkMetadata(
            junkPartsAmountElement.category,
            junkPartsAmountElement.subCategory,
          );

          if (junkPartsAmountElement.amount < junksPerPart) {
            throw new InvalidArgumentUseCaseError(
              "Insufficient quantity of parts",
            );
          }
          junksWithNeededCount.push({
            ...junkPartsAmountElement,
            junksPerPart: junksPerPart,
            useJunk: true,
          });
        } catch (e: unknown) {
          if (e instanceof AbstractUseCaseError) {
            throw e;
          }
          throw new InvalidArgumentUseCaseError("unknown junk part");
        }
      }
    }

    const arcadePartWithSubCategories: CraftArcadePartWithSubCategory[] = [];
    // ArcadePartの所有権＆category一致チェック
    if (useArcadeParts.length > 0) {
      const arcadeParts = await ctx.prisma.arcadePart.findMany({
        where: {
          id: {
            in: useArcadeParts.map((value) => {
              return value.tokenId;
            }),
          },
        },
      });
      // 数が一致していない＝存在しないIDを指定している
      if (arcadeParts.length !== useArcadeParts.length) {
        throw new InvalidArgumentUseCaseError(
          "A nonexistent ArcadePartsID is specified.",
        );
      }

      // 所有権確認
      if (!ctx.currentUserOwns(...arcadeParts)) {
        throw new PermissionDeniedUseCaseError();
      }

      for (const part of arcadeParts) {
        if (part.state !== NftState.IN_AKIVERSE) {
          throw new IllegalStateUseCaseError(
            `${part.subCategory} is not IN_AKIVERSE state`,
          );
        }
        if (part.destroyedAt !== null) {
          throw new IllegalStateUseCaseError(
            "already destroyed parts is selected",
          );
        }
        // 引数で渡されたCategoryとDBから取得したCategoryが一致しているか確認
        const c = useArcadeParts.find((value) => {
          return value.tokenId === part.id;
        })!;
        if (c.category !== part.category) {
          throw new InvalidArgumentUseCaseError("category mismatch");
        }
        // subCategoryを持てる型に入れ替える
        arcadePartWithSubCategories.push({
          category: part.category,
          subCategory: part.subCategory,
          tokenId: part.id,
          useJunk: false,
        });
      }
    }

    const merged = [...arcadePartWithSubCategories, ...junksWithNeededCount];

    // 必要なmetadataを取得する
    const gameId = merged.find((value) => {
      return value.category === ArcadePartCategory.ROM;
    })?.subCategory as GameId;
    const arcadeMachineMetadata = arcadeMachines[gameId];
    const romMetadata = roms[gameId];
    const accMetadata =
      accumulators[
        merged.find((value) => {
          return value.category === ArcadePartCategory.ACCUMULATOR;
        })?.subCategory as AccumulatorId
      ];
    const lcMetadata =
      lowerCabinets[
        merged.find((value) => {
          return value.category === ArcadePartCategory.LOWER_CABINET;
        })?.subCategory as CabinetCategoryId
      ];
    const ucMetadata =
      upperCabinets[
        merged.find((value) => {
          return value.category === ArcadePartCategory.UPPER_CABINET;
        })?.subCategory as CabinetCategoryId
      ];

    // 生成できるパーツの組み合わせかチェック
    if (
      !arcadeMachineMetadata.usableParts.rom(romMetadata) ||
      !arcadeMachineMetadata.usableParts.accumulator(accMetadata) ||
      !arcadeMachineMetadata.usableParts.lowerCabinet(lcMetadata) ||
      !arcadeMachineMetadata.usableParts.upperCabinet(ucMetadata)
    ) {
      throw new InvalidArgumentUseCaseError("Wrong combination of parts");
    }

    const maxEnergy = accMetadata.tankCapacity;

    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    });
    if (!user) {
      throw new NotFoundUseCaseError("user not found", "User");
    }

    const { requiredTerasBalance, requiredAkvBalance } =
      currencyType === "TERAS"
        ? {
            requiredTerasBalance: CRAFT_BASE_FEES.TERAS,
            requiredAkvBalance: new Prisma.Decimal(0),
          }
        : {
            requiredTerasBalance: new Prisma.Decimal(0),
            requiredAkvBalance: CRAFT_BASE_FEES.AKV,
          };

    if (user.terasBalance.lt(requiredTerasBalance)) {
      throw new IllegalStateUseCaseError("Teras balance is insufficient.");
    }
    if (user.akvBalance.lt(requiredAkvBalance)) {
      throw new IllegalStateUseCaseError("AKV balance is insufficient.");
    }

    let afterCraft;
    try {
      const userId = ctx.userId!;
      const tokenIds = useArcadeParts.map((value) => {
        return value.tokenId;
      });
      const ret = await ctx.prisma.$transaction(async (tx) => {
        // Junk
        for (const junk of junksWithNeededCount) {
          // Junkの在庫を減算
          await tx.junk.update({
            data: {
              amount: {
                decrement: junk.junksPerPart,
              },
            },
            where: {
              userId_category_subCategory: {
                userId: userId,
                category: junk.category,
                subCategory: junk.subCategory,
              },
            },
          });
          const createdArcadePart = await tx.arcadePart.create({
            data: {
              userId: userId,
              ownerWalletAddress: user.walletAddress,
              category: junk.category,
              subCategory: junk.subCategory,
            },
          });
          tokenIds.push(createdArcadePart.id);
        }

        await tx.user.update({
          where: { id: userId },
          data: {
            terasBalance: {
              decrement: requiredTerasBalance,
            },
            akvBalance: {
              decrement: requiredAkvBalance,
            },
          },
        });
        const arcadeMachine = await tx.arcadeMachine.create({
          data: {
            game: romMetadata.subCategory,
            maxEnergy: maxEnergy,
            state: NftState.IN_AKIVERSE,
            userId: userId,
            ownerWalletAddress: ctx.walletAddress,
            accumulatorSubCategory: accMetadata.subCategory,
            upperCabinetSubCategory: ucMetadata.subCategory,
            lowerCabinetSubCategory: lcMetadata.subCategory,
          },
        });
        const craft = await tx.craft.create({
          data: {
            userId: userId,
            usedTerasBalance: requiredTerasBalance,
            usedAkvBalance: requiredAkvBalance,
            craftedArcadeMachineId: arcadeMachine.id,
          },
        });
        afterCraft = craft;

        const { count } = await tx.arcadePart.updateMany({
          where: {
            id: {
              in: tokenIds,
            },
            destroyedAt: null,
            userId: userId,
            state: NftState.IN_AKIVERSE,
          },
          data: {
            destroyedAt: new Date(),
            craftId: craft.id,
          },
        });
        if (count !== 4) {
          throw new ConflictUseCaseError("craft conflicted");
        }
        return tx.arcadeMachine.findUniqueOrThrow({
          where: { id: craft.craftedArcadeMachineId },
        });
      });
      await distributionRewardCraftCount(ctx);
      await notifyCraft(ctx.userId!, ret.id);
      await this.rankingUseCase.craft(ctx, afterCraft!);
      return ret;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientUnknownRequestError) {
        // Teras残高不足の制約違反
        if (e.message.includes("teras_balance_over_zero")) {
          throw new ConflictUseCaseError("Teras balance is insufficient");
        } else if (e.message.includes("junks_amount_over_zero")) {
          // Junkパーツ数量不足の制約違反
          throw new ConflictUseCaseError("junk amount is insufficient");
        }
      }
      throw e;
    }
  }
}
