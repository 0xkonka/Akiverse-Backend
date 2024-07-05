import { Context } from "../context";
import { ArcadePart, ArcadePartCategory, Prisma } from "@prisma/client";
import { Service } from "typedi";
import { getJunkMetadata, JunkMetadata } from "../metadata/arcade-parts";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  UnhandledUseCaseError,
} from "./errors";
import { GameId, games } from "../metadata/games";

export interface JunkUseCase {
  swap(
    ctx: Context,
    category: ArcadePartCategory,
    subCategory: string,
    numArcadePartsToCreate: number,
  ): Promise<ArcadePart[]>;
}

@Service()
export class JunkUseCaseImpl implements JunkUseCase {
  async swap(
    ctx: Context,
    category: ArcadePartCategory,
    subCategory: string,
    numArcadePartsToCreate: number,
  ): Promise<ArcadePart[]> {
    let metadata: JunkMetadata;
    try {
      metadata = getJunkMetadata(category, subCategory);
    } catch (e: unknown) {
      throw new InvalidArgumentUseCaseError("unknown junk part");
    }

    if (category === "ROM") {
      const gameMetadata = games[subCategory as GameId];
      if (!gameMetadata.enabled) {
        throw new InvalidArgumentUseCaseError("disabled game cannot swap");
      }
    }

    const junk = await ctx.prisma.junk.findUnique({
      where: {
        userId_category_subCategory: {
          userId: ctx.userId!,
          category: category,
          subCategory: subCategory,
        },
      },
    });
    const useJunkCount = metadata.junksPerPart * numArcadePartsToCreate;
    if (!junk || (junk && junk.amount < useJunkCount)) {
      throw new IllegalStateUseCaseError(
        "junk are out of numArcadePartsToCreate.",
      );
    }

    try {
      return await ctx.prisma.$transaction(async (tx) => {
        await tx.junk.update({
          where: {
            userId_category_subCategory: {
              userId: ctx.userId!,
              category: category,
              subCategory: subCategory,
            },
          },
          data: {
            amount: {
              decrement: useJunkCount,
            },
          },
        });
        const insertedArcadePart: ArcadePart[] = [];
        for (let i = 0; i < numArcadePartsToCreate; i++) {
          const ap = await tx.arcadePart.create({
            data: {
              userId: ctx.userId!,
              ownerWalletAddress: ctx.walletAddress,
              category: category,
              subCategory: subCategory,
              usedJunks: metadata.junksPerPart,
              state: "IN_AKIVERSE",
            },
          });
          insertedArcadePart.push(ap);
        }
        return insertedArcadePart;
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientUnknownRequestError) {
        if (e.message.includes("junks_amount_over_zero")) {
          throw new ConflictUseCaseError("Insufficient amount of junk");
        }
      }
      throw new UnhandledUseCaseError("swap failed", e);
    }
  }
}
