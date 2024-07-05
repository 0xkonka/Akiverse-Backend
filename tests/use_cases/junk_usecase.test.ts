import { eraseDatabase } from "../test_helper";
import { JunkUseCaseImpl } from "../../src/use_cases/junk_usecase";
import { createMockContext } from "../mock/context";
import { Context } from "../../src/context";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../src/use_cases/errors";

const useCase = new JunkUseCaseImpl();
describe("swap junks to arcade parts", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });

  async function createJunks(ctx: Context, amount: number = 10): Promise<void> {
    await ctx.prisma.junk.createMany({
      data: [
        {
          userId: ctx.userId!,
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          amount: amount,
        },
        {
          userId: ctx.userId!,
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: amount,
        },
        {
          userId: ctx.userId!,
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          amount: amount,
        },
        {
          userId: ctx.userId!,
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          amount: amount,
        },
      ],
    });
  }
  test("success", async () => {
    const ctx = await createMockContext();
    await createJunks(ctx);
    const rom = await useCase.swap(ctx, "ROM", "BUBBLE_ATTACK", 1);
    expect(rom).toHaveLength(1);
    expect(rom).toMatchObject([
      {
        userId: ctx.userId!,
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        usedJunks: 10,
      },
    ]);
    const acc = await useCase.swap(ctx, "ACCUMULATOR", "HOKUTO_100_LX", 1);
    expect(acc).toHaveLength(1);
    expect(acc).toMatchObject([
      {
        userId: ctx.userId!,
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        usedJunks: 10,
      },
    ]);
    const lc = await useCase.swap(ctx, "LOWER_CABINET", "PLAIN", 1);
    expect(lc).toHaveLength(1);
    expect(lc).toMatchObject([
      {
        userId: ctx.userId!,
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        usedJunks: 10,
      },
    ]);
    const uc = await useCase.swap(ctx, "UPPER_CABINET", "PLAIN", 1);
    expect(uc).toHaveLength(1);
    expect(uc).toMatchObject([
      {
        userId: ctx.userId!,
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        usedJunks: 10,
      },
    ]);
    const junks = await ctx.prisma.junk.findMany();
    expect(junks).toHaveLength(4);
    for (const junk of junks) {
      expect(junk.amount).toEqual(0);
    }
  });
  test("insufficient", async () => {
    const ctx = await createMockContext();
    await createJunks(ctx, 9);
    await expect(
      useCase.swap(ctx, "ROM", "BUBBLE_ATTACK", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    await expect(
      useCase.swap(ctx, "ACCUMULATOR", "HOKUTO_100_LX", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    await expect(
      useCase.swap(ctx, "LOWER_CABINET", "PLAIN", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    await expect(
      useCase.swap(ctx, "UPPER_CABINET", "PLAIN", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    const junks = await ctx.prisma.junk.findMany();
    for (const junk of junks) {
      expect(junk.amount).toEqual(9);
    }
  });
  test("no record", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.swap(ctx, "ROM", "BUBBLE_ATTACK", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    await expect(
      useCase.swap(ctx, "ACCUMULATOR", "HOKUTO_100_LX", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    await expect(
      useCase.swap(ctx, "LOWER_CABINET", "PLAIN", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    await expect(
      useCase.swap(ctx, "UPPER_CABINET", "PLAIN", 1),
    ).rejects.toThrowError(IllegalStateUseCaseError);
    const junks = await ctx.prisma.junk.findMany();
    for (const junk of junks) {
      expect(junk.amount).toEqual(9);
    }
  });
  test("unknown subCategory", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.swap(ctx, "UPPER_CABINET", "TEST", 1),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("conflict", async () => {
    const ctx = await createMockContext();
    await createJunks(ctx);
    const orgMethod = ctx.prisma.junk.findUnique;
    (ctx.prisma.junk.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const orgRet = await orgMethod(args);
        await ctx.prisma.junk.update({
          where: {
            userId_category_subCategory: {
              userId: ctx.userId!,
              category: "ROM",
              subCategory: "BUBBLE_ATTACK",
            },
          },
          data: {
            amount: 1,
          },
        });
        return orgRet;
      });
    await expect(
      useCase.swap(ctx, "ROM", "BUBBLE_ATTACK", 1),
    ).rejects.toThrowError(ConflictUseCaseError);
  });
  test("disabled game can't swap", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.junk.createMany({
      data: [
        {
          userId: ctx.userId!,
          category: "ROM",
          subCategory: "CURVE_BALL_3D",
          amount: 10,
        },
      ],
    });
    await expect(
      useCase.swap(ctx, "ROM", "CURVE_BALL_3D", 1),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
});
