import { Context } from "../context";
import {
  ActiveBooster,
  ActiveBoosterForTournament,
  BoosterMaster,
  User,
} from "@prisma/client";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "./errors";
import dayjs from "dayjs";
import { writeTournamentBoosterTransaction } from "../helpers/ticket_transaction";
import { Service } from "typedi";

export interface BoosterItemUseCase {
  apply(
    ctx: Context,
    boosterItemId: string,
    paidTournamentId?: string,
  ): Promise<ActiveBooster | ActiveBoosterForTournament>;
}

@Service("boosterItem.useCase")
export class BoosterItemUseCaseImpl implements BoosterItemUseCase {
  async apply(
    ctx: Context,
    boosterItemId: string,
    paidTournamentId?: string | undefined,
  ): Promise<ActiveBooster | ActiveBoosterForTournament> {
    // アイテムが実在すること
    const boosterItem = await ctx.prisma.boosterMaster.findUnique({
      where: {
        id: boosterItemId,
      },
    });
    if (!boosterItem) {
      throw new InvalidArgumentUseCaseError("unknown booster item");
    }
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    if (user.tickets < boosterItem.feeTickets) {
      // チケット不足
      throw new IllegalStateUseCaseError("insufficient ticket");
    }
    if (boosterItem.requireTournament) {
      if (!paidTournamentId) {
        throw new InvalidArgumentUseCaseError(
          "this booster item require tournamentId",
        );
      }
      return await this.applyOnlyTournament(
        ctx,
        boosterItem,
        user,
        paidTournamentId,
      );
    } else {
      return await this.applyAll(ctx, boosterItem, user, paidTournamentId);
    }
  }
  private async applyOnlyTournament(
    ctx: Context,
    boosterItem: BoosterMaster,
    user: User,
    paidTournamentId: string,
  ): Promise<ActiveBoosterForTournament> {
    // トナメに参加していること
    const tournamentEntryWithTournament =
      await ctx.prisma.paidTournamentEntry.findUnique({
        where: {
          paidTournamentId_userId: {
            paidTournamentId: paidTournamentId,
            userId: ctx.userId!,
          },
        },
        include: {
          paidTournament: true,
        },
      });
    if (!tournamentEntryWithTournament) {
      throw new IllegalStateUseCaseError("tournament entry required");
    }

    // そのトーナメントで購入可能なアイテムか判定
    if (!(await this.validateItem(ctx, boosterItem.id, paidTournamentId))) {
      throw new InvalidArgumentUseCaseError("Items not available.");
    }

    // 今有効なブースター取得
    const currentActiveBooster =
      await ctx.prisma.activeBoosterForTournament.findUnique({
        where: {
          userId_paidTournamentId_category_subCategory: {
            userId: ctx.userId!,
            paidTournamentId: paidTournamentId,
            category: boosterItem.category,
            subCategory: boosterItem.subCategory,
          },
          endAt: {
            gte: new Date(),
          },
        },
      });
    const baseEndAt = dayjs(
      currentActiveBooster ? currentActiveBooster.endAt : new Date(),
    );
    let afterEndAt;
    if (boosterItem.effectiveMinutes < 0) {
      // トーナメント開催期間中有効なアイテム=トナメの終了時刻で効果時間を設定する
      afterEndAt = dayjs(tournamentEntryWithTournament.paidTournament.endAt);
      if (baseEndAt.isSame(afterEndAt)) {
        throw new IllegalStateUseCaseError(
          "Selected booster items that cannot be applied at the same time",
        );
      }
    } else {
      // effectiveMinutes分だけ有効なアイテム＝加算する
      const addedEndAt = baseEndAt.add(boosterItem.effectiveMinutes, "minutes");
      // トナメ終了期間を超えないかチェック
      if (
        addedEndAt.isAfter(tournamentEntryWithTournament.paidTournament.endAt)
      ) {
        throw new InvalidArgumentUseCaseError(
          "Booster items cannot be applied beyond the tournament end time.",
        );
      }
      afterEndAt = addedEndAt;
    }

    const update = await ctx.prisma.$transaction([
      ctx.prisma.activeBoosterForTournament.upsert({
        where: {
          userId_paidTournamentId_category_subCategory: {
            userId: ctx.userId!,
            paidTournamentId: paidTournamentId,
            category: boosterItem.category,
            subCategory: boosterItem.subCategory,
          },
        },
        update: {
          endAt: afterEndAt.toDate(),
        },
        create: {
          userId: ctx.userId!,
          paidTournamentId: paidTournamentId,
          category: boosterItem.category,
          subCategory: boosterItem.subCategory,
          endAt: afterEndAt.toDate(),
        },
      }),
      ctx.prisma.user.update({
        where: {
          id: ctx.userId!,
          // 楽観ロック
          tickets: user.tickets,
        },
        data: {
          tickets: {
            decrement: boosterItem.feeTickets,
          },
        },
      }),
      writeTournamentBoosterTransaction(
        ctx,
        user.tickets - boosterItem.feeTickets,
        boosterItem,
        paidTournamentId,
      ),
    ]);
    return update[0];
  }

