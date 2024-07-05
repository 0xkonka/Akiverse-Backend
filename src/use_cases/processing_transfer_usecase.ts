import { Context } from "../context";
import {
  CurrencyType,
  DepositState,
  Prisma,
  WithdrawalState,
} from "@prisma/client";
import { InternalServerUseCaseError } from "./errors";
import { getArcadeMachineMetadata } from "../metadata/arcade-machines";
import { getArcadePartMetadata } from "../metadata/arcade-parts";
import { Service } from "typedi";

type ProcessingTransferNft = {
  id: string;
  name: string;
};

export type ProcessingNftTransfer = {
  deposits: ProcessingTransferNft[];
  withdraws: ProcessingTransferNft[];
};
export type ProcessingFtTransfer = {
  deposits: Prisma.Decimal[];
  withdraws: Prisma.Decimal[];
};

export type ProcessingTransfers = {
  nft: {
    gameCenters: ProcessingNftTransfer;
    arcadeMachines: ProcessingNftTransfer;
    arcadeParts: ProcessingNftTransfer;
  };
  ft: {
    akv: ProcessingFtTransfer;
    akir: ProcessingFtTransfer;
  };
};

export interface ProcessingTransferUseCase {
  list(ctx: Context): Promise<ProcessingTransfers>;
}

@Service("processingTransfer.useCase")
export class ProcessingTransferUseCaseImpl
  implements ProcessingTransferUseCase
{
  async list(ctx: Context): Promise<ProcessingTransfers> {
    if (!ctx.userId) {
      throw new InternalServerUseCaseError("not authorized");
    }

    // NFT系はDeposit/Withdrawテーブルから取得することも可能なのだが、nameの取得が煩雑になるので別のテーブルからそれぞれ取得する
    // GC
    const gameCenters = await ctx.prisma.gameCenter.findMany({
      where: {
        userId: ctx.userId,
        state: {
          in: ["MOVING_TO_AKIVERSE", "MOVING_TO_WALLET"],
        },
      },
    });
    const gcDeposits: ProcessingTransferNft[] = [];
    const gcWithdraws: ProcessingTransferNft[] = [];
    for (const gameCenter of gameCenters) {
      if (gameCenter.state === "MOVING_TO_WALLET") {
        // Withdraw
        gcWithdraws.push({
          id: gameCenter.id,
          name: gameCenter.name,
        });
      } else {
        // Deposit
        gcDeposits.push({
          id: gameCenter.id,
          name: gameCenter.name,
        });
      }
    }

    // AM
    const arcadeMachines = await ctx.prisma.arcadeMachine.findMany({
      where: {
        userId: ctx.userId,
        state: {
          in: ["MOVING_TO_AKIVERSE", "MOVING_TO_WALLET"],
        },
      },
    });
    const amDeposits: ProcessingTransferNft[] = [];
    const amWithdraws: ProcessingTransferNft[] = [];
    for (const arcadeMachine of arcadeMachines) {
      const { name } = getArcadeMachineMetadata(arcadeMachine.game);
      if (arcadeMachine.state === "MOVING_TO_WALLET") {
        // Withdraw
        amWithdraws.push({
          id: arcadeMachine.id,
          name: name!,
        });
      } else {
        // Deposit
        amDeposits.push({
          id: arcadeMachine.id,
          name: name!,
        });
      }
    }

    // AP
    const arcadeParts = await ctx.prisma.arcadePart.findMany({
      where: {
        userId: ctx.userId,
        state: {
          in: ["MOVING_TO_AKIVERSE", "MOVING_TO_WALLET"],
        },
      },
    });
    const apDeposits: ProcessingTransferNft[] = [];
    const apWithdraws: ProcessingTransferNft[] = [];
    for (const arcadePart of arcadeParts) {
      const { name } = getArcadePartMetadata(
        arcadePart.category,
        arcadePart.subCategory,
      );
      if (arcadePart.state === "MOVING_TO_WALLET") {
        // Withdraw
        apWithdraws.push({
          id: arcadePart.id,
          name: name!,
        });
      } else {
        // Deposit
        apDeposits.push({
          id: arcadePart.id,
          name: name!,
        });
      }
    }

    // FT系はCurrencyDeposit/CurrencyWithdrawテーブルからしか進捗を取得できないのでこちらから
    const ftDeposits = await ctx.prisma.currencyDeposit.findMany({
      where: {
        userId: ctx.userId,
        state: {
          in: [DepositState.UNPROCESSED, DepositState.PENDING],
        },
      },
    });
    const akvDeposits: Prisma.Decimal[] = [];
    const akirDeposits: Prisma.Decimal[] = [];
    for (const ftDeposit of ftDeposits) {
      if (ftDeposit.currencyType === CurrencyType.AKV) {
        // AKV
        akvDeposits.push(ftDeposit.amount);
      } else {
        // AKIR
        akirDeposits.push(ftDeposit.amount);
      }
    }

    const ftWithdrawals = await ctx.prisma.currencyWithdrawal.findMany({
      where: {
        userId: ctx.userId,
        state: {
          in: [WithdrawalState.UNPROCESSED, WithdrawalState.PENDING],
        },
      },
    });
    const akvWithdraws: Prisma.Decimal[] = [];
    const akirWithdraws: Prisma.Decimal[] = [];
    for (const ftWithdrawal of ftWithdrawals) {
      if (ftWithdrawal.currencyType === CurrencyType.AKV) {
        // AKV
        akvWithdraws.push(ftWithdrawal.amount);
      } else {
        // AKIR
        akirWithdraws.push(ftWithdrawal.amount);
      }
    }

    return {
      nft: {
        gameCenters: {
          deposits: gcDeposits,
          withdraws: gcWithdraws,
        },
        arcadeMachines: {
          deposits: amDeposits,
          withdraws: amWithdraws,
        },
        arcadeParts: {
          deposits: apDeposits,
          withdraws: apWithdraws,
        },
      },
      ft: {
        akv: {
          deposits: akvDeposits,
          withdraws: akvWithdraws,
        },
        akir: {
          deposits: akirDeposits,
          withdraws: akirWithdraws,
        },
      },
    };
  }
}
