import dayjs from "dayjs";
import {
  PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK,
  TERM_TIME_ZONE,
} from "../../src/constants";
import { redisClient } from "../../src/redis";
import { eraseDatabase } from "../test_helper";
import { Context, ContextImpl } from "../../src/context";
import { createMockContext } from "../mock/context";
import {
  getCombinedCountScore,
  getTournamentRankingKey,
} from "../../src/helpers/ranking";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../src/use_cases/errors";
import {
  findPrizeCalcSetting,
  PaidTournamentUseCaseImpl,
} from "../../src/use_cases/paid_tournament_usecase";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";
import prisma from "../../src/prisma";
import { QuestProgressChecker } from "../../src/helpers/quests";
import {
  tournamentParticipationCount,
  tournamentPlacementsCount,
  tournamentWinsCount,
} from "../../src/models/internal/quests/utils";

const useCase = new PaidTournamentUseCaseImpl(new QuestProgressChecker());

describe("getRanking", () => {
  const now1 = dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate();
  const now2 = dayjs("2023-10-28").tz(TERM_TIME_ZONE).toDate();

  beforeAll(async () => {
    await redisClient.connect();
  });
  afterAll(async () => {
    await redisClient.disconnect();
  });
  beforeEach(async () => {
    await eraseDatabase();
    await redisClient.flushAll();
  });

  async function createRecord(
    ctx: Context,
    key: string,
    score: number,
  ): Promise<void> {
    await redisClient.zAdd(key, { score: score, value: ctx.userId! });
  }
  async function createPaidTournament(
    ctx: Context,
    entries: number,
  ): Promise<{ id: string; key: string; endAt: Date }> {
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: new Date(),
        endAt: new Date(),
        entryFeeTickets: 10,
      },
    });
    for (let i = 0; i < entries; i++) {
      const u = await createMockContext();
      await ctx.prisma.paidTournamentEntry.create({
        data: {
          userId: u.userId!,
          usedTickets: 10,
          paidTournamentId: pt.id,
        },
      });
    }
    const key = getTournamentRankingKey(pt.id);
    return { id: pt.id, key: key, endAt: pt.endAt };
  }

  test("no redis records", async () => {
    const ctx = await createMockContext();
    const key = await createPaidTournament(ctx, 0);
    const res = await useCase.getRanking(ctx, key.id);
    const { topList, myself } = res.rankings;
    expect(topList).toHaveLength(0);
    expect(myself).toBeNull();
  });
  test("自分のみ", async () => {
    const ctx = await createMockContext();
    const key = await createPaidTournament(ctx, 1);
    await createRecord(ctx, key.key, getCombinedCountScore(1, now1, key.endAt));
    const res = await useCase.getRanking(ctx, key.id);
    const { topList, myself } = res.rankings;
    expect(topList).toHaveLength(1);
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    expect(myself).toMatchObject({
      userId: ctx.userId!,
      rank: 1,
      score: 1,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
    expect(res.prizes).toMatchObject({
      teras: new Prisma.Decimal(400),
      localCurrency: undefined,
      crypt: undefined,
    });
  });
  test("自分が100位以下 かつ 120位以上", async () => {
    // topList作成中に作られたオブジェクトが返されるパターン
    const ctx = await createMockContext();
    const key = await createPaidTournament(ctx, 200);

    for (let i = 0; i < 110; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key.key,
        getCombinedCountScore(i + 10, now1, key.endAt),
      );
    }
    await createRecord(ctx, key.key, getCombinedCountScore(1, now1, key.endAt));
    const res = await useCase.getRanking(ctx, key.id);
    const { topList, myself } = res.rankings;
    expect(topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of topList) {
      expect(rankingItem.rank).toEqual(rank);
      expect(rankingItem.userId).not.toEqual(ctx.userId!);
      expect(rankingItem.score).toEqual(110 - rank + 10);
      rank++;
    }
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    expect(myself).toMatchObject({
      userId: ctx.userId!,
      rank: 111,
      score: 1,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
    expect(res.prizes).toBeUndefined();
  });
  test("自分が100位以下 かつ 120位以下", async () => {
    // topListの抽出に含まれていないパターン
    const ctx = await createMockContext();
    const key = await createPaidTournament(ctx, 200);

    for (let i = 0; i < 200; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key.key,
        getCombinedCountScore(i + 10, now1, key.endAt),
      );
    }
    await createRecord(ctx, key.key, getCombinedCountScore(1, now1, key.endAt));
    const res = await useCase.getRanking(ctx, key.id);
    const { topList, myself } = res.rankings;
    expect(topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of topList) {
      expect(rankingItem.rank).toEqual(rank);
      expect(rankingItem.userId).not.toEqual(ctx.userId!);
      expect(rankingItem.score).toEqual(200 - rank + 10);
      rank++;
    }
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    expect(myself).toMatchObject({
      userId: ctx.userId!,
      rank: 201,
      score: 1,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
    expect(res.prizes).toBeUndefined();
  });
  test("自分が未挑戦", async () => {
    const ctx = await createMockContext();
    const key = await createPaidTournament(ctx, 200);

    for (let i = 0; i < 200; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key.key,
        getCombinedCountScore(i + 10, now2, key.endAt),
      );
    }
    const res = await useCase.getRanking(ctx, key.id);
    const { topList, myself } = res.rankings;
    expect(topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of topList) {
      expect(rankingItem.rank).toEqual(rank);
      expect(rankingItem.userId).not.toEqual(ctx.userId!);
      rank++;
    }
    expect(myself).toBeNull();
    expect(res.prizes).toBeUndefined();
  });
  test("存在しないranking", async () => {
    const ctx = await createMockContext();
    await expect(useCase.getRanking(ctx, uuidv4())).rejects.toThrow(
      InvalidArgumentUseCaseError,
    );
  });
});
describe("entry", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext({
      tickets: 10,
    });
    const now = dayjs();
    const tournament = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.toDate(),
        endAt: now.add(1, "day").toDate(),
        entryFeeTickets: 10,
      },
    });
    const ret = await useCase.enter(ctx, tournament.id);
    expect(ret.paidTournamentId).toEqual(tournament.id);
    expect(ret.userId).toEqual(ctx.userId);
    const afterUser = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    });
    expect(afterUser!.tickets).toEqual(0);
    const reward = await ctx.prisma.reward.findMany({});
    expect(reward).toHaveLength(1);
    expect(reward[0]).toMatchObject({
      title: `${tournament.title} participation benefits`,
      amount: 100,
      rewardItemType: "TERAS",
      category: "TERAS",
      userId: ctx.userId,
    });
    const transactions = await ctx.prisma.ticketTransaction.findMany({});
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      userId: ctx.userId,
      transactionType: "ENTER_TOURNAMENT",
      changeAmount: -10,
      balance: 0,
      transactionDetail: JSON.stringify({
        tournamentId: tournament.id,
      }),
    });
  });
  test("unknown tournament id", async () => {
    const ctx = await createMockContext();
    await expect(useCase.enter(ctx, uuidv4())).rejects.toThrow(
      InvalidArgumentUseCaseError,
    );
  });
  test("already entry", async () => {
    const ctx = await createMockContext({
      tickets: 10,
    });
    const now = dayjs();
    const tournament = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.toDate(),
        endAt: now.add(1, "day").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await expect(useCase.enter(ctx, tournament.id)).rejects.toThrow(
      IllegalStateUseCaseError,
    );
  });
  test("expired tournament id", async () => {
    const ctx = await createMockContext({
      tickets: 10,
    });
    const now = dayjs();
    const tournament = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "day").toDate(),
        entryFeeTickets: 10,
      },
    });
    await expect(useCase.enter(ctx, tournament.id)).rejects.toThrow(
      InvalidArgumentUseCaseError,
    );
  });
  test("ticket insufficient", async () => {
    const ctx = await createMockContext({
      tickets: 9,
    });
    const now = dayjs();
    const tournament = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.toDate(),
        endAt: now.add(1, "day").toDate(),
        entryFeeTickets: 10,
      },
    });
    await expect(useCase.enter(ctx, tournament.id)).rejects.toThrow(
      IllegalStateUseCaseError,
    );
  });
});
describe("claim prize", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/walletAddress", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await useCase.claimPrize(ctx, pt.id, {
      walletAddress: "wallet_address",
    });
    const after = await ctx.prisma.paidTournamentEntry.findUniqueOrThrow({
      where: {
        paidTournamentId_userId: {
          paidTournamentId: pt.id,
          userId: ctx.userId!,
        },
      },
    });
    expect(after.prizeClaimed).toBeTruthy();
    expect(after.walletAddress).toEqual("wallet_address");
    expect(after.phoneNumber).toBeNull();
  });
  test("success/phoneNumber", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await useCase.claimPrize(ctx, pt.id, {
      phoneNumber: "000-0000-0000",
    });
    const after = await ctx.prisma.paidTournamentEntry.findUniqueOrThrow({
      where: {
        paidTournamentId_userId: {
          paidTournamentId: pt.id,
          userId: ctx.userId!,
        },
      },
    });
    expect(after.prizeClaimed).toBeTruthy();
    expect(after.walletAddress).toBeNull();
    expect(after.phoneNumber).toEqual("000-0000-0000");
  });
  test("walletAddress and phoneNumber 両方ある場合はエラーになる", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await expect(
      useCase.claimPrize(ctx, pt.id, {
        phoneNumber: "000-0000-0000",
        walletAddress: "wallet_address",
      }),
    ).rejects.toThrow(InvalidArgumentUseCaseError);
  });
  test("walletAddress and phoneNumber 両方ない場合はエラーになる", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await expect(useCase.claimPrize(ctx, pt.id, {})).rejects.toThrow(
      InvalidArgumentUseCaseError,
    );
  });
  test("期間外", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "day").add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await expect(
      useCase.claimPrize(ctx, pt.id, {
        walletAddress: "wallet_address",
      }),
    ).rejects.toThrow(IllegalStateUseCaseError);
  });
  test("2度受付できない", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
            prizeClaimed: true,
            walletAddress: "wallet_address",
          },
        },
      },
    });
    await expect(
      useCase.claimPrize(ctx, pt.id, {
        walletAddress: "wallet_address",
      }),
    ).rejects.toThrow(IllegalStateUseCaseError);
  });
  test("エントリーしていない", async () => {
    const ctx = await createMockContext();
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
      },
    });
    await expect(
      useCase.claimPrize(ctx, pt.id, {
        walletAddress: "wallet_address",
      }),
    ).rejects.toThrow(InvalidArgumentUseCaseError);
  });
  test("存在しないトーナメント", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.claimPrize(ctx, uuidv4(), {
        walletAddress: "wallet_address",
      }),
    ).rejects.toThrow(InvalidArgumentUseCaseError);
  });
  test("ignoreユーザーからの申請", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.paidTournamentPrizeClaimIgnoreUser.create({
      data: {
        userId: ctx.userId!,
      },
    });
    const now = dayjs();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await expect(
      useCase.claimPrize(ctx, pt.id, {
        walletAddress: "wallet_address",
      }),
    ).rejects.toThrow(IllegalStateUseCaseError);
  });
});

