import { eraseDatabase } from "../../../test_helper";
import dayjs from "dayjs";
import { createMockContext } from "../../../mock/context";
import { Context } from "../../../../src/context";
import { v4 as uuidv4 } from "uuid";
import { PlayResult } from "@prisma/client";
import {
  connectWallet,
  consecutivePlayDaysInDifferentGame,
  consecutiveSparkCount,
  consecutiveSparkDays,
  playCount,
  sparkCount,
  specificGamePlayCount,
  specificGameSparkCount,
  uniqueGamePlayCount,
  uniqueGameSparkCount,
  uniquePlayDays,
} from "../../../../src/models/internal/quests/utils";
import { TERM_TIME_ZONE } from "../../../../src/constants";

const nowDate = new Date();
// startAtは3日前
const startAt = dayjs(nowDate).add(-3, "day").toDate();
const beforeStartAt = dayjs(startAt).add(-1, "day").toDate();

async function createTestData(
  ctx: Context,
  game: string,
  playCount: number,
  sparkCount: number,
  createdAt: Date = nowDate,
): Promise<void> {
  const am = await ctx.prisma.arcadeMachine.create({
    data: {
      userId: ctx.userId,
      game: game,
      ownerWalletAddress: ctx.walletAddress,
      accumulatorSubCategory: "HOKUTO_100_LX",
    },
  });
  // PlayCount-SparkCountの分だけPlayを持ったPlaySessionを作成
  const playsArray: any = [];
  for (let i = 0; i < playCount - sparkCount; i++) {
    playsArray.push({
      score: 1,
      result: PlayResult.LOSS,
      endedAt: nowDate,
    });
  }
  if (playsArray.length > 0) {
    await ctx.prisma.playSession.create({
      data: {
        playerId: ctx.userId!,
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
        state: "FINISHED",
        authToken: uuidv4(),
        endedAt: new Date(),
        createdAt: createdAt,
        difficulty: 1,
        maxPlayCount: 100,
        plays: {
          createMany: {
            data: playsArray,
          },
        },
      },
    });
  }

  // SparkCountの分だけPlaySession：Playを生成
  for (let i = 0; i < sparkCount; i++) {
    await ctx.prisma.playSession.create({
      data: {
        playerId: ctx.userId!,
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
        state: "FINISHED",
        authToken: uuidv4(),
        endedAt: new Date(),
        createdAt: createdAt,
        difficulty: 1,
        maxPlayCount: 100,
        plays: {
          create: {
            score: 1,
            result: PlayResult.WIN,
            endedAt: nowDate,
          },
        },
      },
    });
  }
}

describe("play count func", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no play records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 8, beforeStartAt);
    const ret = await playCount(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("has play records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 8, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 15, 3, startAt);
    const ret = await playCount(ctx, startAt);
    expect(ret).toEqual(15);
  });
});
describe("spark count func", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no spark records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 0, startAt);
    const ret = await sparkCount(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("has spark records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 10, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 15, 15, startAt);
    const ret = await sparkCount(ctx, startAt);
    expect(ret).toEqual(15);
  });
});

describe("consecutive spark count func", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no spark records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 0, startAt);
    const ret = await consecutiveSparkCount(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 spark only", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 3, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 1, 1, new Date());
    const ret = await consecutiveSparkCount(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("spark > unspark > spark => ret 1", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 1, 1, startAt);
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      1,
      0,
      dayjs(startAt).add(1, "seconds").toDate(),
    );
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      1,
      1,
      dayjs(startAt).add(2, "seconds").toDate(),
    );
    const ret = await consecutiveSparkCount(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("spark > unspark > spark > spark => ret 2", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 1, 1, startAt);
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      1,
      0,
      dayjs(startAt).add(1, "seconds").toDate(),
    );
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      1,
      1,
      dayjs(startAt).add(2, "seconds").toDate(),
    );
    await createTestData(
      ctx,
      "BUBBLE_ATTACK",
      1,
      1,
      dayjs(startAt).add(3, "seconds").toDate(),
    );
    const ret = await consecutiveSparkCount(ctx, startAt);
    expect(ret).toEqual(2);
  });
});

