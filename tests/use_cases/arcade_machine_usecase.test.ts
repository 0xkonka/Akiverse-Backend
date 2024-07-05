import "reflect-metadata";

import { createRandomUser, eraseDatabase } from "../test_helper";
import ArcadeMachineUseCaseImpl from "../../src/use_cases/arcade_machine_usecase";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../src/use_cases/errors";
import {
  ArcadeMachine,
  GameCenter,
  GameCenterArea,
  GameCenterSize,
} from "@generated/type-graphql";
import { createMockContext } from "../mock/context";
import { Context } from "../../src/context";
import { getCapacity } from "../../src/metadata/game-centers";
import { getInstallingFee } from "../../src/helpers/fee";
import {
  getAkiverseManagerUserId,
  INSTALLATION_FEE_OF_DAY,
} from "../../src/constants";
import { PlayResult, Prisma } from "@prisma/client";
import { PlaySessionState } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import prisma from "../../src/prisma";

const useCase = new ArcadeMachineUseCaseImpl();

async function createArcadeMachine(
  ctx: Context,
  extraData = {},
): Promise<ArcadeMachine> {
  return await ctx.prisma.arcadeMachine.create({
    data: {
      game: "BUBBLE_ATTACK",
      userId: ctx.userId,
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
      name: "test",
      id: "1",
      size: GameCenterSize.SMALL,
      xCoordinate: 1,
      yCoordinate: 1,
      area: GameCenterArea.AKIHABARA,
      userId: ctx.userId,
      ...extraData,
    },
  });
}