describe("record result", () => {
  beforeAll(async () => {
    await redisClient.connect();
  });
  afterAll(async () => {
    await redisClient.disconnect();
  });
  beforeEach(async () => {
    await eraseDatabase();
    await redisClient.flushAll();
  });
  async function createTestData(
    ctx: Context,
    entries: number,
  ): Promise<string> {
    const now = dayjs();
    const playDate = now.add(-1, "day").add(1, "hour").toDate();
    const pt = await ctx.prisma.paidTournament.create({
      data: {
        title: "ut",
        startAt: now.add(-2, "day").toDate(),
        endAt: now.add(-1, "hour").toDate(),
        entryFeeTickets: 10,
      },
    });
    const key = getTournamentRankingKey(pt.id);
    for (let i = 0; i < entries; i++) {
      const dummyCtx = await createMockContext();
      await ctx.prisma.paidTournamentEntry.create({
        data: {
          userId: dummyCtx.userId!,
          usedTickets: 10,
          paidTournamentId: pt.id,
        },
      });
      await redisClient.zAdd(key, {
        value: dummyCtx.userId!,
        score: getCombinedCountScore(i + 1, playDate, pt.endAt),
      });
    }

    return pt.id;
  }
  test("success/no entries", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 0);
    await useCase.recordResult(ctx, ptid);
  });
  test("success/2 entries/2prize records", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 2);
    await useCase.recordResult(ctx, ptid);
    const results = await ctx.prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: ptid,
      },
    });
    expect(results).toHaveLength(2);
  });
  test("success/5 entries", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 5);
    await useCase.recordResult(ctx, ptid);
    const results = await ctx.prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: ptid,
      },
    });
    expect(results).toHaveLength(5);
  });
  test("success/30 entries", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 30);
    await useCase.recordResult(ctx, ptid);
    const results = await ctx.prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: ptid,
      },
    });
    expect(results).toHaveLength(PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK);
    const filtered = results.filter((v) => v.prizeTerasAmount.gt(0));
    expect(filtered).toHaveLength(3);
  });
  test("success/50 entries", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 50);
    await useCase.recordResult(ctx, ptid);
    const results = await ctx.prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: ptid,
      },
    });
    expect(results).toHaveLength(PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK);
    const filtered = results.filter((v) => v.prizeTerasAmount.gt(0));
    expect(filtered).toHaveLength(6);
  });
  test("success/200 entries", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 200);
    await useCase.recordResult(ctx, ptid);
    const results = await ctx.prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: ptid,
      },
    });
    expect(results).toHaveLength(PAID_TOURNAMENT_RESULT_RECORD_MINIMUM_RANK);
    const filtered = results.filter((v) => v.prizeTerasAmount.gt(0));
    expect(filtered).toHaveLength(15);
  });
  test("success/201 entries", async () => {
    const ctx = new ContextImpl(prisma, {});
    const ptid = await createTestData(ctx, 201);
    await useCase.recordResult(ctx, ptid);
    const results = await ctx.prisma.paidTournamentResult.findMany({
      where: {
        tournamentId: ptid,
      },
    });
    expect(results).toHaveLength(20);
    const filtered = results.filter((v) => v.prizeTerasAmount.gt(0));
    expect(filtered).toHaveLength(20);
  });
});