describe("unique game play count", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no play records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    const ret = await uniqueGamePlayCount(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 game title", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 3, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, startAt);
    const ret = await uniqueGamePlayCount(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("2 game title", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 3, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, startAt);
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, startAt);
    const ret = await uniqueGamePlayCount(ctx, startAt);
    expect(ret).toEqual(2);
  });
});

describe("unique game spark count", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no spark records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    const ret = await uniqueGameSparkCount(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 game title", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, startAt);
    const ret = await uniqueGameSparkCount(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("2 game title", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, startAt);
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, startAt);
    const ret = await uniqueGameSparkCount(ctx, startAt);
    expect(ret).toEqual(2);
  });
});

describe("consecutive spark days", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no spark", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 day", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBLE_ATTACK", 3, 1, beforeStartAt);
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      3,
      2,
      dayjs(startAt).add(2, "day").toDate(),
    );
    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("2 days", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      3,
      2,
      dayjs(startAt).add(1, "day").toDate(),
    );
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      3,
      2,
      dayjs(startAt).add(2, "day").toDate(),
    );
    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(2);
  });
  test("2 days(today start)", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      3,
      2,
      dayjs(startAt).add(2, "day").toDate(),
    );
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      3,
      2,
      dayjs(startAt).add(3, "day").toDate(),
    );
    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(2);
  });
  test("2 days(spark > spark > unspark > spark)", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    // spark
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, startAt);
    // unspark
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      3,
      0,
      dayjs(startAt).add(1, "day").toDate(),
    );
    // spark
    await createTestData(
      ctx,
      "BUBBLE_ATTACK",
      3,
      2,
      dayjs(startAt).add(2, "day").toDate(),
    );
    // spark
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      3,
      2,
      dayjs(startAt).add(3, "day").toDate(),
    );

    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(2);
  });
  test("today un spark(un spark > spark > spark)", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    // spark
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      3,
      2,
      dayjs(startAt).add(1, "day").toDate(),
    );
    // spark
    await createTestData(
      ctx,
      "CYBER_PINBALL",
      3,
      2,
      dayjs(startAt).add(2, "day").toDate(),
    );
    // un spark
    await createTestData(
      ctx,
      "BUBBLE_ATTACK",
      3,
      0,
      dayjs(startAt).add(3, "day").toDate(),
    );

    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(2);
  });
  test("today and yesterday un spark(un spark > spark > spark)", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 1, beforeStartAt);
    // spark
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      3,
      2,
      dayjs(startAt).add(-1, "day").toDate(),
    );
    // spark
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, startAt);
    // spark
    await createTestData(
      ctx,
      "BUBBLE_ATTACK",
      3,
      2,
      dayjs(startAt).add(1, "day").toDate(),
    );

    const ret = await consecutiveSparkDays(ctx, startAt);
    expect(ret).toEqual(0);
  });
});

describe("connect wallet", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("not connect wallet address", async () => {
    const ctx = await createMockContext({ walletAddress: null });
    expect(await connectWallet(ctx, startAt)).toEqual(0);
  });
  test("connected wallet address", async () => {
    const ctx = await createMockContext();
    expect(await connectWallet(ctx, startAt)).toEqual(1);
  });
});