describe("installArcadeMachine", () => {
  beforeAll(() => {
    (getInstallingFee as jest.Mock) = jest.fn().mockImplementation(() => {
      return INSTALLATION_FEE_OF_DAY;
    });
  });
  afterAll(() => {
    jest.resetAllMocks();
  });
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext({
      terasBalance: INSTALLATION_FEE_OF_DAY,
    });
    const amo = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const gcoCtx = await createMockContext();
    const gco = await prisma.user.findUnique({ where: { id: gcoCtx.userId } });
    // GameCenterは募集中 かつ 空きが存在している
    const arcadeMachine = await createArcadeMachine(ctx);
    const gameCenter = await createGameCenter(gcoCtx, {
      placementAllowed: true,
    });
    const ret = await useCase.installArcadeMachineToGameCenter(
      ctx,
      arcadeMachine.id,
      gameCenter.id,
      true,
    );
    expect(ret.id).toBe(arcadeMachine.id);
    expect(ret.gameCenterId).toBe(gameCenter.id);
    expect(ret.installedAt).not.toBeNull();
    const afterAMO = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const afterGCO = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: gcoCtx.userId },
    });
    expect(afterAMO.terasBalance).toEqual(
      amo!.terasBalance.minus(getInstallingFee()),
    );
    expect(afterGCO.terasBalance).toEqual(
      gco!.terasBalance.add(getInstallingFee()),
    );
  });
  test("arcade machine not found", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.installArcadeMachineToGameCenter(ctx, "404", "404", true),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("game center not found", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx);
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        "404",
        true,
      ),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("game center not recruiting", async () => {
    const ctx = await createMockContext();
    // GameCenterは募集していない
    const arcadeMachine = await createArcadeMachine(ctx);
    const gameCenter = await createGameCenter(ctx);
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("game center full capacity", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx, { placementAllowed: true });
    for (let i = 1; i <= getCapacity(gameCenter.size); i++) {
      await createArcadeMachine(ctx, {
        gameCenterId: gameCenter.id,
        position: i,
        id: (i + 10).toString(),
      });
    }
    const arcadeMachine = await createArcadeMachine(ctx);

    // Sizeを超えてInstallする
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("permission error", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      userId: dummyUser.id,
    });
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        "403",
        true,
      ),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("update conflicted", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx);
    const gameCenter = await createGameCenter(ctx, { placementAllowed: true });

    // save original function
    const orgGameCenterFindUnique = ctx.prisma.gameCenter.findUnique;
    const arcadeMachine2 = await createArcadeMachine(ctx);
    // create mock
    (ctx.prisma.gameCenter.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const orgRet = await orgGameCenterFindUnique(args);

        await ctx.prisma.arcadeMachine.update({
          where: { id: arcadeMachine2.id },
          data: {
            position: 1,
            gameCenterId: gameCenter.id,
          },
        });

        return orgRet;
      });

    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(ConflictUseCaseError);

    // Restore original function
    ctx.prisma.gameCenter.findUnique = orgGameCenterFindUnique;
  });
  // 設置料が0Terasだと失敗しえないので一時的にTestスキップ
  test("AMO Teras balance insufficient", async () => {
    const ctx = await createMockContext({ terasBalance: 0 });
    const gcoCtx = await createMockContext();
    // GameCenterは募集中 かつ 空きが存在している
    const arcadeMachine = await createArcadeMachine(ctx);
    const gameCenter = await createGameCenter(gcoCtx, {
      placementAllowed: true,
    });
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("AMO Teras balance insufficient(conflict)", async () => {
    const ctx = await createMockContext({ terasBalance: 240 });
    const gcoCtx = await createMockContext();
    // GameCenterは募集中 かつ 空きが存在している
    const arcadeMachine = await createArcadeMachine(ctx);
    const gameCenter = await createGameCenter(gcoCtx, {
      placementAllowed: true,
    });

    // save original function
    const orgUserFindUnique = ctx.prisma.user.findUnique;
    // create mock
    (ctx.prisma.user.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const orgRet = await orgUserFindUnique(args);
        await ctx.prisma.user.update({
          where: { id: ctx.userId },
          data: { terasBalance: 1 },
        });
        return orgRet;
      });
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(ConflictUseCaseError);
    // Restore original function
    ctx.prisma.user.findUnique = orgUserFindUnique;
  });
  test("AMO/GCO same user then no fee", async () => {
    const ctx = await createMockContext({ terasBalance: 0 });
    // GameCenterは募集中 かつ 空きが存在している
    const arcadeMachine = await createArcadeMachine(ctx);
    const gameCenter = await createGameCenter(ctx, {
      placementAllowed: true,
    });
    const ret = await useCase.installArcadeMachineToGameCenter(
      ctx,
      arcadeMachine.id,
      gameCenter.id,
      true,
    );
    expect(ret.id).toBe(arcadeMachine.id);
    expect(ret.gameCenterId).toBe(gameCenter.id);
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(0));
  });
  test("Disabled game should not install", async () => {
    const ctx = await createMockContext();
    await prisma.user.findUnique({ where: { id: ctx.userId } });
    const gcoCtx = await createMockContext();
    await prisma.user.findUnique({ where: { id: gcoCtx.userId } });
    // GameCenterは募集中 かつ 空きが存在している
    const arcadeMachine = await createArcadeMachine(ctx, {
      game: "CURVE_BALL_3D",
    });
    const gameCenter = await createGameCenter(gcoCtx, {
      placementAllowed: true,
    });
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("Fever ended AM should not install", async () => {
    const ctx = await createMockContext();
    const gcoCtx = await createMockContext();
    // Fever残が0=設置できない
    const arcadeMachine = await createArcadeMachine(ctx, {
      energy: 1000,
      maxEnergy: 1000,
      feverSparkRemain: 0,
    });
    const gameCenter = await createGameCenter(gcoCtx, {
      placementAllowed: true,
    });
    await expect(
      useCase.installArcadeMachineToGameCenter(
        ctx,
        arcadeMachine.id,
        gameCenter.id,
        true,
      ),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});

describe("uninstallArcadeMachine", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/arcade machine owner", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, {
      placementAllowed: true,
      userId: dummyUser.id,
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      gameCenterId: gameCenter.id,
      position: 1,
      installedAt: new Date(),
    });

    const ret = await useCase.uninstallArcadeMachineFromGameCenter(
      ctx,
      arcadeMachine.id,
    );
    expect(ret.id).toBe(arcadeMachine.id);
    expect(ret.gameCenterId).toBeNull();
    expect(ret.installedAt).toBeNull();
  });
  test("success/game center owner", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, { placementAllowed: true });
    const arcadeMachine = await createArcadeMachine(ctx, {
      gameCenterId: gameCenter.id,
      position: 1,
      userId: dummyUser.id,
    });

    const ret = await useCase.uninstallArcadeMachineFromGameCenter(
      ctx,
      arcadeMachine.id,
    );
    expect(ret.id).toBe(arcadeMachine.id);
    expect(ret.gameCenterId).toBeNull();
  });
  test("arcade machine not found", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.uninstallArcadeMachineFromGameCenter(ctx, "404"),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("not installed", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx);
    await expect(
      useCase.uninstallArcadeMachineFromGameCenter(ctx, arcadeMachine.id),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("permission error", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, {
      placementAllowed: true,
      userId: dummyUser.id,
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      userId: dummyUser.id,
      gameCenterId: gameCenter.id,
      position: 1,
    });

    await expect(
      useCase.uninstallArcadeMachineFromGameCenter(ctx, arcadeMachine.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("permission error/AM not installed", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      userId: dummyUser.id,
    });

    await expect(
      useCase.uninstallArcadeMachineFromGameCenter(ctx, arcadeMachine.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
});

describe("withdraw", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx);
    expect(arcadeMachine.state).toBe("IN_AKIVERSE");
    const ret = await useCase.withdraw(ctx, arcadeMachine.id);
    expect(ret[0].id).toBe(arcadeMachine.id);
    expect(ret[0].state).toBe("MOVING_TO_WALLET");
  });
  test("success/multiple", async () => {
    const ctx = await createMockContext();
    const arcadeMachine1 = await createArcadeMachine(ctx);
    expect(arcadeMachine1.state).toBe("IN_AKIVERSE");
    const arcadeMachine2 = await createArcadeMachine(ctx);
    expect(arcadeMachine2.state).toBe("IN_AKIVERSE");
    const ret = await useCase.withdraw(
      ctx,
      arcadeMachine1.id,
      arcadeMachine2.id,
    );
    expect(ret).toHaveLength(2);
    const ret1 = ret.find((v) => v.id === arcadeMachine1.id);
    expect(ret1).not.toBeUndefined();
    expect(ret1!.state).toBe("MOVING_TO_WALLET");

    const ret2 = ret.find((v) => v.id === arcadeMachine2.id);
    expect(ret2).not.toBeUndefined();
    expect(ret2!.state).toBe("MOVING_TO_WALLET");
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    const arcadeMachine1 = await createArcadeMachine(ctx);
    expect(arcadeMachine1.state).toBe("IN_AKIVERSE");

    await expect(
      useCase.withdraw(ctx, "404", arcadeMachine1.id),
    ).rejects.toThrowError(NotFoundUseCaseError);

    const after = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: arcadeMachine1.id },
    });
    // 変更されてないこと
    expect(after).toEqual(arcadeMachine1);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      userId: dummyUser.id,
    });
    await expect(useCase.withdraw(ctx, arcadeMachine.id)).rejects.toThrowError(
      PermissionDeniedUseCaseError,
    );
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx, {
      state: "MOVING_TO_WALLET",
    });
    await expect(useCase.withdraw(ctx, arcadeMachine.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("disable arcade machine can't withdraw", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx, {
      game: "CURVE_BALL_3D",
    });
    expect(arcadeMachine.state).toBe("IN_AKIVERSE");
    await expect(useCase.withdraw(ctx, arcadeMachine.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
});

describe("deposit", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadeMachine.state).toBe("IN_WALLET");
    const ret = await useCase.deposit(ctx, "hash", arcadeMachine.id);
    expect(ret[0].state).toBe("MOVING_TO_AKIVERSE");
  });
  test("success/multiple", async () => {
    const ctx = await createMockContext();
    const arcadeMachine1 = await createArcadeMachine(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadeMachine1.state).toBe("IN_WALLET");
    const arcadeMachine2 = await createArcadeMachine(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadeMachine2.state).toBe("IN_WALLET");
    const ret = await useCase.deposit(
      ctx,
      "hash",
      arcadeMachine1.id,
      arcadeMachine2.id,
    );
    for (const arcadeMachine of ret) {
      expect(arcadeMachine.state).toBe("MOVING_TO_AKIVERSE");
    }
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    const arcadeMachine1 = await createArcadeMachine(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadeMachine1.state).toBe("IN_WALLET");
    await expect(
      useCase.deposit(ctx, "hash", "404", arcadeMachine1.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
    const after = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: arcadeMachine1.id },
    });
    // 変更されてないこと
    expect(after).toEqual(arcadeMachine1);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      userId: dummyUser.id,
    });
    await expect(
      useCase.deposit(ctx, "hash", arcadeMachine.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx, {
      state: "MOVING_TO_WALLET",
    });
    await expect(
      useCase.deposit(ctx, "hash", arcadeMachine.id),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});
