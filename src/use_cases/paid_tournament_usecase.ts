import { Context } from "../context";
import {
  getRanking,
  getTournamentRankingKey,
  Rankings,
} from "../helpers/ranking";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "./errors";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import prisma, { PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE } from "../prisma";
import { PaidTournamentEntry, Prisma, PrizeSendStatus } from "@prisma/client";
import { Inject, Service } from "typedi";
import { writeEnterPaidTournamentTransaction } from "../helpers/ticket_transaction";

import { InternalServerResolverError } from "../apps/server/apis/resolvers/errors";
import { floorDecimalToIntegerValue } from "../helpers/decimal";
import {
  PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK,
  TERAS_TO_IDR_RATE,
  TERAS_TO_USD_RATE,
  TICKET_PER_TERAS_RATE
} from "../constants";
import {
  calcPrizeTerasSummary,
  canExchangePrize,
} from "../helpers/paid_tournament";
import { QuestProgressChecker } from "../helpers/quests";

export interface PaidTournamentUseCase {
  enter(ctx: Context, tournamentId: string): Promise<PaidTournamentEntry>;
  getRanking(ctx: Context, tournamentId: string): Promise<GetRankingResponse>;
  claimPrize(
    ctx: Context,
    tournamentId: string,
    transfer: { walletAddress?: string; phoneNumber?: string },
  ): Promise<void>;
}

@Service("paidTournament.useCase")
export class PaidTournamentUseCaseImpl implements PaidTournamentUseCase {
  constructor(
    @Inject("questProgressChecker")
    private readonly questChecker: QuestProgressChecker,
  ) { }

  /*
  クレーム要求する。
  要求するが実際に支払い処理する際に再度ランキング情報を取得して金額計算するので、入賞してなくても叩ける
   */
  async claimPrize(
    ctx: Context,
    tournamentId: string,
    transfer: {
      walletAddress?: string | undefined;
      phoneNumber?: string | undefined;
    },
  ): Promise<void> {
    if (!transfer.walletAddress && !transfer.phoneNumber) {
      throw new InvalidArgumentUseCaseError(
        "wallet address or phone number are required",
      );
    }
    if (transfer.walletAddress && transfer.phoneNumber) {
      throw new InvalidArgumentUseCaseError(
        "wallet address or phone number are required",
      );
    }
    const entry = await ctx.prisma.paidTournamentEntry.findUnique({
      where: {
        paidTournamentId_userId: {
          paidTournamentId: tournamentId,
          userId: ctx.userId!,
        },
      },
      include: {
        paidTournament: {
          select: {
            endAt: true,
            prizeTerasOnly: true,
          },
        },
      },
    });
    if (!entry) {
      throw new InvalidArgumentUseCaseError(
        "paidTournament not entry or unknown tournamentId",
      );
    }
    if (entry.prizeClaimed) {
      throw new IllegalStateUseCaseError("claim already accepted");
    }
    if (
      !(await canExchangePrize(
        ctx,
        entry.paidTournament.endAt,
        entry.paidTournament.prizeTerasOnly,
      ))
    ) {
      throw new IllegalStateUseCaseError("claims are out of date");
    }

    await ctx.prisma.paidTournamentEntry.update({
      where: {
        paidTournamentId_userId: {
          paidTournamentId: tournamentId,
          userId: ctx.userId!,
        },
        // 一度設定したら更新NG
        prizeClaimed: false,
      },
      data: {
        prizeClaimed: true,
        walletAddress: transfer.walletAddress,
        phoneNumber: transfer.phoneNumber,
        prizeSendStatus: PrizeSendStatus.UNPROCESSED,
      },
    });
    await this.questChecker.checkAndUpdate(ctx);
  }
  async enter(
    ctx: Context,
    tournamentId: string,
  ): Promise<PaidTournamentEntry> {
    const tournament = await ctx.prisma.paidTournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new InvalidArgumentUseCaseError("unknown tournament id");
    }
    const now = new Date();
    if (now < tournament.startAt || tournament.endAt < now) {
      throw new InvalidArgumentUseCaseError("out of term tournament id");
    }
    const entry = await ctx.prisma.paidTournamentEntry.findUnique({
      where: {
        paidTournamentId_userId: {
          userId: ctx.userId!,
          paidTournamentId: tournamentId,
        },
      },
    });
    if (entry) {
      throw new IllegalStateUseCaseError("already entered");
    }

    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    if (user.tickets < tournament.entryFeeTickets) {
      throw new IllegalStateUseCaseError("ticket insufficient");
    }