describe("consecutive play days in different game", () => {
  const func = consecutivePlayDaysInDifferentGame(2);
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no play", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);
    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 day 1game", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);
    const todayStartAt = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, todayStartAt);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 day 2game", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);
    const todayStartAt = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, todayStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, todayStartAt);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("1 day 3game", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);
    const todayStartAt = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, todayStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, todayStartAt);
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, todayStartAt);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("2 day(day 1 2game,day 2 1game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("2 day(day 1 2game,day 2 2game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);
    await createTestData(ctx, "STAR_GUARDIAN", 3, 2, day2);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(2);
  });
  test("2 day(day 1 1game,day 2 2game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);
    await createTestData(ctx, "STAR_GUARDIAN", 3, 2, day2);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("3 day(day 1 2game, day 2 2game, day 3 2game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);
    await createTestData(ctx, "STAR_GUARDIAN", 3, 2, day2);

    // day3
    const day3 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day3);
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day3);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(3);
  });
  test("3 day(day 1 2game, day 2 2game, day 3 1game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);
    await createTestData(ctx, "STAR_GUARDIAN", 3, 2, day2);

    // day3
    const day3 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day3);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(2);
  });
  test("3 day(day 1 2game, day 2 1game, day 3 2game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);

    // day3
    const day3 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day3);
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day3);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("3 day(day 1 1game, day 2 1game, day 3 2game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);

    // day3
    const day3 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day3);
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day3);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("3 day(day 1 2game, day 2 1game, day 3 1game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);

    // day3
    const day3 = dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day3);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("3 day(day 1 2game, day 2 0game, day 3 0game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("3 day(day 1 2game, day 2 1game, day 3 0game)", async () => {
    const ctx = await createMockContext();
    // before
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, beforeStartAt);

    // day1
    const day1 = dayjs(startAt).tz(TERM_TIME_ZONE).add(1, "d").toDate();
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 2, day1);
    await createTestData(ctx, "YUMMY_JUMP", 3, 2, day1);

    // day2
    const day2 = dayjs(startAt).tz(TERM_TIME_ZONE).add(2, "d").toDate();
    await createTestData(ctx, "CYBER_PINBALL", 3, 2, day2);

    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
});

describe("specificGamePlayCount", () => {
  const func = specificGamePlayCount("BUBBLE_ATTACK");
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no BubbleAttack play", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 8, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 15, 3, startAt);
    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("has play records", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 8, beforeStartAt);
    await createTestData(ctx, "YUMMY_JUMP", 15, 3, startAt);
    await createTestData(ctx, "BUBBLE_ATTACK", 3, 0, startAt);
    const ret = await func(ctx, startAt);
    expect(ret).toEqual(3);
  });
});

describe("specificGameSparkCount", () => {
  const func = specificGameSparkCount("BUBBLE_ATTACK");
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no BubbleAttack spark", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 1, beforeStartAt);
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 0, startAt);
    await createTestData(ctx, "YUMMY_JUMP", 15, 2, startAt);
    const ret = await func(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("has sparks", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 1, beforeStartAt);
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 3, startAt);
    await createTestData(ctx, "YUMMY_JUMP", 15, 2, startAt);
    const ret = await func(ctx, startAt);
    expect(ret).toEqual(3);
  });
});

describe("uniquePlayDays", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no record", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 1, beforeStartAt);
    const ret = await uniquePlayDays(ctx, startAt);
    expect(ret).toEqual(0);
  });
  test("1 day", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 1, beforeStartAt);
    await createTestData(ctx, "SUPER_SNAKE", 10, 3, startAt);
    const ret = await uniquePlayDays(ctx, startAt);
    expect(ret).toEqual(1);
  });
  test("2 day", async () => {
    const ctx = await createMockContext();
    await createTestData(ctx, "BUBBLE_ATTACK", 10, 1, beforeStartAt);
    await createTestData(ctx, "SUPER_SNAKE", 10, 3, startAt);
    await createTestData(
      ctx,
      "YUMMY_JUMP",
      10,
      3,
      // 意図的に間をあける
      dayjs(startAt).tz(TERM_TIME_ZONE).add(3, "d").toDate(),
    );

    const ret = await uniquePlayDays(ctx, startAt);
    expect(ret).toEqual(2);
  });
});
