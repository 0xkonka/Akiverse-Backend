import { eraseDatabase } from "../test_helper";
import ArcadePartUseCaseImpl from "../../src/use_cases/arcade_part_usecase";
import { ArcadePart, ArcadePartCategory } from "@prisma/client";
import { Context } from "../../src/context";
import { createMockContext } from "../mock/context";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../src/use_cases/errors";
import prisma from "../../src/prisma";

const useCase = new ArcadePartUseCaseImpl();

async function createArcadePart(
  ctx: Context,
  extraData = {},
): Promise<ArcadePart> {
  return await ctx.prisma.arcadePart.create({
    data: {
      category: ArcadePartCategory.ROM,
      subCategory: "BUBBLE_ATTACK",
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      ...extraData,
    },
  });
}

describe("withdraw", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const arcadePart = await createArcadePart(ctx);
    expect(arcadePart.state).toBe("IN_AKIVERSE");
    const ret = await useCase.withdraw(ctx, arcadePart.id);
    expect(ret[0].id).toBe(arcadePart.id);
    expect(ret[0].state).toBe("MOVING_TO_WALLET");
  });
  test("success/multiple", async () => {
    const ctx = await createMockContext();
    const arcadePart1 = await createArcadePart(ctx);
    expect(arcadePart1.state).toBe("IN_AKIVERSE");
    const arcadePart2 = await createArcadePart(ctx);
    expect(arcadePart2.state).toBe("IN_AKIVERSE");
    const ret = await useCase.withdraw(ctx, arcadePart1.id, arcadePart2.id);
    for (const arcadePart of ret) {
      expect(arcadePart.state).toBe("MOVING_TO_WALLET");
    }
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    const arcadePart1 = await createArcadePart(ctx);
    expect(arcadePart1.state).toBe("IN_AKIVERSE");

    await expect(
      useCase.withdraw(ctx, "404", arcadePart1.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
    const after = await prisma.arcadePart.findUniqueOrThrow({
      where: {
        id: arcadePart1.id,
      },
    });
    expect(after).toEqual(arcadePart1);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const arcadePart = await createArcadePart(ctx, { userId: dummyUser.id });
    await expect(useCase.withdraw(ctx, arcadePart.id)).rejects.toThrowError(
      PermissionDeniedUseCaseError,
    );
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    const arcadePart = await createArcadePart(ctx, {
      state: "MOVING_TO_WALLET",
    });
    await expect(useCase.withdraw(ctx, arcadePart.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("already destroyed", async () => {
    const ctx = await createMockContext();
    const arcadePart = await createArcadePart(ctx, {
      destroyedAt: new Date(),
    });

    await expect(useCase.withdraw(ctx, arcadePart.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("disabled game should can't withdraw", async () => {
    const ctx = await createMockContext();
    const arcadePart = await createArcadePart(ctx, {
      subCategory: "CURVE_BALL_3D",
    });

    await expect(useCase.withdraw(ctx, arcadePart.id)).rejects.toThrowError(
      InvalidArgumentUseCaseError,
    );
  });
});

describe("deposit", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const arcadePart = await createArcadePart(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadePart.state).toBe("IN_WALLET");
    const ret = await useCase.deposit(ctx, "hash", arcadePart.id);
    expect(ret[0].state).toBe("MOVING_TO_AKIVERSE");
  });
  test("success/multiple", async () => {
    const ctx = await createMockContext();
    const arcadePart1 = await createArcadePart(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadePart1.state).toBe("IN_WALLET");
    const arcadePart2 = await createArcadePart(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadePart2.state).toBe("IN_WALLET");
    const ret = await useCase.deposit(
      ctx,
      "hash",
      arcadePart1.id,
      arcadePart2.id,
    );
    for (const arcadePart of ret) {
      expect(arcadePart.state).toBe("MOVING_TO_AKIVERSE");
    }
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    const arcadePart1 = await createArcadePart(ctx, {
      state: "IN_WALLET",
    });
    expect(arcadePart1.state).toBe("IN_WALLET");

    await expect(
      useCase.deposit(ctx, "hash", "404", arcadePart1.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
    const after = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: arcadePart1.id },
    });
    expect(after).toEqual(arcadePart1);
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy user",
        email: "dummy.user@test",
      },
    });
    const arcadePart = await createArcadePart(ctx, {
      userId: dummyUser.id,
    });
    await expect(
      useCase.deposit(ctx, "hash", arcadePart.id),
    ).rejects.toThrowError(PermissionDeniedUseCaseError);
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    const arcadePart = await createArcadePart(ctx, {
      state: "MOVING_TO_WALLET",
    });
    await expect(
      useCase.deposit(ctx, "hash", arcadePart.id),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});