    try {
      const queries = [];
      queries.push(
        ctx.prisma.paidTournamentEntry.create({
          data: {
            paidTournamentId: tournamentId,
            userId: ctx.userId!,
            usedTickets: tournament.entryFeeTickets,
            countryFromIp: ctx.country,
          },
        }),
      );
      queries.push(
        ctx.prisma.user.update({
          where: {
            id: ctx.userId!,
          },
          data: {
            tickets: {
              decrement: tournament.entryFeeTickets,
            },
          },
        }),
      );
      queries.push(
        // 参加ボーナスの100Terasをリワード付与
        ctx.prisma.reward.create({
          data: {
            title: `${tournament.title} participation benefits`,
            amount: 100,
            rewardItemType: "TERAS",
            userId: ctx.userId!,
            category: "TERAS",
          },
        }),
      );
      if (tournament.entryFeeTickets > 0) {
        queries.push(
          writeEnterPaidTournamentTransaction(
            ctx,
            user.tickets - tournament.entryFeeTickets,
            tournament.entryFeeTickets,
            tournament.id,
          ),
        );
      }
      const updated = await ctx.prisma.$transaction(queries);
      await this.questChecker.checkAndUpdate(ctx);
      // @ts-ignore
      return updated[0];
    } catch (e: unknown) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === PRISMA_UNIQUE_CONSTRAINT_ERROR_CODE) {
          throw new ConflictUseCaseError("paid tournament entry conflicted");
        } else if (e.message.includes("over_zero")) {
          throw new ConflictUseCaseError("tickets conflicted");
        }
      }
      throw e;
    }
  }

  async calcPrize(
    userId: string,
    totalPrizeTeras: Prisma.Decimal,
    rank: number,
    prizeCalcSetting: PrizeCalcSetting,
  ): Promise<{
    prizeTeras: Prisma.Decimal;
    prizeTicket?: number;
    prizeUsdc?: number;
    prizeIdr?: number;
  }> {
    const ratio = prizeCalcSetting.prizeRatios.find(
      (v) => v.range.min <= rank && rank <= v.range.max,
    );
    if (!ratio) {
      throw new InternalServerResolverError("prize ratio setting error");
    }

    if (
      totalPrizeTeras.mul(ratio.ratio).comparedTo(new Prisma.Decimal(10)) < 0
    ) {
      // 賞金額が10Teras未満は払えない
      return {
        prizeTeras: new Prisma.Decimal(0),
        prizeTicket: undefined,
        prizeUsdc: undefined,
        prizeIdr: undefined,
      };
    }
    const ownPrizeTeras = floorDecimalToIntegerValue(
      totalPrizeTeras.mul(ratio.ratio),
      1,
    );

    // ignoreユーザー判定
    const ignore = await prisma.paidTournamentPrizeClaimIgnoreUser.findUnique({
      where: {
        userId: userId,
      },
    });
    if (ignore) {
      return {
        prizeTeras: ownPrizeTeras,
        prizeTicket: ownPrizeTeras.toNumber() * TICKET_PER_TERAS_RATE,
        prizeUsdc: undefined,
        prizeIdr: undefined,
      };
    }

    // IDR/USDC換算した金額を出す
    const idr = ownPrizeTeras.mul(TERAS_TO_IDR_RATE);
    const usdc = ownPrizeTeras.mul(TERAS_TO_USD_RATE);

    return {
      prizeTeras: ownPrizeTeras,
      prizeTicket: ownPrizeTeras.toNumber() * TICKET_PER_TERAS_RATE,
      prizeUsdc: usdc.toNumber() >= 1 ? usdc.toNumber() : undefined,
      prizeIdr: idr.toNumber() >= 10000 ? idr.toNumber() : undefined,
    };
  }

  /**
   * バッチ処理でトナメの入賞者を記録する
   * @param ctx
   * @param tournamentId
   */
  async recordResult(ctx: Context, tournamentId: string): Promise<void> {
    try {
      const tournament = await ctx.prisma.paidTournament.findUniqueOrThrow({
        where: {
          id: tournamentId,
        },
        include: {
          _count: {
            select: {
              entries: true,
            },
          },
        },
      });

      if (tournament.resultRecorded) {
        // すでに保存済みなので処理しない
        ctx.log.warn(`already save result.[${tournamentId}]`);
        return;
      }

      const rankings = await this.getRanking(ctx, tournament.id);
      const topList = rankings.rankings.topList;
      const prizeSetting = findPrizeCalcSetting(tournament._count.entries);
      const prizeSum = calcPrizeTerasSummary(
        tournament._count.entries,
        tournament.entryFeeTickets,
        prizeSetting,
        tournament.prizeTerasAmount,
      );
      const queries = [];

      // 参加者によって決まる入賞者数と最低保存するランクのどちらか大きい方まで記録する
      const recordLowerRank =
        prizeSetting.minimumRankForPrize >
          PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK
          ? prizeSetting.minimumRankForPrize
          : PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK;
      for (let i = 0; i < recordLowerRank; i++) {
        const ranking = topList[i];
        if (!ranking) {
          // 配列長より記録すべき順位が大きい場合があるのでチェック
          break;
        }
        const rank = ranking.rank;
        const calcPrize =
          prizeSetting.minimumRankForPrize >= rank
            ? await this.calcPrize(ranking.userId, prizeSum, rank, prizeSetting)
            : { prizeTeras: new Prisma.Decimal(0), prizeTicket: 0 };
        queries.push(
          ctx.prisma.paidTournamentResult.create({
            data: {
              userId: ranking.userId,
              rank: ranking.rank,
              score: ranking.score,
              tournamentId: tournament.id,
              prizeTerasAmount: calcPrize.prizeTeras,
              prizeTicketAmount: calcPrize.prizeTicket,
              prizeIdrAmount: calcPrize.prizeIdr,
              prizeUsdcAmount: calcPrize.prizeUsdc,
            },
          }),
        );
      }
      queries.push(
        ctx.prisma.paidTournament.update({
          data: {
            resultRecorded: true,
          },
          where: {
            id: tournamentId,
            resultRecorded: false,
          },
        }),
      );
      await ctx.prisma.$transaction(queries);
    } catch (e: unknown) {
      ctx.log.error(e);
    }
  }

  async getRanking(
    ctx: Context,
    tournamentId: string,
  ): Promise<GetRankingResponse> {
    const t = await ctx.prisma.paidTournament.findUnique({
      where: { id: tournamentId },
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });
    if (!t) {
      throw new InvalidArgumentUseCaseError("unknown tournament id");
    }

    const rankings = await getRanking(
      ctx,
      getTournamentRankingKey(tournamentId),
      false,
    );
    if (t.endAt > new Date()) {
      // 開催期間中は個人の賞金額は計算しないで返す
      return {
        rankings: rankings,
        endAt: t.endAt,
      };
    }

    const entries = t._count.entries;
    const prizeSetting = findPrizeCalcSetting(entries);
    const myRank = rankings.myself?.rank;
    if (!myRank || prizeSetting.minimumRankForPrize < myRank) {
      // 入賞していない場合は賞金額の計算はしないで終わり
      return {
        rankings: rankings,
        endAt: t.endAt,
      };
    }
    // 賞金総額
    const prizeSum = calcPrizeTerasSummary(
      entries,
      t.entryFeeTickets,
      prizeSetting,
      t.prizeTerasAmount,
    );
    const ownPrize = await this.calcPrize(
      ctx.userId!,
      prizeSum,
      myRank,
      prizeSetting,
    );
    return {
      rankings: rankings,
      endAt: t.endAt,
      prizes: {
        teras: ownPrize.prizeTeras,
        ticket: ownPrize.prizeTicket,
        localCurrency: ownPrize.prizeIdr,
        crypt: ownPrize.prizeUsdc,
      },
    };
  }
}

