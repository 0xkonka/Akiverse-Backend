import { createMockContext } from "../mock/context";
import {
  distributionRewardSparkCount,
  distributionRewardPlayCount,
  distributionReward,
  CAMPAIGN_START_DATE,
  distributionRewardCraftCount,
  CAMPAIGN_END_DATE,
} from "../../src/helpers/campaign";
import { eraseDatabase } from "../test_helper";
import {
  ArcadeMachine,
  ArcadePart,
  ArcadePartCategory,
  GameCenter,
  GameCenterArea,
  GameCenterSize,
  Junk,
  PlayResult,
  PlaySession,
  PlaySessionState,
  User,
  Prisma,
} from "@prisma/client";
import { Context } from "../../src/context";
import { v4 as uuid } from "uuid";

async function createArcadeMachine(
  ctx: Context,
  extraData = {},
): Promise<ArcadeMachine> {
  return await ctx.prisma.arcadeMachine.create({
    data: {
      game: "test",
      userId: ctx.userId!,
      ownerWalletAddress: ctx.walletAddress,
      accumulatorSubCategory: "HOKUTO_100_LX",
      ...extraData,
    },
  });
}

async function createGameCenter(
  ctx: Context,
  extraData = {},
): Promise<GameCenter> {
  return await ctx.prisma.gameCenter.create({
    data: {
      id: uuid(),
      name: uuid(),
      size: GameCenterSize.SMALL,
      xCoordinate: 1,
      yCoordinate: 1,
      area: GameCenterArea.AKIHABARA,
      userId: ctx.userId!,
      placementAllowed: true,
      ...extraData,
    },
  });
}

async function createPlaySession(
  ctx: Context,
  extraData = {},
): Promise<PlaySession> {
  return await ctx.prisma.playSession.create({
    data: {
      state: PlaySessionState.READY,
      authToken: uuid(),
      difficulty: 1,
      maxPlayCount: 10,
      targetScore: 10,
      playerId: "test",
      gameCenterId: "arcadeMachine.gameCenterId",
      gameCenterOwnerId: "arcadeMachine.userId",
      arcadeMachineId: "arcadeMachine.id",
      arcadeMachineOwnerId: "test",
      ...extraData,
    },
  });
}

async function createPlay(
  ctx: Context,
  playSessionId: string,
  result: PlayResult[],
): Promise<void> {
  const createdAt = new Date(CAMPAIGN_START_DATE);
  await ctx.prisma.play.createMany({
    data: result.map((r) => ({
      playSessionId,
      score: 1,
      endedAt: new Date(),
      result: r,
      createdAt,
    })),
  });
}

async function createOldPlay(
  ctx: Context,
  playSessionId: string,
  result: PlayResult[],
): Promise<void> {
  const createdAt = new Date(CAMPAIGN_START_DATE);
  createdAt.setDate(createdAt.getDate() - 1);
  await ctx.prisma.play.createMany({
    data: result.map((r) => ({
      playSessionId,
      score: 1,
      endedAt: new Date(),
      result: r,
      createdAt,
    })),
  });
}

async function createEndedPlay(
  ctx: Context,
  playSessionId: string,
  result: PlayResult[],
) {
  const createdAt = new Date(CAMPAIGN_END_DATE);
  createdAt.setDate(createdAt.getDate() + 1);
  await ctx.prisma.play.createMany({
    data: result.map((r) => ({
      playSessionId,
      score: 1,
      endedAt: new Date(),
      result: r,
      createdAt,
    })),
  });
}

async function createData() {
  const ctx = await createMockContext();
  const gcoCtx = await createMockContext();
  const arcadeMachine = await createArcadeMachine(ctx);
  const gameCenter = await createGameCenter(gcoCtx);
  const playSession = await createPlaySession(ctx, {
    playerId: ctx.userId!,
    gameCenterId: gameCenter!.id,
    gameCenterOwnerId: gameCenter!.userId,
    arcadeMachineId: arcadeMachine!.id,
    arcadeMachineOwnerId: arcadeMachine!.userId,
  });
  const playSession2 = await createPlaySession(ctx, {
    playerId: ctx.userId!,
    gameCenterId: gameCenter!.id,
    gameCenterOwnerId: gameCenter!.userId,
    arcadeMachineId: arcadeMachine!.id,
    arcadeMachineOwnerId: arcadeMachine!.userId,
    state: PlaySessionState.FINISHED,
  });

  return { ctx, playSession, playSession2 };
}