describe("calc prize", () => {
  let ctx: Context;
  beforeAll(async () => {
    ctx = await createMockContext();
  });
  test("total prize teras is zero", async () => {
    const totalPrizeTeras = new Prisma.Decimal(0);
    const prizeCalcSetting = findPrizeCalcSetting(1);
    const ret = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      1,
      prizeCalcSetting,
    );
    expect(ret).toMatchObject({
      prizeTeras: new Prisma.Decimal(0),
      prizeIdr: undefined,
      prizeUsdc: undefined,
    });
  });
  test("1 entries", async () => {
    const entries = 1;
    const prizeCalcSetting = findPrizeCalcSetting(entries);
    const totalPrizeTeras = new Prisma.Decimal(
      prizeCalcSetting.prizePoolRatio.mul(entries * 1000),
    );
    const ret = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      1,
      prizeCalcSetting,
    );
    expect(ret).toMatchObject({
      prizeTeras: new Prisma.Decimal(400),
      prizeIdr: undefined,
      prizeUsdc: undefined,
    });
  });
  test("2 entries", async () => {
    const entries = 2;
    const prizeCalcSetting = findPrizeCalcSetting(entries);
    const totalPrizeTeras = new Prisma.Decimal(
      prizeCalcSetting.prizePoolRatio.mul(entries * 1000),
    );
    const ret1 = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      1,
      prizeCalcSetting,
    );
    expect(ret1).toMatchObject({
      prizeTeras: new Prisma.Decimal(800),
      prizeIdr: 12800,
      prizeUsdc: undefined,
    });
    const ret2 = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      2,
      prizeCalcSetting,
    );
    expect(ret2).toMatchObject({
      prizeTeras: new Prisma.Decimal(570),
      prizeIdr: undefined,
      prizeUsdc: undefined,
    });
  });
  test("20 entries", async () => {
    const entries = 20;
    const prizeCalcSetting = findPrizeCalcSetting(entries);
    const totalPrizeTeras = new Prisma.Decimal(
      prizeCalcSetting.prizePoolRatio.mul(entries * 1000),
    );

    const ret1 = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      1,
      prizeCalcSetting,
    );
    expect(ret1).toMatchObject({
      prizeTeras: new Prisma.Decimal(8000),
      prizeIdr: 128000,
      prizeUsdc: 8,
    });
    const ret2 = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      2,
      prizeCalcSetting,
    );
    expect(ret2).toMatchObject({
      prizeTeras: new Prisma.Decimal(5760),
      prizeIdr: 92160,
      prizeUsdc: 5.76,
    });
    const ret3 = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      3,
      prizeCalcSetting,
    );
    expect(ret3).toMatchObject({
      prizeTeras: new Prisma.Decimal(2240),
      prizeIdr: 35840,
      prizeUsdc: 2.24,
    });
  });
  test("ignore user", async () => {
    await ctx.prisma.paidTournamentPrizeClaimIgnoreUser.create({
      data: {
        userId: ctx.userId!,
      },
    });
    const entries = 20;
    const prizeCalcSetting = findPrizeCalcSetting(entries);
    const totalPrizeTeras = new Prisma.Decimal(
      prizeCalcSetting.prizePoolRatio.mul(entries * 1000),
    );

    const ret1 = await useCase.calcPrize(
      ctx.userId!,
      totalPrizeTeras,
      1,
      prizeCalcSetting,
    );
    expect(ret1).toMatchObject({
      prizeTeras: new Prisma.Decimal(8000),
      prizeIdr: undefined,
      prizeUsdc: undefined,
    });
  });
});