describe("update", () => {
  test("success", async () => {
    const ctx = await createMockContext();
    const arcadeMachine = await createArcadeMachine(ctx);
    expect(arcadeMachine.autoRenewLease).toBeFalsy();
    const ret = await useCase.update(ctx, arcadeMachine.id, true);
    expect(ret.autoRenewLease).toBeTruthy();
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    await expect(useCase.update(ctx, "404", true)).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const arcadeMachine = await createArcadeMachine(ctx, {
      userId: dummyUser.id,
    });
    expect(arcadeMachine.autoRenewLease).toBeFalsy();
    await expect(
      useCase.update(ctx, arcadeMachine.id, true),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
});
describe("playing", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("now playing", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await ctx.prisma.playSession.create({
      data: {
        authToken: "test",
        state: PlaySessionState.PLAYING,
        playerId: ctx.userId!,
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
      },
    });
    const ret = await useCase.playing(ctx, am.id);
    expect(ret).toBeTruthy();
  });
  test("finished", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await ctx.prisma.playSession.create({
      data: {
        authToken: "test",
        state: PlaySessionState.FINISHED,
        playerId: ctx.userId!,
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
      },
    });
    const ret = await useCase.playing(ctx, am.id);
    expect(ret).toBeFalsy();
  });
  test("ready", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await ctx.prisma.playSession.create({
      data: {
        authToken: "test",
        state: PlaySessionState.READY,
        playerId: ctx.userId!,
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
      },
    });
    const ret = await useCase.playing(ctx, am.id);
    expect(ret).toBeTruthy();
  });
  test("record not found", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    const ret = await useCase.playing(ctx, am.id);
    expect(ret).toBeFalsy();
  });
});