async function expectDistributionResult(
  ctx: Context,
  before: {
    user: User;
    arcadeParts: ArcadePart[];
    junks: Junk[];
  },
  want: {
    teras: number;
    aps: { category: ArcadePartCategory; subCategory: string }[];
    junks: {
      category: ArcadePartCategory;
      subCategory: string;
      amount: number;
    }[];
  },
): Promise<void> {
  const afterUser = await ctx.prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
  });
  expect(afterUser.terasBalance).toEqual(
    before.user.terasBalance.add(want.teras),
  );

  const afterArcadeParts = await ctx.prisma.arcadePart.findMany({
    where: { userId: ctx.userId },
  });
  expect(afterArcadeParts).toHaveLength(
    before.arcadeParts.length + want.aps.length,
  );

  for (const junk of want.junks) {
    const record = await ctx.prisma.junk.findUniqueOrThrow({
      where: {
        userId_category_subCategory: {
          userId: ctx.userId!,
          category: junk.category,
          subCategory: junk.subCategory,
        },
      },
    });
    const beforeRecord = before.junks.find((value) => {
      return (
        value.userId === ctx.userId! &&
        value.category === junk.category &&
        value.subCategory === junk.subCategory
      );
    });
    if (beforeRecord) {
      // Beforeがある時はAmountの加算確認
      expect(record.amount).toEqual(beforeRecord.amount + junk.amount);
    } else {
      // Beforeがない時はAmountがwantと一致
      expect(record.amount).toEqual(junk.amount);
    }
  }

  if (want.junks.length === 0) {
    // Junkを配布していない時はBeforeとAfterでJunks全量を比較して差がないこと
    const afterJunks = await ctx.prisma.junk.findMany({
      where: { userId: ctx.userId },
    });
    expect(afterJunks).toEqual(before.junks);
  }
}

async function getBefore(ctx: Context): Promise<{
  user: User;
  arcadeParts: ArcadePart[];
  junks: Junk[];
}> {
  const user = await ctx.prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
  });
  const arcadeParts = await ctx.prisma.arcadePart.findMany({
    where: { userId: ctx.userId },
  });
  const junks = await ctx.prisma.junk.findMany({
    where: { userId: ctx.userId },
  });

  return {
    user: user,
    arcadeParts: arcadeParts,
    junks: junks,
  };
}

describe("distributionRewardPlayCount", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });

  async function createPlayRecords(
    ctx: Context,
    playSessionId: string,
    playCount: number,
  ): Promise<void> {
    await createPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(playCount).fill(
        [PlayResult.WIN, PlayResult.LOSS, PlayResult.DISCONNECTED][
          Math.floor(Math.random() * 3)
        ],
      ),
    );
    // 古いデータを作る
    await createOldPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(5).fill(
        [PlayResult.WIN, PlayResult.LOSS, PlayResult.DISCONNECTED][
          Math.floor(Math.random() * 3)
        ],
      ),
    );

    // キャンペーン期間終了後のデータを作る
    await createEndedPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(5).fill(
        [PlayResult.WIN, PlayResult.LOSS, PlayResult.DISCONNECTED][
          Math.floor(Math.random() * 3)
        ],
      ),
    );
  }

  // 個々の配布に関しては定数化しているので、すべてのUTは行っていない
  // test("playCount : 5", async () => {
  //   const playCount = 5;
  //   // Teras : 0
  //   // AP : UC
  //   // Junk : 0

  //   const { ctx, playSession } = await createData();
  //   const before = await getBefore(ctx);
  //   await createPlayRecords(ctx, playSession.id, playCount);

  //   await distributionRewardPlayCount(ctx, ctx.userId!);

  //   await expectDistributionResult(ctx, before, {
  //     teras: 0,
  //     aps: [
  //       {
  //         category: "UPPER_CABINET",
  //         subCategory: "PLAIN",
  //       },
  //     ],
  //     junks: [],
  //   });
  // });
  // test("playCount : 10", async () => {
  //   const playCount = 10;
  //   // Teras : 100
  //   // AP : 0
  //   // Junk : 0

  //   const { ctx, playSession } = await createData();
  //   const before = await getBefore(ctx);
  //   await createPlayRecords(ctx, playSession.id, playCount);

  //   await distributionRewardPlayCount(ctx, ctx.userId!);

  //   await expectDistributionResult(ctx, before, {
  //     teras: 100,
  //     aps: [],
  //     junks: [],
  //   });
  // });
  test("playCount : 11 (no reward)", async () => {
    const playCount = 11;
    // Teras : 00
    // AP : 0
    // Junk : 0

    const { ctx, playSession } = await createData();
    const before = await getBefore(ctx);
    await createPlayRecords(ctx, playSession.id, playCount);

    await distributionRewardPlayCount(ctx, ctx.userId!);

    await expectDistributionResult(ctx, before, {
      teras: 0,
      aps: [],
      junks: [],
    });
  });
});