  private async applyAll(
    ctx: Context,
    boosterItem: BoosterMaster,
    user: User,
    paidTournamentId?: string,
  ): Promise<ActiveBooster> {
    // 今有効なブースター取得
    const currentActiveBooster = await ctx.prisma.activeBooster.findUnique({
      where: {
        userId_category_subCategory: {
          userId: ctx.userId!,
          category: boosterItem.category,
          subCategory: boosterItem.subCategory,
        },
        endAt: {
          gte: new Date(),
        },
      },
    });
    const baseEndAt = dayjs(
      currentActiveBooster ? currentActiveBooster.endAt : new Date(),
    );
    const addedEndAt = baseEndAt.add(boosterItem.effectiveMinutes, "minutes");

    // SPARK時のTerasUp効果は倍率違いが存在するために特殊なチェックが必要
    if (boosterItem.category === "SPARK_TERAS_UP") {
      const currentActiveBoosterSparkTerasUps =
        await ctx.prisma.activeBooster.findMany({
          where: {
            userId: ctx.userId!,
            category: boosterItem.category,
            subCategory: {
              not: boosterItem.subCategory,
            },
            endAt: {
              gte: new Date(),
            },
          },
        });
      // 現在有効な別倍率のものが存在する場合は適用不可
      if (currentActiveBoosterSparkTerasUps.length > 0) {
        throw new IllegalStateUseCaseError(
          "Selected booster items that cannot be applied at the same time",
        );
      }
    }
    if (paidTournamentId) {
      // トナメIDがあった場合、そのトナメの有効期間を超えないかチェック
      // トナメに参加していること
      const tournamentEntryWithTournament =
        await ctx.prisma.paidTournamentEntry.findUnique({
          where: {
            paidTournamentId_userId: {
              paidTournamentId: paidTournamentId,
              userId: ctx.userId!,
            },
          },
          include: {
            paidTournament: true,
          },
        });
      if (!tournamentEntryWithTournament) {
        throw new IllegalStateUseCaseError("tournament entry required");
      }
      // そのトーナメントで購入可能なアイテムか判定
      if (!(await this.validateItem(ctx, boosterItem.id, paidTournamentId))) {
        throw new InvalidArgumentUseCaseError("Items not available.");
      }
      if (
        addedEndAt.isAfter(tournamentEntryWithTournament.paidTournament.endAt)
      ) {
        throw new InvalidArgumentUseCaseError(
          "Booster items cannot be applied beyond the tournament end time.",
        );
      }
    }

    const update = await ctx.prisma.$transaction([
      ctx.prisma.activeBooster.upsert({
        where: {
          userId_category_subCategory: {
            userId: ctx.userId!,
            category: boosterItem.category,
            subCategory: boosterItem.subCategory,
          },
        },
        update: {
          endAt: addedEndAt.toDate(),
        },
        create: {
          userId: ctx.userId!,
          category: boosterItem.category,
          subCategory: boosterItem.subCategory,
          endAt: addedEndAt.toDate(),
        },
      }),
      ctx.prisma.user.update({
        where: {
          id: ctx.userId!,
          // 楽観ロック
          tickets: user.tickets,
        },
        data: {
          tickets: {
            decrement: boosterItem.feeTickets,
          },
        },
      }),
      writeTournamentBoosterTransaction(
        ctx,
        user.tickets - boosterItem.feeTickets,
        boosterItem,
      ),
    ]);
    return update[0];
  }

  private async validateItem(
    ctx: Context,
    itemId: string,
    tournamentId: string,
  ) {
    const dbItem = await ctx.prisma.paidTournamentBoosterAvailable.findUnique({
      where: {
        paidTournamentId_boosterMasterId: {
          paidTournamentId: tournamentId,
          boosterMasterId: itemId,
        },
      },
    });

    if (!dbItem) {
      return false;
    }
    return true;
  }
}