export type GetRankingResponse = {
  rankings: Rankings;
  endAt: Date;
  prizes?: {
    teras: Prisma.Decimal;
    ticket?: number;
    localCurrency?: number;
    crypt?: number;
  };
};

// 賞金分配などはシステム外で行うため、ビジネスロジックに直接影響しない賞金プールの計算・優勝賞金はResolverでやっておく
// システム的に分配する機能が必要になったらUseCase作ること

type Range = {
  min: number;
  max: number;
};

type Prize = {
  title: string;
  ratio: Prisma.Decimal;
  range: Range;
};

export type PrizeCalcSetting = {
  prizePoolRatio: Prisma.Decimal;
  // 1位から賞金対象者の比率
  prizeRatios: Array<Prize>;
  minimumRankForPrize: number;
};

function d(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

const prizeCalcSettingsMap = new Map<Range, PrizeCalcSetting>([
  [
    { min: 0, max: 30 },
    {
      prizePoolRatio: d(0.8),
      // 入賞者 3人
      prizeRatios: [
        {
          title: "1st place",
          ratio: d(0.5),
          range: { min: 1, max: 1 },
        },
        {
          title: "2nd place",
          ratio: d(0.36),
          range: { min: 2, max: 2 },
        },
        {
          title: "3rd place",
          ratio: d(0.14),
          range: { min: 3, max: 3 },
        },
      ],
      minimumRankForPrize: 3,
    },
  ],
  [
    { min: 31, max: 50 },
    {
      prizePoolRatio: d(0.7),
      // 入賞者 6人
      prizeRatios: [
        {
          title: "1st place",
          ratio: d(0.4),
          range: { min: 1, max: 1 },
        },
        {
          title: "2nd place",
          ratio: d(0.3),
          range: { min: 2, max: 2 },
        },
        {
          title: "3rd place",
          ratio: d(0.14),
          range: { min: 3, max: 3 },
        },
        {
          title: "4th place",
          ratio: d(0.08),
          range: { min: 4, max: 4 },
        },
        {
          title: "5th place",
          ratio: d(0.05),
          range: { min: 5, max: 5 },
        },
        {
          title: "6th place",
          ratio: d(0.03),
          range: { min: 6, max: 6 },
        },
      ],
      minimumRankForPrize: 6,
    },
  ],
  [
    { min: 51, max: 200 },
    {
      prizePoolRatio: d(0.6),
      // 入賞者 15人
      prizeRatios: [
        {
          title: "1st place",
          ratio: d(0.4),
          range: { min: 1, max: 1 },
        },
        {
          title: "2nd place",
          ratio: d(0.18),
          range: { min: 2, max: 2 },
        },
        {
          title: "3rd place",
          ratio: d(0.1),
          range: { min: 3, max: 3 },
        },
        {
          title: "4th place",
          ratio: d(0.06),
          range: { min: 4, max: 4 },
        },
        {
          title: "5th to 8th place",
          ratio: d(0.04),
          range: { min: 5, max: 8 },
        },
        {
          title: "9th to 11th place",
          ratio: d(0.02),
          range: { min: 9, max: 11 },
        },
        {
          title: "12th to 15th place",
          ratio: d(0.01),
          range: { min: 12, max: 15 },
        },
      ],
      minimumRankForPrize: 15,
    },
  ],
  [
    { min: 201, max: Number.MAX_SAFE_INTEGER },
    {
      prizePoolRatio: d(0.5),
      // 入賞者 20人
      prizeRatios: [
        {
          title: "1st place",
          ratio: d(0.4),
          range: { min: 1, max: 1 },
        },
        {
          title: "2nd place",
          ratio: d(0.14),
          range: { min: 2, max: 2 },
        },
        {
          title: "3rd place",
          ratio: d(0.08),
          range: { min: 3, max: 3 },
        },
        {
          title: "4th to 5th place",
          ratio: d(0.06),
          range: { min: 4, max: 5 },
        },
        {
          title: "6th to 8th place",
          ratio: d(0.04),
          range: { min: 6, max: 8 },
        },
        {
          title: "9th to 11th place",
          ratio: d(0.02),
          range: { min: 9, max: 11 },
        },
        {
          title: "12th to 13th place",
          ratio: d(0.014),
          range: { min: 12, max: 13 },
        },
        {
          title: "14th to 17th place",
          ratio: d(0.01),
          range: { min: 14, max: 17 },
        },
        {
          title: "18th to 20th place",
          ratio: d(0.004),
          range: { min: 18, max: 20 },
        },
      ],
      minimumRankForPrize: 20,
    },
  ],
]);

export function findPrizeCalcSetting(entries: number): PrizeCalcSetting {
  for (const [range, setting] of prizeCalcSettingsMap) {
    if (range.min <= entries && entries <= range.max) {
      return setting;
    }
  }
  throw new InternalServerResolverError("prize calc setting not found");
}
