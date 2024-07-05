import { User, WithdrawalState, WithdrawalType } from "@prisma/client";
import {
  BigNumber,
  BigNumberish,
  ContractTransaction,
  Overrides,
} from "ethers";
import { AKIVERSE_LOCKER_ADDRESS } from "../../../constants";
import { error, info, isWalletAddressEqual } from "../../../utils";
import prisma from "../../../prisma";
import { GetGasPriceFunc } from "../../executor";

type TokenWithUser = {
  id: string;
  ownerWalletAddress: string | null;
  physicalWalletAddress: string | null;
  user: User | null;
};
type WithdrawFunction = (
  to: string,
  id: BigNumberish,
  overrides?: Overrides & {
    from?: string | Promise<string>;
  },
) => Promise<ContractTransaction>;

export abstract class NftExecutor<T extends TokenWithUser> {
  withdrawFunction: WithdrawFunction;
  getGasPriceFunction: GetGasPriceFunc;
  lockerSignerAddress: string;
  mintSignerAddress: string;

  constructor(
    withdrawFunction: WithdrawFunction,
    getGasPriceFunction: GetGasPriceFunc,
    lockerSignerAddress: string,
    mintSignerAddress: string,
  ) {
    this.withdrawFunction = withdrawFunction;
    this.getGasPriceFunction = getGasPriceFunction;
    this.lockerSignerAddress = lockerSignerAddress;
    this.mintSignerAddress = mintSignerAddress;
  }

  async withdraw(withdrawalId: string, t: T) {
    await this.checkWalletAddress(t);
    let withdrawalType: WithdrawalType | null = null;
    let hash: string | null = null;
    let nonce: number | null = null;
    let response: ContractTransaction;
    let signerAddress: string | null = null;
    // walletAddressはisWalletAddressEqualを使って比較する必要があるが、ここはBC上のアドレスとアプリ起動時の環境変数設定との比較なので対応していない
    switch (t.physicalWalletAddress) {
      case AKIVERSE_LOCKER_ADDRESS:
        response = await this.transferFromLocker(t);
        ({ hash, nonce } = response);
        withdrawalType = WithdrawalType.TRANSFER;
        signerAddress = this.lockerSignerAddress;
        break;
      case null:
        response = await this.mint(t);
        ({ hash, nonce } = response);
        withdrawalType = WithdrawalType.MINT;
        signerAddress = this.mintSignerAddress;
        break;
      default:
        throw new Error(`Cannot withdraw from ${t.physicalWalletAddress}`);
    }
    // 1block承認されるのを待つ
    const receipt = await response.wait();
    if (receipt.status !== 1) {
      error({
        msg: `withdraw failed: ${withdrawalId}`,
        receipt: JSON.stringify(receipt),
      });
      throw new Error(`withdraw failed`);
    }

    await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        state: WithdrawalState.PENDING,
        type: withdrawalType,
        hash,
        nonce,
        signerAddress,
        response: JSON.stringify(
          response,
          Object.getOwnPropertyNames(response),
        ),
      },
    });
  }

  async checkWalletAddress(t: T) {
    const { user, ownerWalletAddress } = t;
    if (!ownerWalletAddress) {
      throw new Error("Cannot withdraw token without ownerWalletAddress.");
    }
    if (user) {
      if (!isWalletAddressEqual(user.walletAddress, ownerWalletAddress)) {
        throw new Error("Token Wallet Address does not match User");
      }
    } else {
      // Withdrawing to an unregistered account. This is permitted, but check
      // we're not in a bad state.
      const existingUser = await prisma.user.findUnique({
        where: { walletAddress: ownerWalletAddress },
      });
      if (existingUser) {
        throw new Error(
          "Token is associated to an existing user's wallet address, but userId is null.",
        );
      }
    }
  }

  async transferFromLocker(t: T): Promise<ContractTransaction> {
    info({ msg: "transferring token from locker" });
    const gasPrice = await this.getGasPriceFunction();
    const result = await this.withdrawFunction(
      t.ownerWalletAddress!,
      BigNumber.from(t.id),
      { gasPrice: gasPrice },
    );
    info(result);
    return result;
  }

  // 下記のメソッドはトランザクションのハッシュを返却する
  abstract mint(t: T): Promise<ContractTransaction>;
}