describe("distributionRewardSparkCount", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  async function createPlayRecords(
    ctx: Context,
    playSessionId: string,
    sparkCount: number,
  ): Promise<void> {
    await createPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(sparkCount).fill(PlayResult.WIN),
    );

    // 適当に負けたデータを作る
    await createPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(5).fill(
        [PlayResult.LOSS, PlayResult.DISCONNECTED][
          Math.floor(Math.random() * 2)
        ],
      ),
    );

    // 古いデータを作る
    await createOldPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(5).fill(
        [PlayResult.WIN, PlayResult.LOSS, PlayResult.DISCONNECTED][
          Math.floor(Math.random() * 3)
        ],
      ),
    );

    // キャンペーン終了後のデータを作る
    await createEndedPlay(
      ctx,
      playSessionId,
      Array<PlayResult>(5).fill(
        [PlayResult.WIN, PlayResult.LOSS, PlayResult.DISCONNECTED][
          Math.floor(Math.random() * 3)
        ],
      ),
    );
  }
  test("1 spark (no reward)", async () => {
    const sparkCount = 1;

    const { ctx, playSession } = await createData();
    const before = await getBefore(ctx);

    await createPlayRecords(ctx, playSession.id, sparkCount);

    await distributionRewardSparkCount(ctx, ctx.userId!);

    await expectDistributionResult(ctx, before, {
      teras: 0,
      aps: [],
      junks: [],
    });
  });
});

describe("distributionRewardCraftCount", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  async function createData(craftCount: number): Promise<Context> {
    const ctx = await createMockContext();
    const createdAt = new Date(CAMPAIGN_START_DATE);
    const oldCreatedAt = new Date(CAMPAIGN_START_DATE);
    oldCreatedAt.setDate(oldCreatedAt.getDate() - 1);

    for (let i = 0; i < craftCount; i++) {
      const am = await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          userId: ctx.userId,
          ownerWalletAddress: ctx.walletAddress,
          accumulatorSubCategory: "HOKUTO_100_LX",
        },
      });
      await ctx.prisma.craft.create({
        data: {
          userId: ctx.userId!,
          craftedArcadeMachineId: am.id,
          usedTerasBalance: new Prisma.Decimal(100),
          createdAt: createdAt,
        },
      });
    }

    // 古いCraftレコード作成
    for (let i = 0; i < 3; i++) {
      const am = await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          userId: ctx.userId,
          ownerWalletAddress: ctx.walletAddress,
          accumulatorSubCategory: "HOKUTO_100_LX",
        },
      });
      await ctx.prisma.craft.create({
        data: {
          userId: ctx.userId!,
          craftedArcadeMachineId: am.id,
          usedTerasBalance: new Prisma.Decimal(100),
          createdAt: oldCreatedAt,
        },
      });
    }
    return ctx;
  }
  // test("craftCount : 1", async () => {
  //   const craftCount = 1;
  //   // Teras : 1000
  //   // AP : 0
  //   // Junk : 0
  //   const ctx = await createData(craftCount);
  //   const before = await getBefore(ctx);

  //   await distributionRewardCraftCount(ctx);

  //   await expectDistributionResult(ctx, before, {
  //     teras: 1000,
  //     aps: [],
  //     junks: [],
  //   });
  // });
  test("craftCount : 21 (no reward)", async () => {
    const craftCount = 21;
    // Teras : 1000
    // AP : 0
    // Junk : 0
    const ctx = await createData(craftCount);
    const before = await getBefore(ctx);

    await distributionRewardCraftCount(ctx);

    await expectDistributionResult(ctx, before, {
      teras: 0,
      aps: [],
      junks: [],
    });
  });
});

