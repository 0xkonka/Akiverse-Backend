import { AKVUseCaseImpl } from "../../../src/use_cases/currencies/akv_usecase";
import { eraseDatabase } from "../../test_helper";
import { createMockContext } from "../../mock/context";
import { CurrencyType, Prisma } from "@prisma/client";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../../src/use_cases/errors";

const useCase = new AKVUseCaseImpl();

describe("deposit", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const countDeposit = await ctx.prisma.currencyDeposit.count();
    expect(beforeUser.akvBalance).toEqual(new Prisma.Decimal(0));
    expect(countDeposit).toEqual(0);
    await useCase.deposit(ctx, "successHash", new Prisma.Decimal(1));
    const afterDeposits = await ctx.prisma.currencyDeposit.findMany({});
    expect(afterDeposits).toHaveLength(1);
    expect(afterDeposits).toMatchObject([
      {
        userId: ctx.userId,
        currencyType: CurrencyType.AKV,
        amount: new Prisma.Decimal(1),
        hash: "successHash",
      },
    ]);
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    // deposit時はConfirmerがインクリメントするので変化していない
    expect(afterUser).toEqual(beforeUser);
  });
  test("wallet address not register user", async () => {
    const ctx = await createMockContext({ walletAddress: null });
    await expect(
      useCase.deposit(ctx, "successHash", new Prisma.Decimal(1)),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("amount less than zero", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.deposit(ctx, "successHash", new Prisma.Decimal(-1)),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("amount equal to zero", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.deposit(ctx, "successHash", new Prisma.Decimal(0)),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
});

describe("withdraw", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext({ akvBalance: new Prisma.Decimal(1) });
    const beforeUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    const countWithdraw = await ctx.prisma.currencyWithdrawal.count();
    expect(beforeUser.akvBalance).toEqual(new Prisma.Decimal(1));
    expect(countWithdraw).toEqual(0);
    await useCase.withdraw(ctx, new Prisma.Decimal(1));
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(0));
    const afterWithdraw = await ctx.prisma.currencyWithdrawal.findMany();
    expect(afterWithdraw).toHaveLength(1);
    expect(afterWithdraw).toMatchObject([
      {
        userId: ctx.userId,
        currencyType: CurrencyType.AKV,
        amount: new Prisma.Decimal(1),
      },
    ]);
  });
  test("amount less than zero", async () => {
    const ctx = await createMockContext({ akvBalance: new Prisma.Decimal(1) });
    await expect(
      useCase.withdraw(ctx, new Prisma.Decimal(-1)),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("amount equal to zero", async () => {
    const ctx = await createMockContext({ akvBalance: new Prisma.Decimal(1) });
    await expect(
      useCase.withdraw(ctx, new Prisma.Decimal(0)),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("wallet address not register user", async () => {
    const ctx = await createMockContext({ walletAddress: null });
    await expect(
      useCase.withdraw(ctx, new Prisma.Decimal(1)),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("Specify a quantity greater than the AKV held by the user", async () => {
    const ctx = await createMockContext({ akvBalance: new Prisma.Decimal(1) });
    await expect(
      useCase.withdraw(ctx, new Prisma.Decimal(2)),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
});
