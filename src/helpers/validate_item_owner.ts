import { IllegalStateUseCaseError } from "../use_cases/errors";
import { isWalletAddressEqual } from "../utils";

export type OwnedItem = {
  userId: string | null;
  ownerWalletAddress: string | null;
  user: { id: string; walletAddress: string | null } | null;
};

export type ValidatedUserInfo = {
  userId: string | null;
  walletAddress: string;
};

// withdraw/depositに必要な情報（ウォレットアドレス）の確認や、
// itemと関連のuserの情報が一致していることの確認を行います
export function validateItemOwner(item: OwnedItem): ValidatedUserInfo {
  const { userId, ownerWalletAddress, user } = item;
  if (user) {
    if (user.id != userId) {
      throw new IllegalStateUseCaseError(
        "User ID doesn't match userId of NFT.",
      );
    }
    if (!isWalletAddressEqual(user.walletAddress, ownerWalletAddress)) {
      throw new IllegalStateUseCaseError(
        "User.walletAddress does not match ownerWalletAddress of NFT",
      );
    }
  }
  if (userId && !user) {
    // UseCaseから呼ばれる場合にここにくることはない
    throw new IllegalStateUseCaseError("User is missing.");
  }
  if (!ownerWalletAddress) {
    throw new IllegalStateUseCaseError("User.walletAddress is not set.");
  }
  return { walletAddress: ownerWalletAddress, userId };
}