describe("Paid Tournament Use Case", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });

  test("should return the correct number of tournament placements for some placements", async () => {
    const ctx = await createMockContext({ tickets: 50 });

    const now = dayjs();
    const startAt = now.add(-2, "day").toDate();
    const endAt = now.add(-1, "hour").toDate();

    const tournament1 = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: startAt,
        endAt: endAt,
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });

    const tournament2 = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: startAt,
        endAt: endAt,
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });

    await useCase.claimPrize(ctx, tournament1.id, {
      walletAddress: ctx.walletAddress,
    });
    await useCase.claimPrize(ctx, tournament2.id, {
      walletAddress: ctx.walletAddress,
    });

    const winCount = await tournamentPlacementsCount(ctx, startAt);
    expect(winCount).toBe(2);
  });

  test("should return the correct number of tournament wins for one win", async () => {
    const ctx = await createMockContext({ tickets: 50 });

    const now = dayjs();
    const startAt = now.add(-2, "day").toDate();
    const endAt = now.add(-1, "hour").toDate();

    const tournament = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: startAt,
        endAt: endAt,
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await ctx.prisma.paidTournamentResult.create({
      data: {
        userId: ctx.userId!,
        createdAt: endAt,
        tournamentId: tournament.id,
        rank: 1,
        score: 1000,
        prizeTerasAmount: 10,
      },
    });

    const winCount = await tournamentWinsCount(ctx, startAt);
    expect(winCount).toBe(1);
  });

  test("should return the correct number of tournament participations with some participation", async () => {
    const ctx = await createMockContext({ tickets: 50 });

    const now = dayjs();
    const startAt = now.toDate();
    const endAt = now.add(1, "day").toDate();

    const tournament1 = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: startAt,
        endAt: endAt,
        entryFeeTickets: 10,
      },
    });

    const tournament2 = await ctx.prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: startAt,
        endAt: endAt,
        entryFeeTickets: 10,
      },
    });

    await useCase.enter(ctx, tournament1.id);
    await useCase.enter(ctx, tournament2.id);

    const participationCount = await tournamentParticipationCount(ctx, startAt);
    expect(participationCount).toBe(2);
  });
});