// FIXME 1AM 1Playerの仕様にする際に他のユーザーのPlaySessionが存在するときの挙動がわかるテストを追加する
describe("listPlayableAndRandomize", () => {
  beforeEach(async () => {
    await eraseDatabase();
    await prisma.gameSetting.create({
      data: {
        game: "BUBBLE_ATTACK",
        difficulty: 1,
        targetScore: 1,
        dailyMaxPlayCount: 3,
      },
    });
    const akiverseManager = await createRandomUser();
    (getAkiverseManagerUserId as jest.Mock) = jest
      .fn()
      .mockReturnValue(akiverseManager.id);
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test("no arcade machine", async () => {
    const ctx = await createMockContext();
    const ret = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      30,
      10,
    );
    expect(ret).toEqual([]);
  });
  test("get arcade machines", async () => {
    const ctx = await createMockContext();
    const amoCtx = await createMockContext();
    const requestCount = 10;
    const maxPlayingCount = 1;

    const gcoCtx = await createMockContext();
    const playingGameCenter = await createGameCenter(gcoCtx, { id: "gc1" });
    const notPlayingGameCenter = await createGameCenter(gcoCtx, { id: "gc2" });
    for (let i = 0; i < maxPlayingCount + 5; i++) {
      const player = await createMockContext();
      await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          gameCenterId: playingGameCenter.id,
          position: i + 1,
          userId: amoCtx.userId,
          accumulatorSubCategory: "HOKUTO_100_LX",
          playSessions: {
            create: {
              state: PlaySessionState.PLAYING,
              playerId: player.userId!,
              arcadeMachineOwnerId: amoCtx.userId!,
              maxPlayCount: 3,
              authToken: uuidv4(),
            },
          },
        },
      });
    }

    for (let i = 0; i < requestCount + 5; i++) {
      await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          gameCenterId: notPlayingGameCenter.id,
          position: i + 1,
          userId: amoCtx.userId,
          accumulatorSubCategory: "HOKUTO_100_LX",
        },
      });
    }

    const first = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    expect(first).toHaveLength(requestCount);
    const playing = first.filter(
      (value) => value.gameCenterId === playingGameCenter.id,
    );
    const notPlaying = first.filter(
      (value) => value.gameCenterId === notPlayingGameCenter.id,
    );
    // maxPlayingCountよりも多いAMが存在するので必ず埋まる
    expect(playing).toHaveLength(maxPlayingCount);
    expect(notPlaying).toHaveLength(requestCount - maxPlayingCount);

    // ランダムであることのテストを都度実行してしまうと失敗する可能性があるのでコメントアウト
    // const second = await useCase.listPlayableAndRandomize(
    //   ctx,
    //   "BUBBLE_ATTACK",
    //   requestCount,
    //   maxPlayingCount
    // );
    // expect(first).not.toEqual(second);
  });
  test("当日ゲームし尽くしたAMは返ってこない", async () => {
    const ctx = await createMockContext();
    const amoCtx = await createMockContext();
    const requestCount = 10;
    const maxPlayingCount = 1;

    const gcoCtx = await createMockContext();
    const gameCenter = await createGameCenter(gcoCtx, { id: "gc1" });
    const am = await createArcadeMachine(ctx, {
      game: "BUBBLE_ATTACK",
      userId: amoCtx.userId,
      gameCenterId: gameCenter.id,
      position: 1,
    });

    const notPlay = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    // 未プレイでは返ってくる
    expect(notPlay).toHaveLength(1);

    // プレイ可能数分PlaySessions/Playsを作る
    // PlaySessionsが分かれていても問題ないことを確認するため、PlaySessionsとPlaysを1:1で作る
    const gameSetting = await prisma.gameSetting.findUniqueOrThrow({
      where: { game: "BUBBLE_ATTACK" },
    });
    const dailyMaxPlayCount = gameSetting.dailyMaxPlayCount;
    for (let i = 0; i < gameSetting.dailyMaxPlayCount; i++) {
      await prisma.playSession.create({
        data: {
          gameCenterId: gameCenter.id,
          arcadeMachineOwnerId: am.userId!,
          arcadeMachineId: am.id,
          maxPlayCount: dailyMaxPlayCount - i,
          state: PlaySessionState.FINISHED,
          playerId: ctx.userId!,
          authToken: uuidv4(),
          plays: {
            create: {
              result: PlayResult.LOSS,
              endedAt: new Date(),
              score: 1,
            },
          },
        },
      });
    }
    const plays = await prisma.play.findMany({});
    expect(plays).toHaveLength(3);

    const played = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    // DailyMaxPlayCountまでプレイしたAMは返ってこない
    expect(played).toHaveLength(0);
  });
  test("自保有のAM", async () => {
    const ctx = await createMockContext();

    const requestCount = 10;
    const maxPlayingCount = 1;

    const am = await createArcadeMachine(ctx, {
      game: "BUBBLE_ATTACK",
      userId: ctx.userId,
    });

    const notPlay = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    // GCに設置していなくても返ってくる
    expect(notPlay).toHaveLength(1);

    // プレイ可能数分PlaySessions/Playsを作る
    // PlaySessionsが分かれていても問題ないことを確認するため、PlaySessionsとPlaysを1:1で作る
    const gameSetting = await prisma.gameSetting.findUniqueOrThrow({
      where: { game: "BUBBLE_ATTACK" },
    });
    const dailyMaxPlayCount = gameSetting.dailyMaxPlayCount;
    for (let i = 0; i < gameSetting.dailyMaxPlayCount; i++) {
      await prisma.playSession.create({
        data: {
          arcadeMachineOwnerId: am.userId!,
          arcadeMachineId: am.id,
          maxPlayCount: dailyMaxPlayCount - i,
          state: PlaySessionState.FINISHED,
          playerId: ctx.userId!,
          authToken: uuidv4(),
          plays: {
            create: {
              result: PlayResult.LOSS,
              endedAt: new Date(),
              score: 1,
            },
          },
        },
      });
    }
    const plays = await prisma.play.findMany({});
    expect(plays).toHaveLength(3);

    const played = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    // DailyMaxPlayCountまでプレイしてもAM返ってくる
    expect(played).toHaveLength(1);
  });
  test("game not found", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.listPlayableAndRandomize(ctx, "test", 10, 1),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("requestCount <= maxPlayingCount", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.listPlayableAndRandomize(ctx, "BUBBLE_ATTACK", 1, 1),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
    await expect(
      useCase.listPlayableAndRandomize(ctx, "BUBBLE_ATTACK", 1, 2),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("CBT2 AM保有のAMはGC未設置でも返却される", async () => {
    const ctx = await createMockContext();

    const requestCount = 10;
    const maxPlayingCount = 1;

    const am = await createArcadeMachine(ctx, {
      game: "BUBBLE_ATTACK",
      userId: getAkiverseManagerUserId(),
    });

    const notPlay = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    // GCに設置していなくても返ってくる
    expect(notPlay).toHaveLength(1);

    // プレイ可能数分PlaySessions/Playsを作る
    // PlaySessionsが分かれていても問題ないことを確認するため、PlaySessionsとPlaysを1:1で作る
    const gameSetting = await prisma.gameSetting.findUniqueOrThrow({
      where: { game: "BUBBLE_ATTACK" },
    });
    const dailyMaxPlayCount = gameSetting.dailyMaxPlayCount;
    for (let i = 0; i < gameSetting.dailyMaxPlayCount; i++) {
      await prisma.playSession.create({
        data: {
          arcadeMachineOwnerId: am.userId!,
          arcadeMachineId: am.id,
          maxPlayCount: dailyMaxPlayCount - i,
          state: PlaySessionState.FINISHED,
          playerId: ctx.userId!,
          authToken: uuidv4(),
          plays: {
            create: {
              result: PlayResult.LOSS,
              endedAt: new Date(),
              score: 1,
            },
          },
        },
      });
    }
    const plays = await prisma.play.findMany({});
    expect(plays).toHaveLength(3);

    const played = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount,
      maxPlayingCount,
    );
    // 運営のAMは最大回数の制限を受ける
    expect(played).toHaveLength(0);
  });
  test("運営のAMは優先度が低いこと", async () => {
    /*
    requestCount 10
    maxPlayingCount 2

    運営以外のAM
    playing 2
    ready 10

    運営のAM
    playing 2
    ready 10

    複数回取得しても運営以外のAMだけが選択されること
     */
    const ctx = await createMockContext();
    const amoCtx = await createMockContext();
    const requestCount = 10;
    const maxPlayingCount = 2;

    // 運営以外のAMを投入
    const gcoCtx = await createMockContext();
    const playingGameCenter = await createGameCenter(gcoCtx, { id: "gc1" });
    const notPlayingGameCenter = await createGameCenter(gcoCtx, { id: "gc2" });
    for (let i = 0; i < maxPlayingCount; i++) {
      const player = await createMockContext();
      await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          gameCenterId: playingGameCenter.id,
          position: i + 1,
          userId: amoCtx.userId,
          accumulatorSubCategory: "HOKUTO_100_LX",
          playSessions: {
            create: {
              state: PlaySessionState.PLAYING,
              playerId: player.userId!,
              arcadeMachineOwnerId: amoCtx.userId!,
              maxPlayCount: 3,
              authToken: uuidv4(),
            },
          },
        },
      });
    }

    for (let i = 0; i < requestCount; i++) {
      await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          gameCenterId: notPlayingGameCenter.id,
          position: i + 1,
          userId: amoCtx.userId,
          accumulatorSubCategory: "HOKUTO_100_LX",
        },
      });
    }

    // 運営のAMを投入
    for (let i = 0; i < maxPlayingCount; i++) {
      const player = await createMockContext();
      await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          userId: getAkiverseManagerUserId(),
          accumulatorSubCategory: "HOKUTO_100_LX",
          playSessions: {
            create: {
              state: PlaySessionState.PLAYING,
              playerId: player.userId!,
              arcadeMachineOwnerId: getAkiverseManagerUserId(),
              maxPlayCount: 3,
              authToken: uuidv4(),
            },
          },
        },
      });
    }

    for (let i = 0; i < requestCount; i++) {
      await ctx.prisma.arcadeMachine.create({
        data: {
          game: "BUBBLE_ATTACK",
          userId: getAkiverseManagerUserId(),
          accumulatorSubCategory: "HOKUTO_100_LX",
        },
      });
    }

    for (let i = 0; i < 10; i++) {
      const list = await useCase.listPlayableAndRandomize(
        ctx,
        "BUBBLE_ATTACK",
        requestCount,
        maxPlayingCount,
      );
      expect(list).toHaveLength(requestCount);
      const playing = list.filter(
        (value) => value.gameCenterId === playingGameCenter.id,
      );
      const notPlaying = list.filter(
        (value) => value.gameCenterId === notPlayingGameCenter.id,
      );
      expect(playing).toHaveLength(maxPlayingCount);
      expect(notPlaying).toHaveLength(requestCount - maxPlayingCount);

      // 運営のAMが存在しないこと
      const has = list.find(
        (value) => value.userId === getAkiverseManagerUserId(),
      );
      expect(has).toBeUndefined();
    }

    // 要求数を増やしたら運営のAMも選択されること
    const list = await useCase.listPlayableAndRandomize(
      ctx,
      "BUBBLE_ATTACK",
      requestCount * 2,
      maxPlayingCount * 2,
    );
    expect(list).toHaveLength(requestCount * 2);

    // 運営のAMが存在すること
    const has = list.find(
      (value) => value.userId === getAkiverseManagerUserId(),
    );
    expect(has).not.toBeUndefined();
  });
});