describe("distributionReward", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("teras only", async () => {
    const ctx = await createMockContext();
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    await distributionReward(ctx, ctx.userId!, {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });

    expect(afterUser.terasBalance).toEqual(beforeUser.terasBalance.add(1000));
  });
  test("arcade part only(1 ap)", async () => {
    const ctx = await createMockContext();
    const beforeApCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    await distributionReward(ctx, ctx.userId!, {
      teras: 0,
      aps: () => {
        return [
          {
            category: ArcadePartCategory.ROM,
            subCategory: "BUBBLE_ATTACK",
          },
        ];
      },
      junks: () => [],
    });
    const afterApCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    expect(afterApCount).toEqual(beforeApCount + 1);
  });
  test("arcade part only(2 aps)", async () => {
    const ctx = await createMockContext();
    const beforeApCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    await distributionReward(ctx, ctx.userId!, {
      teras: 0,
      aps: () => {
        return [
          {
            category: ArcadePartCategory.ROM,
            subCategory: "BUBBLE_ATTACK",
          },
          {
            category: ArcadePartCategory.ACCUMULATOR,
            subCategory: "HOKUTO_100_LX",
          },
        ];
      },
      junks: () => [],
    });
    const afterApCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    expect(afterApCount).toEqual(beforeApCount + 2);
  });
  test("junk part only(1 junk)", async () => {
    const ctx = await createMockContext();
    const beforeJunkCount = await ctx.prisma.junk.count({
      where: { userId: ctx.userId },
    });
    expect(beforeJunkCount).toEqual(0);
    await distributionReward(ctx, ctx.userId!, {
      teras: 0,
      aps: () => [],
      junks: () => {
        return [
          {
            type: {
              category: ArcadePartCategory.UPPER_CABINET,
              subCategory: "PLAIN",
            },
            amount: 10,
          },
        ];
      },
    });
    const afterJunks = await ctx.prisma.junk.findMany({
      where: { userId: ctx.userId },
    });
    expect(afterJunks).toHaveLength(1);
    expect(afterJunks[0].amount).toEqual(10);
  });
  test("junk part only(2 junks)", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.junk.create({
      data: {
        userId: ctx.userId!,
        category: ArcadePartCategory.LOWER_CABINET,
        subCategory: "PLAIN",
        amount: 100,
      },
    });
    const beforeJunkCount = await ctx.prisma.junk.count({
      where: { userId: ctx.userId },
    });
    expect(beforeJunkCount).toEqual(1);
    await distributionReward(ctx, ctx.userId!, {
      teras: 0,
      aps: () => [],
      junks: () => {
        return [
          {
            type: {
              category: ArcadePartCategory.LOWER_CABINET,
              subCategory: "PLAIN",
            },
            amount: 10,
          },
          {
            type: {
              category: ArcadePartCategory.ROM,
              subCategory: "BUBBLE_ATTACK",
            },
            amount: 20,
          },
        ];
      },
    });
    const afterJunks = await ctx.prisma.junk.findMany({
      where: { userId: ctx.userId },
    });
    expect(afterJunks).toHaveLength(2);
    for (const afterJunk of afterJunks) {
      if (afterJunk.category === "LOWER_CABINET") {
        expect(afterJunk.amount).toEqual(110);
      } else {
        expect(afterJunk.amount).toEqual(20);
      }
    }
  });
  test("teras and arcade part", async () => {
    const ctx = await createMockContext();
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const beforeArcadePartsCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    await distributionReward(ctx, ctx.userId!, {
      teras: 1000,
      aps: () => {
        return [
          {
            category: "ROM",
            subCategory: "BUBBLE_ATTACK",
          },
        ];
      },
      junks: () => [],
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const afterArcadePartsCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    expect(afterUser.terasBalance).toEqual(beforeUser.terasBalance.add(1000));
    expect(afterArcadePartsCount).toEqual(beforeArcadePartsCount + 1);
  });
  test("teras and junk", async () => {
    const ctx = await createMockContext();
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const beforeJunkCount = await ctx.prisma.junk.count({
      where: {
        userId: ctx.userId,
      },
    });
    expect(beforeJunkCount).toEqual(0);
    await distributionReward(ctx, ctx.userId!, {
      teras: 1000,
      aps: () => [],
      junks: () => {
        return [
          {
            type: {
              category: "ACCUMULATOR",
              subCategory: "HOKUTO_100_LX",
            },
            amount: 20,
          },
        ];
      },
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const afterJunks = await ctx.prisma.junk.findMany({
      where: {
        userId: ctx.userId,
      },
    });
    expect(afterUser.terasBalance).toEqual(beforeUser.terasBalance.add(1000));
    expect(afterJunks).toHaveLength(1);
    expect(afterJunks[0].amount).toEqual(20);
  });
  test("arcade part and junk", async () => {
    const ctx = await createMockContext();
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const beforeArcadePartsCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    expect(beforeArcadePartsCount).toEqual(0);

    const beforeJunkCount = await ctx.prisma.junk.count({
      where: {
        userId: ctx.userId,
      },
    });
    expect(beforeJunkCount).toEqual(0);
    await distributionReward(ctx, ctx.userId!, {
      teras: 0,
      aps: () => [
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
      ],
      junks: () => [
        {
          type: {
            category: "UPPER_CABINET",
            subCategory: "PLAIN",
          },
          amount: 20,
        },
      ],
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const afterArcadeParts = await ctx.prisma.arcadePart.findMany({
      where: { userId: ctx.userId },
    });

    const afterJunks = await ctx.prisma.junk.findMany({
      where: {
        userId: ctx.userId,
      },
    });
    expect(afterUser).toEqual(beforeUser);
    expect(afterArcadeParts).toHaveLength(1);
    expect(afterArcadeParts).toMatchObject([
      {
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        userId: ctx.userId!,
      },
    ]);
    expect(afterJunks).toHaveLength(1);
    expect(afterJunks).toMatchObject([
      {
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        amount: 20,
        userId: ctx.userId!,
      },
    ]);
  });
  test("teras , arcade part and junk", async () => {
    const ctx = await createMockContext();
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(beforeUser.terasBalance).toEqual(new Prisma.Decimal(0));
    const beforeArcadePartsCount = await ctx.prisma.arcadePart.count({
      where: { userId: ctx.userId },
    });
    expect(beforeArcadePartsCount).toEqual(0);

    const beforeJunkCount = await ctx.prisma.junk.count({
      where: {
        userId: ctx.userId,
      },
    });
    expect(beforeJunkCount).toEqual(0);
    await distributionReward(ctx, ctx.userId!, {
      teras: 1000,
      aps: () => [
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
      ],
      junks: () => [
        {
          type: {
            category: "UPPER_CABINET",
            subCategory: "PLAIN",
          },
          amount: 30,
        },
      ],
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const afterArcadeParts = await ctx.prisma.arcadePart.findMany({
      where: { userId: ctx.userId },
    });

    const afterJunks = await ctx.prisma.junk.findMany({
      where: {
        userId: ctx.userId,
      },
    });
    expect(afterUser.terasBalance).toEqual(beforeUser.terasBalance.add(1000));
    expect(afterArcadeParts).toHaveLength(1);
    expect(afterArcadeParts).toMatchObject([
      {
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        userId: ctx.userId!,
      },
    ]);
    expect(afterJunks).toHaveLength(1);
    expect(afterJunks).toMatchObject([
      {
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        amount: 30,
        userId: ctx.userId!,
      },
    ]);
  });
});
