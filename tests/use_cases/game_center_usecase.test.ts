import "reflect-metadata";

import prisma from "../../src/prisma";
import { GameCenterUseCaseImpl } from "../../src/use_cases/game_center_usecase";
import { eraseDatabase } from "../test_helper";
import {
  IllegalStateUseCaseError,
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

const useCase = new GameCenterUseCaseImpl();

async function createGameCenter(
  ctx: Context,
  id: number = 1,
  extraData = {},
): Promise<GameCenter> {
  return await prisma.gameCenter.create({
    data: {
      name: "test",
      id: id.toFixed(),
      size: GameCenterSize.SMALL,
      xCoordinate: 1,
      yCoordinate: 1,
      area: GameCenterArea.AKIHABARA,
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      ...extraData,
    },
  });
}

async function createArcadeMachine(
  ctx: Context,
  extraData = {},
): Promise<ArcadeMachine> {
  return await prisma.arcadeMachine.create({
    data: {
      id: "1",
      game: "test",
      userId: ctx.userId,
      accumulatorSubCategory: "HOKUTO_100_LX",
      ...extraData,
    },
  });
}

describe("startRecruitmentForArcadeMachine", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx);
    const ret = await useCase.startRecruitmentForArcadeMachine(
      ctx,
      gameCenter.id,
    );
    expect(ret.id).toBe(gameCenter.id);
    expect(ret.placementAllowed).toBeTruthy();
  });
  test("GameCenter not found", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.startRecruitmentForArcadeMachine(ctx, "404"),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, 1, { userId: dummyUser.id });
    await expect(
      useCase.startRecruitmentForArcadeMachine(ctx, gameCenter.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("already recruiting", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx, 1, {
      placementAllowed: true,
    });
    await expect(
      useCase.startRecruitmentForArcadeMachine(ctx, gameCenter.id),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});

describe("stopRecruitmentForArcadeMachine", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx, 1, {
      placementAllowed: true,
    });
    const installedArcadeMachine = await createArcadeMachine(ctx, {
      gameCenterId: gameCenter.id,
      position: 1,
      installedAt: new Date(),
    });
    expect(installedArcadeMachine).toMatchObject({
      gameCenterId: gameCenter.id,
      position: 1,
    });
    const ret = await useCase.stopRecruitmentForArcadeMachine(
      ctx,
      gameCenter.id,
    );
    expect(ret.id).toBe(gameCenter.id);
    expect(ret.placementAllowed).toBeFalsy();
    const uninstalledArcadeMachine =
      await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: installedArcadeMachine.id },
      });
    expect(uninstalledArcadeMachine).toMatchObject(installedArcadeMachine);
  });
  test("GameCenter not found", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.stopRecruitmentForArcadeMachine(ctx, "404"),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, 1, { userId: dummyUser.id });
    await expect(
      useCase.stopRecruitmentForArcadeMachine(ctx, gameCenter.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("already stopped recruiting", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx);
    await expect(
      useCase.stopRecruitmentForArcadeMachine(ctx, gameCenter.id),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});

describe("listPlacementArcadeMachines", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/no arcade machine", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx);
    const ret = await useCase.listPlacementArcadeMachines(ctx, gameCenter.id);
    expect(ret.id).toBe(gameCenter.id);
    expect(ret.arcadeMachines).toHaveLength(0);
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx);
    await createArcadeMachine(ctx, {
      gameCenterId: gameCenter.id,
      position: 1,
      id: "11",
    });
    await createArcadeMachine(ctx, {
      gameCenterId: gameCenter.id,
      position: 2,
      id: "12",
    });
    const ret = await useCase.listPlacementArcadeMachines(ctx, gameCenter.id);
    expect(ret.id).toBe(gameCenter.id);
    expect(ret.arcadeMachines).toHaveLength(2);
  });
  test("success/no ownership user", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, 1, { userId: dummyUser.id });
    await createArcadeMachine(ctx, {
      gameCenterId: gameCenter.id,
      position: 1,
      id: "1",
      userId: dummyUser.id,
    });
    const ret = await useCase.listPlacementArcadeMachines(ctx, gameCenter.id);
    expect(ret.id).toBe(gameCenter.id);
    expect(ret.arcadeMachines).toHaveLength(1);
  });
});

describe("withdraw", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx);
    expect(gameCenter.state).toBe("IN_AKIVERSE");
    const ret = await useCase.withdraw(ctx, gameCenter.id);
    expect(ret[0].id).toBe(gameCenter.id);
    expect(ret[0].state).toBe("MOVING_TO_WALLET");
  });
  test("success/multiple", async () => {
    const ctx = await createMockContext();
    const gameCenter1 = await createGameCenter(ctx, 1);
    expect(gameCenter1.state).toBe("IN_AKIVERSE");
    const gameCenter2 = await createGameCenter(ctx, 2);
    expect(gameCenter2.state).toBe("IN_AKIVERSE");
    const ret = await useCase.withdraw(ctx, gameCenter1.id, gameCenter2.id);
    for (const gameCenter of ret) {
      expect(gameCenter.state).toBe("MOVING_TO_WALLET");
    }
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    const gameCenter1 = await createGameCenter(ctx);
    expect(gameCenter1.state).toBe("IN_AKIVERSE");

    await expect(
      useCase.withdraw(ctx, "404", gameCenter1.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
    const after = await prisma.gameCenter.findUniqueOrThrow({
      where: {
        id: gameCenter1.id,
      },
    });
    expect(after).toEqual(gameCenter1);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, 1, { userId: dummyUser.id });
    await expect(useCase.withdraw(ctx, gameCenter.id)).rejects.toThrowError(
      PermissionDeniedUseCaseError,
    );
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx, 1, {
      state: "MOVING_TO_WALLET",
    });
    await expect(useCase.withdraw(ctx, gameCenter.id)).rejects.toThrowError(
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
    const gameCenter = await createGameCenter(ctx, 1, {
      state: "IN_WALLET",
    });
    expect(gameCenter.state).toBe("IN_WALLET");
    const ret = await useCase.deposit(ctx, "hash", gameCenter.id);
    expect(ret[0].state).toBe("MOVING_TO_AKIVERSE");
  });
  test("success/multiple", async () => {
    const ctx = await createMockContext();
    const gameCenter1 = await createGameCenter(ctx, 1, {
      state: "IN_WALLET",
    });
    expect(gameCenter1.state).toBe("IN_WALLET");
    const gameCenter2 = await createGameCenter(ctx, 2, {
      state: "IN_WALLET",
    });
    expect(gameCenter2.state).toBe("IN_WALLET");
    const ret = await useCase.deposit(
      ctx,
      "hash",
      gameCenter1.id,
      gameCenter2.id,
    );
    for (const gameCenter of ret) {
      expect(gameCenter.state).toBe("MOVING_TO_AKIVERSE");
    }
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    const gameCenter1 = await createGameCenter(ctx, 1, {
      state: "IN_WALLET",
    });
    expect(gameCenter1.state).toBe("IN_WALLET");

    await expect(
      useCase.deposit(ctx, "hash", "404", gameCenter1.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
    const after = await prisma.gameCenter.findUniqueOrThrow({
      where: {
        id: gameCenter1.id,
      },
    });
    expect(after).toEqual(gameCenter1);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const gameCenter = await createGameCenter(ctx, 1, {
      userId: dummyUser.id,
    });
    await expect(
      useCase.deposit(ctx, "hash", gameCenter.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    const gameCenter = await createGameCenter(ctx, 1, {
      state: "MOVING_TO_WALLET",
    });
    await expect(
      useCase.deposit(ctx, "hash", gameCenter.id),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});
