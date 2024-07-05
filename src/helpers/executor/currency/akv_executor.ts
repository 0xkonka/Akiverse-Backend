import { AkiverseLocker } from "@victgame/akiverse-deposit-withdraw-contracts";
import { Prisma, WithdrawalState, WithdrawalType } from "@prisma/client";
import { error, info } from "../../../utils";
import { ContractTransaction } from "ethers";
import prisma from "../../../prisma";
import { GetGasPriceFunc, HasWalletSigner } from "../../executor";

export class AkvExecutor {
  akiverseLocker: AkiverseLocker & HasWalletSigner;
  getGasPriceFunction: GetGasPriceFunc;

  constructor(
    akiverseLocker: AkiverseLocker & HasWalletSigner,
    getGasPriceFunction: GetGasPriceFunc,
  ) {
    this.akiverseLocker = akiverseLocker;
    this.getGasPriceFunction = getGasPriceFunction;
  }

  async withdraw(
    amount: Prisma.Decimal,
    walletAddress: string,
    currencyWithdrawalId: string,
  ) {
    // TODO: refactor checkWalletAddress
    // await this.checkWalletAddress(t);
    const withdrawalType = WithdrawalType.TRANSFER;

    // transfer from locker
    info({ msg: "transferring AKV from locker" });
    const gasPrice = await this.getGasPriceFunction();
    const response: ContractTransaction = await this.akiverseLocker.withdrawAkv(
      walletAddress,
      amount.toFixed(),
      {
        gasPrice: gasPrice,
      },
    );
    info({ response });
    // 1block承認されるのを待つ
    const receipt = await response.wait();
    if (receipt.status !== 1) {
      error({
        msg: "Currency withdraw failed",
        id: currencyWithdrawalId,
        receipt: JSON.stringify(receipt),
      });
      throw new Error(`Currency withdraw failed`);
    }
    info({ msg: "updating currencyWithdrawal", id: currencyWithdrawalId });
    await prisma.currencyWithdrawal.update({
      where: { id: currencyWithdrawalId },
      data: {
        state: WithdrawalState.PENDING,
        type: withdrawalType,
        hash: response.hash,
        nonce: response.nonce,
        signerAddress: this.akiverseLocker.signer.address,
        response: JSON.stringify(
          response,
          Object.getOwnPropertyNames(response),
        ),
      },
    });
  }
}
