import { createArcadeMachine, eraseDatabase } from "../test_helper";
import { redisClient } from "../../src/redis";
import { createMockContext } from "../mock/context";
import { RankingType } from "../../src/models/external/ranking";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../../src/constants";
import { RankingUseCaseImpl } from "../../src/use_cases/ranking_usecase";
import {
  getCombinedCountScore,
  getCombinedRateScore,
  getEventRankingKey,
  getRegularRankingKeyAndEndDate,
  getSeparatedCountScore,
  getSeparatedRateScore,
} from "../../src/helpers/ranking";
import { Context } from "../../src/context";
import { PlaySession } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { InvalidArgumentUseCaseError } from "../../src/use_cases/errors";

const testEventRankings: Record<string, RankingType> = {
  EVENT_CRAFT_1: {
    id: "EVENT_CRAFT_1",
    actionType: "CRAFT",
    seq: 1,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-30").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test craft 1",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_CRAFT_2: {
    id: "EVENT_CRAFT_2",
    actionType: "CRAFT",
    seq: 1,
    startAt: dayjs("2023-10-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-10-31").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test craft 2 expired",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_CRAFT_3: {
    id: "EVENT_CRAFT_3",
    actionType: "CRAFT",
    seq: 1,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-15").tz(TERM_TIME_ZONE).endOf("date").toDate(),
    title: "test craft 3 only early",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_SPARK_1: {
    id: "EVENT_SPARK_1",
    actionType: "SPARK",
    seq: 4,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-30").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test spark 1",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_SPARK_2: {
    id: "EVENT_SPARK_2",
    actionType: "SPARK",
    seq: 5,
    startAt: dayjs("2023-10-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-10-31").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test spark 2 expired",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_SPARK_3: {
    id: "EVENT_SPARK_3",
    actionType: "SPARK",
    seq: 6,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-15").tz(TERM_TIME_ZONE).endOf("date").toDate(),
    title: "test spark 3 only early",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_SPARK_4: {
    id: "EVENT_SPARK_4",
    actionType: "SPARK",
    seq: 16,
    startAt: dayjs("2023-12-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-12-15").tz(TERM_TIME_ZONE).endOf("date").toDate(),
    title: "specified game only spark",
    rewards: [],
    lowestRankNumber: 100,
    targetGames: ["BUBBLE_ATTACK", "NEON_PONG"],
  },
  EVENT_MEGA_SPARK_1: {
    id: "EVENT_MEGA_SPARK_1",
    actionType: "MEGA_SPARK",
    seq: 7,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-30").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test mega spark 1",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_MEGA_SPARK_2: {
    id: "EVENT_SPARK_2",
    actionType: "MEGA_SPARK",
    seq: 8,
    startAt: dayjs("2023-10-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-10-31").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test mega spark 2 expired",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_MEGA_SPARK_3: {
    id: "EVENT_MEGA_SPARK_3",
    actionType: "MEGA_SPARK",
    seq: 9,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-15").tz(TERM_TIME_ZONE).endOf("date").toDate(),
    title: "test mega spark 3 only early",
    rewards: [],
    lowestRankNumber: 100,
  },
  EVENT_SPARK_RATE_1: {
    id: "EVENT_SPARK_RATE_1",
    actionType: "SPARK_RATE",
    seq: 10,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-30").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test spark rate 1",
    rewards: [],
    lowestRankNumber: 100,
    minActionCount: 10,
  },
  EVENT_SPARK_RATE_2: {
    id: "EVENT_SPARK_RATE_2",
    actionType: "SPARK_RATE",
    seq: 11,
    startAt: dayjs("2023-10-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-10-31").tz(TERM_TIME_ZONE).endOf("month").toDate(),
    title: "test spark rate 2 expired",
    rewards: [],
    lowestRankNumber: 100,
    minActionCount: 10,
  },
  EVENT_SPARK_RATE_3: {
    id: "EVENT_SPARK_RATE_3",
    actionType: "SPARK_RATE",
    seq: 12,
    startAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-11-15").tz(TERM_TIME_ZONE).endOf("date").toDate(),
    title: "test spark rate 3 only early",
    rewards: [],
    lowestRankNumber: 100,
    minActionCount: 10,
  },
  EVENT_SPARK_RATE_4: {
    id: "EVENT_SPARK_RATE_4",
    actionType: "SPARK_RATE",
    seq: 13,
    startAt: dayjs("2023-12-01").tz(TERM_TIME_ZONE).toDate(),
    endAt: dayjs("2023-12-15").tz(TERM_TIME_ZONE).endOf("date").toDate(),
    title: "specified game only spark rate",
    rewards: [],
    lowestRankNumber: 100,
    targetGames: ["CYBER_PINBALL", "NEON_PONG"],
    minActionCount: 10,
  },
};

const useCase = new RankingUseCaseImpl(testEventRankings);

describe("craft", () => {
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
  test("send success/no record", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine({
      userId: ctx.userId!,
    });
    const craft = await ctx.prisma.craft.create({
      data: {
        userId: ctx.userId!,
        craftedArcadeMachineId: am.id,
        usedTerasBalance: 1,
        createdAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
      },
    });
    await useCase.craft(ctx, craft);
    // 1個目 期間内でレコード登録される
    const key1 = getEventRankingKey(testEventRankings["EVENT_CRAFT_1"]);
    const after1 = await redisClient.zScore(key1, ctx.userId!);
    expect(after1).not.toBeNull();
    const score1 = getSeparatedCountScore(after1!);
    expect(score1).toEqual(1);

    // 2個目 期間外でレコード登録されない
    const key2 = getEventRankingKey(testEventRankings["EVENT_CRAFT_2"]);
    const after2 = await redisClient.zScore(key2, ctx.userId!);
    expect(after2).toBeNull();

    // 3個目 期間内でレコード登録される
    const key3 = getEventRankingKey(testEventRankings["EVENT_CRAFT_3"]);
    const after3 = await redisClient.zScore(key3, ctx.userId!);
    expect(after3).not.toBeNull();
    const score3 = getSeparatedCountScore(after3!);
    expect(score3).toEqual(1);
  });
  test("send success/already record", async () => {
    const ctx = await createMockContext();
    const am1 = await createArcadeMachine({
      userId: ctx.userId!,
    });
    const craft1 = await ctx.prisma.craft.create({
      data: {
        userId: ctx.userId!,
        craftedArcadeMachineId: am1.id,
        usedTerasBalance: 1,
        createdAt: dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate(),
      },
    });
    await useCase.craft(ctx, craft1);
    // 1個目 期間内でレコード登録される
    const key1 = getEventRankingKey(testEventRankings["EVENT_CRAFT_1"]);
    const after1 = await redisClient.zScore(key1, ctx.userId!);
    expect(after1).not.toBeNull();
    const score1 = getSeparatedCountScore(after1!);
    expect(score1).toEqual(1);

    // 2個目 期間外でレコード登録されない
    const key2 = getEventRankingKey(testEventRankings["EVENT_CRAFT_2"]);
    const after2 = await redisClient.zScore(key2, ctx.userId!);
    expect(after2).toBeNull();

    // 3個目 期間内でレコード登録される
    const key3 = getEventRankingKey(testEventRankings["EVENT_CRAFT_3"]);
    const after3 = await redisClient.zScore(key3, ctx.userId!);
    expect(after3).not.toBeNull();
    const score3 = getSeparatedCountScore(after3!);
    expect(score3).toEqual(1);

    const am2 = await createArcadeMachine({
      userId: ctx.userId!,
    });
    const craft2 = await ctx.prisma.craft.create({
      data: {
        userId: ctx.userId!,
        craftedArcadeMachineId: am2.id,
        usedTerasBalance: 1,
        createdAt: dayjs("2023-11-16").tz(TERM_TIME_ZONE).toDate(),
      },
    });
    await useCase.craft(ctx, craft2);

    // 1個目 期間内でレコード更新される
    const after1_2 = await redisClient.zScore(key1, ctx.userId!);
    expect(after1_2).not.toBeNull();
    const score1_2 = getSeparatedCountScore(after1_2!);
    expect(score1_2).toEqual(2);

    // 2個目 期間外でレコード登録されない
    const after2_2 = await redisClient.zScore(key2, ctx.userId!);
    expect(after2_2).toBeNull();

    // 3個目 期間外でレコード更新されない
    const after3_3 = await redisClient.zScore(key3, ctx.userId!);
    expect(after3_3).not.toBeNull();
    const score3_2 = getSeparatedCountScore(after3_3!);
    expect(score3_2).toEqual(1);
  });
  test("no event", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine({
      userId: ctx.userId!,
    });
    const craft = await ctx.prisma.craft.create({
      data: {
        userId: ctx.userId!,
        craftedArcadeMachineId: am.id,
        usedTerasBalance: 1,
        createdAt: dayjs("2023-12-01").tz(TERM_TIME_ZONE).toDate(),
      },
    });
    await useCase.craft(ctx, craft);
    const redisKeys = await redisClient.keys("*");
    expect(redisKeys.length).toEqual(0);
  });
});

describe("finishPlay", () => {
  const now1 = dayjs("2023-11-01").tz(TERM_TIME_ZONE).toDate();
  const now2 = dayjs("2023-11-16").tz(TERM_TIME_ZONE).toDate();
  const nowSpecified = dayjs("2023-12-01").tz(TERM_TIME_ZONE).toDate();
  function createPlaySessionWithPlays(
    ctx: Context,
    arcadeMachineId: string,
    isSpark: boolean,
    isMegaSpark: boolean,
    finishDate: Date,
  ): Promise<PlaySession> {
    return ctx.prisma.playSession.create({
      data: {
        arcadeMachineId: arcadeMachineId,
        arcadeMachineOwnerId: ctx.userId!,
        playerId: ctx.userId!,
        endedAt: finishDate,
        maxPlayCount: 500,
        difficulty: 1,
        state: "FINISHED",
        authToken: uuidv4(),
        targetScore: 1,
        plays: {
          createMany: {
            data: [
              {
                score: 0,
                endedAt: finishDate,
                result: "LOSS",
              },
              {
                score: isSpark ? 1 : 0,
                endedAt: finishDate,
                result: isSpark ? "WIN" : "LOSS",
                megaSpark: isSpark && isMegaSpark,
                playerTerasReward:
                  isSpark && isMegaSpark ? 500 : isSpark ? 20 : null,
              },
            ],
          },
        },
      },
    });
  }
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
  test("no spark only", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine({ userId: ctx.userId });
    const ps = await createPlaySessionWithPlays(ctx, am.id, false, false, now1);
    await useCase.finishPlaySession(ctx, ps.id);
    const keys = await redisClient.keys("*");
    expect(keys).toHaveLength(0);
  });
  describe("スパーク", () => {
    test("no record", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      const ps = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now1,
      );
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // regular + event1 + event3
      expect(keys).toHaveLength(3);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }
    });
    test("already exists", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      const ps = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now1,
      );
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // regular + event1 + event3
      expect(keys).toHaveLength(3);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }

      const ps2 = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now2,
      );
      await useCase.finishPlaySession(ctx, ps2.id);

      expect(await redisClient.keys("*")).toHaveLength(4);

      // 常設は下期になっているので上期と下期それぞれ1である
      const earlyKey = getRegularRankingKeyAndEndDate("SPARK", true, now1);
      const regularEarly = await redisClient.zScore(earlyKey.key, ctx.userId!);
      expect(getSeparatedCountScore(regularEarly!)).toEqual(1);

      const lateKey = getRegularRankingKeyAndEndDate("SPARK", true, now2);
      const regularLate = await redisClient.zScore(lateKey.key, ctx.userId!);
      expect(getSeparatedCountScore(regularLate!)).toEqual(1);

      // 1は増えている
      const event1Key = getEventRankingKey(testEventRankings["EVENT_SPARK_1"]);
      const afterEvent1 = await redisClient.zScore(event1Key, ctx.userId!);
      expect(getSeparatedCountScore(afterEvent1!)).toEqual(2);

      // event3は期間外なので増えていない
      const event3Key = getEventRankingKey(testEventRankings["EVENT_SPARK_3"]);
      const afterEvent3 = await redisClient.zScore(event3Key, ctx.userId!);
      expect(getSeparatedCountScore(afterEvent3!)).toEqual(1);
    });
    test("specified game only", async () => {
      const ctx = await createMockContext();

      // YUMMYはカウントされない
      const amYummy = await createArcadeMachine({
        userId: ctx.userId,
        game: "YUMMY_JUMP",
      });
      const psYummy = await createPlaySessionWithPlays(
        ctx,
        amYummy.id,
        true,
        false,
        nowSpecified,
      );
      await useCase.finishPlaySession(ctx, psYummy.id);
      const keys = await redisClient.keys("event*");
      expect(keys).toHaveLength(0);

      // BUBBLEはカウントされる
      const amBubble = await createArcadeMachine({
        userId: ctx.userId,
        game: "BUBBLE_ATTACK",
      });

      const psBubble = await createPlaySessionWithPlays(
        ctx,
        amBubble.id,
        true,
        false,
        nowSpecified,
      );

      await useCase.finishPlaySession(ctx, psBubble.id);
      const keys2 = await redisClient.keys("event*");
      expect(keys2).toHaveLength(1);
    });
    test("paid tournament", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      // 対象外の参加済みトーナメント
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: "MYTHIC_MATCH",
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: am.game,
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      const ps = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now1,
      );
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // regular + event1 + event3
      expect(keys).toHaveLength(5);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }
    });
    test("paid tournament/game swapper", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      // 対象外の参加済みトーナメント
      const pt = await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: "MYTHIC_MATCH",
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      // BUBBLE_ATTACKを対象にするSwapperを適用する
      await ctx.prisma.activeBoosterForTournament.create({
        data: {
          userId: ctx.userId!,
          category: "GAME_SWAP",
          endAt: now2,
          subCategory: "BUBBLE_ATTACK",
          paidTournamentId: pt.id,
        },
      });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: am.game,
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      const ps = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now1,
      );
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // regular + event1 + event3 + booster1
      expect(keys).toHaveLength(6);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }
    });
    test("paid tournament/game swapper/expired", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      // 対象外の参加済みトーナメント
      const pt = await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: "MYTHIC_MATCH",
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      // BUBBLE_ATTACKを対象にするSwapperがあるが期限切れ
      await ctx.prisma.activeBoosterForTournament.create({
        data: {
          userId: ctx.userId!,
          category: "GAME_SWAP",
          endAt: dayjs(now1).add(-1, "hour").toDate(),
          subCategory: "BUBBLE_ATTACK",
          paidTournamentId: pt.id,
        },
      });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: am.game,
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      const ps = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now1,
      );
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // regular + event1 + event3
      expect(keys).toHaveLength(5);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }
    });
    test("paid tournament/teras", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          paidTournamentType: "SPARK_TERAS",
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      // 対象外の参加済みトーナメント
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: "MYTHIC_MATCH",
          paidTournamentType: "SPARK_TERAS",
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      await ctx.prisma.paidTournament.create({
        data: {
          title: "test",
          startAt: now1,
          endAt: now2,
          entryFeeTickets: 1,
          gameId: am.game,
          paidTournamentType: "SPARK_TERAS",
          entries: {
            create: {
              userId: ctx.userId!,
              usedTickets: 1,
            },
          },
        },
      });
      const ps = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        false,
        now1,
      );
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // regular + event1 + event3
      expect(keys).toHaveLength(5);
      const scoreArr = [];
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        scoreArr.push(getSeparatedCountScore(combinedScore!));
      }
      const sorted = scoreArr.sort();
      expect(sorted).toMatchObject([1, 1, 1, 20, 20]);
    });
  });
  describe("メガスパーク", () => {
    test("no record", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      const ps = await createPlaySessionWithPlays(ctx, am.id, true, true, now1);
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // spark(regular + event1 + event3) + mega(regular + event1 + event3)
      expect(keys).toHaveLength(6);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }
    });
    test("already exists", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      const ps = await createPlaySessionWithPlays(ctx, am.id, true, true, now1);
      await useCase.finishPlaySession(ctx, ps.id);
      const keys = await redisClient.keys("*");
      // spark(regular + event1 + event3) + mega(regular + event1 + event3)
      expect(keys).toHaveLength(6);
      for (const key of keys) {
        const combinedScore = await redisClient.zScore(key, ctx.userId!);
        expect(combinedScore).not.toBeNull();
        expect(getSeparatedCountScore(combinedScore!)).toEqual(1);
      }

      const ps2 = await createPlaySessionWithPlays(
        ctx,
        am.id,
        true,
        true,
        now2,
      );
      await useCase.finishPlaySession(ctx, ps2.id);

      expect(await redisClient.keys("*")).toHaveLength(8);

      // 常設は下期になっているので上期と下期それぞれ1である
      // スパーク分
      {
        const earlyKey = getRegularRankingKeyAndEndDate("SPARK", true, now1);
        const regularEarly = await redisClient.zScore(
          earlyKey.key,
          ctx.userId!,
        );
        expect(getSeparatedCountScore(regularEarly!)).toEqual(1);

        const lateKey = getRegularRankingKeyAndEndDate("SPARK", true, now2);
        const regularLate = await redisClient.zScore(lateKey.key, ctx.userId!);
        expect(getSeparatedCountScore(regularLate!)).toEqual(1);

        // 1は増えている
        const event1Key = getEventRankingKey(
          testEventRankings["EVENT_SPARK_1"],
        );
        const afterEvent1 = await redisClient.zScore(event1Key, ctx.userId!);
        expect(getSeparatedCountScore(afterEvent1!)).toEqual(2);

        // event3は期間外なので増えていない
        const event3Key = getEventRankingKey(
          testEventRankings["EVENT_SPARK_3"],
        );
        const afterEvent3 = await redisClient.zScore(event3Key, ctx.userId!);
        expect(getSeparatedCountScore(afterEvent3!)).toEqual(1);
      }
      // メガスパーク分
      {
        const earlyKey = getRegularRankingKeyAndEndDate(
          "MEGA_SPARK",
          true,
          now1,
        );
        const regularEarly = await redisClient.zScore(
          earlyKey.key,
          ctx.userId!,
        );
        expect(getSeparatedCountScore(regularEarly!)).toEqual(1);

        const lateKey = getRegularRankingKeyAndEndDate(
          "MEGA_SPARK",
          true,
          now2,
        );
        const regularLate = await redisClient.zScore(lateKey.key, ctx.userId!);
        expect(getSeparatedCountScore(regularLate!)).toEqual(1);

        // 1は増えている
        const event1Key = getEventRankingKey(
          testEventRankings["EVENT_MEGA_SPARK_1"],
        );
        const afterEvent1 = await redisClient.zScore(event1Key, ctx.userId!);
        expect(getSeparatedCountScore(afterEvent1!)).toEqual(2);

        // event3は期間外なので増えていない
        const event3Key = getEventRankingKey(
          testEventRankings["EVENT_MEGA_SPARK_3"],
        );
        const afterEvent3 = await redisClient.zScore(event3Key, ctx.userId!);
        expect(getSeparatedCountScore(afterEvent3!)).toEqual(1);
      }
    });
  });
  describe("スパーク率", () => {
    test("lower than minActionCount", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({ userId: ctx.userId });
      let lastPlaySession;
      for (let i = 0; i < 9; i++) {
        lastPlaySession = await createPlaySessionWithPlays(
          ctx,
          am.id,
          false,
          false,
          now1,
        );
      }
      await useCase.finishPlaySession(ctx, lastPlaySession!.id);
      const event1Key = getEventRankingKey(
        testEventRankings["EVENT_SPARK_RATE_1"],
      );
      const event1 = await redisClient.zScore(event1Key, ctx.userId!);
      expect(event1).toBeNull();

      const event3Key = getEventRankingKey(
        testEventRankings["EVENT_SPARK_RATE_3"],
      );
      const event3 = await redisClient.zScore(event3Key, ctx.userId!);
      expect(event3).toBeNull();
    });
    test("no record", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({
        userId: ctx.userId,
        game: "BUBBLE_ATTACK",
      });
      let lastPlaySession;
      for (let i = 0; i < 10; i++) {
        lastPlaySession = await createPlaySessionWithPlays(
          ctx,
          am.id,
          i % 2 === 0,
          false,
          now1,
        );
      }
      await useCase.finishPlaySession(ctx, lastPlaySession!.id);
      const event1Key = getEventRankingKey(
        testEventRankings["EVENT_SPARK_RATE_1"],
      );
      const event1 = await redisClient.zScore(event1Key, ctx.userId!);
      expect(getSeparatedRateScore(event1!)).toEqual(50.0);

      const event3Key = getEventRankingKey(
        testEventRankings["EVENT_SPARK_RATE_3"],
      );
      const event3 = await redisClient.zScore(event3Key, ctx.userId!);
      expect(getSeparatedRateScore(event3!)).toEqual(50.0);
    });
    test("already exists", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine({
        userId: ctx.userId,
        game: "BUBBLE_ATTACK",
      });
      let lastPlaySession;
      for (let i = 0; i < 10; i++) {
        lastPlaySession = await createPlaySessionWithPlays(
          ctx,
          am.id,
          i % 2 === 0,
          false,
          now1,
        );
      }
      await useCase.finishPlaySession(ctx, lastPlaySession!.id);

      {
        const event1Key = getEventRankingKey(
          testEventRankings["EVENT_SPARK_RATE_1"],
        );
        const event1 = await redisClient.zScore(event1Key, ctx.userId!);
        expect(getSeparatedRateScore(event1!)).toEqual(50.0);

        const event3Key = getEventRankingKey(
          testEventRankings["EVENT_SPARK_RATE_3"],
        );
        const event3 = await redisClient.zScore(event3Key, ctx.userId!);
        expect(getSeparatedRateScore(event3!)).toEqual(50.0);
      }

      for (let i = 0; i < 12; i++) {
        lastPlaySession = await createPlaySessionWithPlays(
          ctx,
          am.id,
          i % 4 === 0,
          false,
          now2,
        );
      }
      await useCase.finishPlaySession(ctx, lastPlaySession!.id);

      {
        // event1は期間内なので計算される
        // 22プレイ 8スパーク =
        const event1Key = getEventRankingKey(
          testEventRankings["EVENT_SPARK_RATE_1"],
        );
        const event1 = await redisClient.zScore(event1Key, ctx.userId!);
        expect(getSeparatedRateScore(event1!)).toEqual(36.36);

        // event3は期間外で更新されていない
        const event3Key = getEventRankingKey(
          testEventRankings["EVENT_SPARK_RATE_3"],
        );
        const event3 = await redisClient.zScore(event3Key, ctx.userId!);
        expect(getSeparatedRateScore(event3!)).toEqual(50.0);
      }
    });
    test("specified game", async () => {
      const ctx = await createMockContext();
      const amBubble = await createArcadeMachine({
        userId: ctx.userId,
        game: "BUBBLE_ATTACK",
      });
      let lastPlaySessionBubble;
      for (let i = 0; i < 100; i++) {
        lastPlaySessionBubble = await createPlaySessionWithPlays(
          ctx,
          amBubble.id,
          i % 2 === 0,
          false,
          nowSpecified,
        );
      }
      await useCase.finishPlaySession(ctx, lastPlaySessionBubble!.id);
      const event4Key = getEventRankingKey(
        testEventRankings["EVENT_SPARK_RATE_4"],
      );
      // Bubbleは対象外なのでレコードが存在しない
      const event4 = await redisClient.zScore(event4Key, ctx.userId!);
      expect(event4).toBeNull();

      const amNeon = await createArcadeMachine({
        userId: ctx.userId,
        game: "NEON_PONG",
      });
      let lastPlaySessionNeon;
      for (let i = 0; i < 100; i++) {
        lastPlaySessionNeon = await createPlaySessionWithPlays(
          ctx,
          amNeon.id,
          i % 10 === 0,
          false,
          nowSpecified,
        );
      }
      await useCase.finishPlaySession(ctx, lastPlaySessionNeon!.id);
      // Neonのみで計算された結果が存在する
      const event4After = await redisClient.zScore(event4Key, ctx.userId!);
      expect(event4After).not.toBeNull();
      // 10/100
      expect(getSeparatedRateScore(event4After!)).toEqual(10);
    });
  });
});

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

  test("no redis records", async () => {
    const ctx = await createMockContext();
    const res = await useCase.getRanking(ctx, "SPARK_CURRENT", now1);
    expect(res.topList).toHaveLength(0);
    expect(res.myself).toBeNull();
  });
  test("自分のみ", async () => {
    const ctx = await createMockContext();
    const key = getRegularRankingKeyAndEndDate("SPARK", true, now1);
    await createRecord(
      ctx,
      key.key,
      getCombinedCountScore(1, now1, key.endDate),
    );

    const res = await useCase.getRanking(ctx, "SPARK_CURRENT", now1);
    expect(res.topList).toHaveLength(1);
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    expect(res.myself).toMatchObject({
      userId: ctx.userId!,
      rank: 1,
      score: 1,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
  });
  test("自分が100位以下 かつ 120位以上", async () => {
    // topList作成中に作られたオブジェクトが返されるパターン
    const ctx = await createMockContext();
    const key = getRegularRankingKeyAndEndDate("MEGA_SPARK", true, now1);

    for (let i = 0; i < 110; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key.key,
        getCombinedCountScore(i + 10, now1, key.endDate),
      );
    }
    await createRecord(
      ctx,
      key.key,
      getCombinedCountScore(1, now1, key.endDate),
    );
    const res = await useCase.getRanking(ctx, "MEGA_SPARK_CURRENT", now1);
    expect(res.topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of res.topList) {
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
    expect(res.myself).toMatchObject({
      userId: ctx.userId!,
      rank: 111,
      score: 1,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
  });
  test("自分が100位以下 かつ 120位以下", async () => {
    // topListの抽出に含まれていないパターン
    const ctx = await createMockContext();
    const key = getRegularRankingKeyAndEndDate("MEGA_SPARK", true, now1);

    for (let i = 0; i < 200; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key.key,
        getCombinedCountScore(i + 10, now1, key.endDate),
      );
    }
    await createRecord(
      ctx,
      key.key,
      getCombinedCountScore(1, now1, key.endDate),
    );
    const res = await useCase.getRanking(ctx, "MEGA_SPARK_CURRENT", now1);
    expect(res.topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of res.topList) {
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
    expect(res.myself).toMatchObject({
      userId: ctx.userId!,
      rank: 201,
      score: 1,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
  });
  test("自分が未挑戦", async () => {
    const ctx = await createMockContext();
    const key = getRegularRankingKeyAndEndDate("SPARK", false, now1);

    for (let i = 0; i < 200; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key.key,
        getCombinedCountScore(i + 10, now2, key.endDate),
      );
    }
    const res = await useCase.getRanking(ctx, "SPARK_PREVIOUS", now1);
    expect(res.topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of res.topList) {
      expect(rankingItem.rank).toEqual(rank);
      expect(rankingItem.userId).not.toEqual(ctx.userId!);
      rank++;
    }
    expect(res.myself).toBeNull();
  });
  test("存在しないイベント", async () => {
    const ctx = await createMockContext();
    await expect(useCase.getRanking(ctx, "EVENT_error", now1)).rejects.toThrow(
      InvalidArgumentUseCaseError,
    );
  });
  test("スパーク率ランキング", async () => {
    const ctx = await createMockContext();
    const ranking = testEventRankings["EVENT_SPARK_RATE_1"];
    const key = getEventRankingKey(ranking);

    for (let i = 0; i < 200; i++) {
      const otherCtx = await createMockContext();
      await createRecord(
        otherCtx,
        key,
        getCombinedRateScore(i / (i + 1), i + 10, now1, ranking.endAt),
      );
    }
    await createRecord(
      ctx,
      key,
      getCombinedRateScore(0.01, 1, now1, ranking.endAt),
    );
    const res = await useCase.getRanking(ctx, "EVENT_SPARK_RATE_1", now1);
    expect(res.topList).toHaveLength(99);
    let rank = 1;
    for (const rankingItem of res.topList) {
      expect(rankingItem.rank).toEqual(rank);
      expect(rankingItem.userId).not.toEqual(ctx.userId!);
      rank++;
    }
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    expect(res.myself).toMatchObject({
      userId: ctx.userId!,
      rank: 200,
      score: 0.01,
      name: user.name,
      iconType: user.iconType,
      iconSubCategory: user.iconSubCategory,
      titleSubCategory: user.titleSubCategory,
      frameSubCategory: user.frameSubCategory,
    });
  });
});
