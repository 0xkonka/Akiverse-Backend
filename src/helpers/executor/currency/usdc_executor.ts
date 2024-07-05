import { GetGasPriceFunc } from "../../executor";
import { Prisma, WithdrawalState, WithdrawalType } from "@prisma/client";
import { error, info } from "../../../utils";
import prisma from "../../../prisma";
import { ethers } from "ethers";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { USDC_DECIMAL_ALIGNMENT_FACTOR } from "../../../constants";

// ERC20のメソッドを羅列する
// が全てを書く必要はないので必要なもののみ列挙している
export const ERC20ContractAbi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

export class UsdcExecutor {
  getGasPriceFunction: GetGasPriceFunc;
  usdcSigner: ethers.Contract;
  decimals?: Prisma.Decimal;

  constructor(
    usdcSigner: ethers.Contract,
    getGasPriceFunction: GetGasPriceFunc,
  ) {
    this.getGasPriceFunction = getGasPriceFunction;
    this.usdcSigner = usdcSigner;
  }

  async getDecimals(): Promise<Prisma.Decimal> {
    if (this.decimals) {
      return this.decimals;
    }
    // 未設定だったらコントラクトから取得して返す
    const decimals = await this.usdcSigner.decimals();
    this.decimals = new Prisma.Decimal(10).pow(decimals);
    return this.decimals;
  }

  async withdraw(
    amount: Prisma.Decimal,
    walletAddress: string,
    currencyWithdrawalId: string,
  ) {
    const withdrawalType = WithdrawalType.TRANSFER;
    // transfer from signer
    info({ msg: "transferring USDC from locker" });
    // コインごとに少数の桁が違うのでここで調整する
    const formatedAmount = amount
      .div(USDC_DECIMAL_ALIGNMENT_FACTOR)
      .mul(await this.getDecimals());
    const gasPrice = await this.getGasPriceFunction();
    const response: TransactionResponse = await this.usdcSigner.transfer(
      walletAddress,
      formatedAmount.toFixed(),
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
        signerAddress: await this.usdcSigner.signer.getAddress(),
        response: JSON.stringify(
          response,
          Object.getOwnPropertyNames(response),
        ),
      },
    });
  }
}
