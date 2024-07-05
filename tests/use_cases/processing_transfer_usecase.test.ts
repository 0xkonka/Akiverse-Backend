import { eraseDatabase } from "../test_helper";
import { createMockContext } from "../mock/context";
import { ProcessingTransferUseCaseImpl } from "../../src/use_cases/processing_transfer_usecase";
import { Context } from "../../src/context";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "@prisma/client";

const useCase = new ProcessingTransferUseCaseImpl();
describe("check transfer use case list", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  async function createNftData(
    ctx: Context,
    state:
      | "MOVING_TO_AKIVERSE"
      | "MOVING_TO_WALLET"
      | "IN_WALLET"
      | "IN_AKIVERSE",
  ): Promise<void> {
    // GC
    await ctx.prisma.gameCenter.create({
      data: {
        id: uuidv4(),
        name: "test",
        area: "AKIHABARA",
        size: "LARGE",
        userId: ctx.userId,
        state: state,
        ownerWalletAddress: ctx.walletAddress,
        xCoordinate: 1,
        yCoordinate: 1,
      },
    });
    // AM
    await ctx.prisma.arcadeMachine.create({
      data: {
        userId: ctx.userId,
        ownerWalletAddress: ctx.walletAddress,
        state: state,
        accumulatorSubCategory: "HOKUTO_100_LX",
        maxEnergy: 100000,
        game: "BUBBLE_ATTACK",
      },
    });
    // AP
    await ctx.prisma.arcadePart.create({
      data: {
        userId: ctx.userId,
        ownerWalletAddress: ctx.walletAddress,
        state: state,
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
      },
    });
  }
  async function createFtData(
    ctx: Context,
    method: "TO_AKIVERSE" | "TO_WALLET",
    isProcessing: boolean,
  ): Promise<void> {
    if (method === "TO_AKIVERSE") {
      await ctx.prisma.currencyDeposit.create({
        data: {
          userId: ctx.userId!,
          walletAddress: ctx.walletAddress!,
          state: isProcessing ? "PENDING" : "CONFIRMED",
          hash: uuidv4(),
          currencyType: "AKV",
          amount: 10,
        },
      });
      await ctx.prisma.currencyDeposit.create({
        data: {
          userId: ctx.userId!,
          walletAddress: ctx.walletAddress!,
          state: isProcessing ? "PENDING" : "CONFIRMED",
          hash: uuidv4(),
          currencyType: "AKIR",
          amount: 10,
        },
      });
    } else {
      await ctx.prisma.currencyWithdrawal.create({
        data: {
          userId: ctx.userId!,
          walletAddress: ctx.walletAddress!,
          state: isProcessing ? "PENDING" : "CONFIRMED",
          hash: uuidv4(),
          currencyType: "AKV",
          amount: 10,
        },
      });
      await ctx.prisma.currencyWithdrawal.create({
        data: {
          userId: ctx.userId!,
          walletAddress: ctx.walletAddress!,
          state: isProcessing ? "PENDING" : "CONFIRMED",
          hash: uuidv4(),
          currencyType: "AKIR",
          amount: 10,
        },
      });
    }
  }
  test("no processing transfer", async () => {
    const ctx = await createMockContext();
    await createNftData(ctx, "IN_AKIVERSE");
    await createNftData(ctx, "IN_WALLET");
    await createFtData(ctx, "TO_AKIVERSE", false);
    await createFtData(ctx, "TO_WALLET", false);

    const ret = await useCase.list(ctx);
    expect(ret).toMatchObject({
      nft: {
        gameCenters: {
          deposits: [],
          withdraws: [],
        },
        arcadeMachines: {
          deposits: [],
          withdraws: [],
        },
        arcadeParts: {
          deposits: [],
          withdraws: [],
        },
      },
      ft: {
        akv: {
          deposits: [],
          withdraws: [],
        },
        akir: {
          deposits: [],
          withdraws: [],
        },
      },
    });
  });
  test("processing transfer", async () => {
    const ctx = await createMockContext();
    await createNftData(ctx, "IN_AKIVERSE");
    await createNftData(ctx, "MOVING_TO_WALLET");
    await createNftData(ctx, "IN_WALLET");
    await createNftData(ctx, "MOVING_TO_AKIVERSE");
    await createFtData(ctx, "TO_AKIVERSE", false);
    await createFtData(ctx, "TO_WALLET", false);
    await createFtData(ctx, "TO_AKIVERSE", true);
    await createFtData(ctx, "TO_WALLET", true);

    const ret = await useCase.list(ctx);
    expect(ret).toMatchObject({
      nft: {
        gameCenters: {
          deposits: [
            {
              name: "test",
            },
          ],
          withdraws: [
            {
              name: "test",
            },
          ],
        },
        arcadeMachines: {
          deposits: [
            {
              name: "Bubble Attack",
            },
          ],
          withdraws: [
            {
              name: "Bubble Attack",
            },
          ],
        },
        arcadeParts: {
          deposits: [
            {
              name: "Hokuto100LX Accumulator",
            },
          ],
          withdraws: [
            {
              name: "Hokuto100LX Accumulator",
            },
          ],
        },
      },
      ft: {
        akv: {
          deposits: [new Prisma.Decimal(10)],
          withdraws: [new Prisma.Decimal(10)],
        },
        akir: {
          deposits: [new Prisma.Decimal(10)],
          withdraws: [new Prisma.Decimal(10)],
        },
      },
    });
  });
});
