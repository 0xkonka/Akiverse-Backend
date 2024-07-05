import {
  CurrencyWithdrawal,
  CurrencyType,
  NftType,
  Withdrawal,
  WithdrawalState,
} from "@prisma/client";
import prisma from "../prisma";

import {
  ArcadeMachine as ArcadeMachineContract,
  ArcadeParts as ArcadePartContract,
  GameCenter as GameCenterContract,
} from "@victgame/akiverse-nft-contracts/dist/types";
import { AkiverseLocker } from "@victgame/akiverse-deposit-withdraw-contracts";
import { BigNumber, ethers, Wallet } from "ethers";
import { info, error, warn } from "../utils";
import { ArcadeMachineExecutor } from "./executor/nft/arcade_machine_executor";
import { ArcadePartExecutor } from "./executor/nft/arcade_part_executor";
import { GameCenterExecutor } from "./executor/nft/game_center_executor";
import { AkirExecutor } from "./executor/currency/akir_executor";
import { AkvExecutor } from "./executor/currency/akv_executor";
import { UsdcExecutor } from "./executor/currency/usdc_executor";

export type HasWalletSigner = {
  signer: Wallet;
};

export type GetGasPriceFunc = () => Promise<BigNumber>;

export class Executor {
  arcadeMachineExecutor: ArcadeMachineExecutor;
  arcadePartExecutor: ArcadePartExecutor;
  gameCenterExecutor: GameCenterExecutor;
  akirExecutor: AkirExecutor;
  akvExecutor: AkvExecutor;
  usdcExecutor: UsdcExecutor;

  constructor(
    arcadeMachineContract: ArcadeMachineContract & HasWalletSigner,
    arcadePartContract: ArcadePartContract & HasWalletSigner,
    gameCenterContract: GameCenterContract & HasWalletSigner,
    akiverseLocker: AkiverseLocker & HasWalletSigner,
    usdcExecutor: ethers.Contract,
    getGasPriceFunction: GetGasPriceFunc,
  ) {
    this.arcadeMachineExecutor = new ArcadeMachineExecutor(
      arcadeMachineContract,
      akiverseLocker,
      getGasPriceFunction,
    );
    this.arcadePartExecutor = new ArcadePartExecutor(
      arcadePartContract,
      akiverseLocker,
      getGasPriceFunction,
    );
    this.gameCenterExecutor = new GameCenterExecutor(
      gameCenterContract,
      akiverseLocker,
      getGasPriceFunction,
    );
    this.akirExecutor = new AkirExecutor(akiverseLocker, getGasPriceFunction);
    this.akvExecutor = new AkvExecutor(akiverseLocker, getGasPriceFunction);
    this.usdcExecutor = new UsdcExecutor(usdcExecutor, getGasPriceFunction);
  }

  async executeWithdrawal(withdrawal: Withdrawal) {
    const { id, nftType, state, tokenId } = withdrawal;
    if (state !== WithdrawalState.UNPROCESSED) {
      throw new Error("Can only execute unprocessed withdrawals.");
    }
    if (nftType === NftType.ARCADE_MACHINE) {
      const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: tokenId },
        include: { user: true },
      });
      await this.arcadeMachineExecutor.withdraw(id, amWithUser);
    } else if (nftType === NftType.ARCADE_PART) {
      const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: tokenId },
        include: { user: true },
      });
      await this.arcadePartExecutor.withdraw(id, apWithUser);
    } else if (nftType === NftType.GAME_CENTER) {
      const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: tokenId },
        include: { user: true },
      });
      await this.gameCenterExecutor.withdraw(id, gcWithUser);
    } else {
      throw new Error(`Withdrawals for ${nftType} not yet implemented.`);
    }
  }

  async executeCurrencyWithdrawal(currencyWithdrawal: CurrencyWithdrawal) {
    const { amount, currencyType, id, state, walletAddress } =
      currencyWithdrawal;
    if (state !== WithdrawalState.UNPROCESSED) {
      throw new Error("Can only execute unprocessed withdrawals.");
    }
    if (!walletAddress) {
      throw new Error(`walletAddress missing for currencyWithdrawal ${id}`);
    }
    if (currencyType == CurrencyType.AKIR) {
      await this.akirExecutor.withdraw(amount, walletAddress, id);
    } else if (currencyType == CurrencyType.AKV) {
      await this.akvExecutor.withdraw(amount, walletAddress, id);
    } else if (currencyType == CurrencyType.USDC) {
      await this.usdcExecutor.withdraw(amount, walletAddress, id);
    } else {
      // TODO
      throw new Error(`Withdrawals for ${currencyType} not yet implemented.`);
    }
  }

  async executeWithdrawals() {
    info({ msg: "Checking for unprocessed (NFT) withdrawals..." });
    const withdrawals = await prisma.withdrawal.findMany({
      where: { state: WithdrawalState.UNPROCESSED },
    });
    for (const withdrawal of withdrawals) {
      info({ msg: `Withdrawing ${withdrawal.id}...` });
      try {
        await this.executeWithdrawal(withdrawal);
      } catch (e: unknown) {
        let errorMessage;

        if (e instanceof Error) {
          error({
            err: e.message,
            stack: e.stack,
          });
          errorMessage = e.message;
        } else {
          errorMessage = JSON.stringify(e, Object.getOwnPropertyNames(e));
          error({
            err: errorMessage,
          });
        }

        try {
          await prisma.withdrawal.update({
            where: { id: withdrawal.id },
            data: {
              state: WithdrawalState.ERROR,
              errorMessage: errorMessage,
            },
          });
          switch (withdrawal.nftType) {
            case NftType.ARCADE_MACHINE:
              await prisma.arcadeMachine.update({
                where: { id: withdrawal.tokenId },
                data: {
                  state: "IN_AKIVERSE",
                },
              });
              break;
            case NftType.ARCADE_PART:
              await prisma.arcadePart.update({
                where: { id: withdrawal.tokenId },
                data: {
                  state: "IN_AKIVERSE",
                },
              });
              break;
            case NftType.GAME_CENTER:
              await prisma.gameCenter.update({
                where: { id: withdrawal.tokenId },
                data: {
                  state: "IN_AKIVERSE",
                },
              });
              break;
          }
        } catch (e2) {
          error({
            msg: "withdrawal error handling failed",
            err: e2,
            nftType: withdrawal.nftType,
            tokenId: withdrawal.tokenId,
          });
        }
      }
    }
  }

  async executeCurrencyWithdrawals() {
    info({ msg: "Checking for unprocessed currency withdrawals..." });
    const currencyWithdrawals = await prisma.currencyWithdrawal.findMany({
      where: { state: WithdrawalState.UNPROCESSED },
    });
    for (const currencyWithdrawal of currencyWithdrawals) {
      info({ msg: `Withdrawing ${currencyWithdrawal.id}...` });
      try {
        await this.executeCurrencyWithdrawal(currencyWithdrawal);
      } catch (e: unknown) {
        // TODO
        warn({ error: e });
      }
    }
  }

  async poll() {
    await this.executeWithdrawals();
    await this.executeCurrencyWithdrawals();
  }
}
