import {
  BlockState,
  CurrencyDeposit,
  CurrencyType,
  Deposit,
  DepositState,
  NftState,
  NftType,
  User,
} from "@prisma/client";
import {
  ArcadeMachineWithUser,
  ArcadePartWithUser,
  GameCenterWithUser,
} from "../models/nft";
import { validateItemOwner } from "./validate_item_owner";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../use_cases/errors";
import prisma, { PRISMA_NOT_FOUND_ERROR_CODE } from "../prisma";
import { Prisma } from "@prisma/client";
import { compareArrays, warn } from "../utils";
import {
  notifyAmDeposit,
  notifyApDeposit,
  notifyGcDeposit,
} from "./event_notification";

export async function depositGameCenter(
  gameCenter: GameCenterWithUser,
  hash: string,
) {
  return deposit({ ...gameCenter, hash }, NftType.GAME_CENTER);
}

export async function depositArcadeMachine(
  arcadeMachine: ArcadeMachineWithUser,
  hash: string,
) {
  return deposit({ ...arcadeMachine, hash }, NftType.ARCADE_MACHINE);
}

export async function depositArcadePart(
  arcadePart: ArcadePartWithUser,
  hash: string,
) {
  return deposit({ ...arcadePart, hash }, NftType.ARCADE_PART);
}

function getDao(nftType: NftType): any {
  if (nftType == NftType.ARCADE_MACHINE) return prisma.arcadeMachine;
  if (nftType == NftType.GAME_CENTER) return prisma.gameCenter;
  if (nftType == NftType.ARCADE_PART) return prisma.arcadePart;
  return undefined;
}

async function notify(nftType: NftType, tokenId: string): Promise<void> {
  if (nftType == NftType.ARCADE_MACHINE) return await notifyAmDeposit(tokenId);
  if (nftType == NftType.GAME_CENTER) return await notifyGcDeposit(tokenId);
  if (nftType == NftType.ARCADE_PART) return await notifyApDeposit(tokenId);
  return;
}

type DepositItem = {
  id: string;
  state: NftState;
  updatedAt: Date;
  user: { id: string; walletAddress: string | null } | null;
  userId: string | null;
  ownerWalletAddress: string | null;
  hash: string;
};

async function deposit(
  depositItem: DepositItem,
  nftType: NftType,
): Promise<Deposit> {
  const { id, state, updatedAt, hash } = depositItem;
  const { walletAddress, userId } = validateItemOwner(depositItem);
  if (state !== NftState.IN_WALLET) {
    throw new IllegalStateUseCaseError(`${state}のNFTをdepositできません。`);
  }
  try {
    const dao = getDao(nftType);
    await dao.update({
      where: { id, state, updatedAt },
      data: { state: NftState.MOVING_TO_AKIVERSE },
    });
    return prisma.deposit.create({
      data: {
        tokenId: id,
        nftType,
        userId,
        walletAddress,
        hash,
      },
    });
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === PRISMA_NOT_FOUND_ERROR_CODE) {
        throw new ConflictUseCaseError("update operation conflicted");
      }
    }
    throw e;
  }
}

export async function updateDepositState(
  nftType: NftType,
  tokenId: string,
  blockState: BlockState,
  hash: string,
  blockNumber: number,
  transactionIndex: number,
): Promise<void> {
  let state: DepositState;
  if (blockState === BlockState.INVALIDATED) {
    // Depositが失敗しているのでIN_WALLETにNFTのステータスを戻す
    state = DepositState.INVALIDATED;
    const dao = getDao(nftType);

    // NFTを更新すべきか判定する
    const item = await dao.findUnique({ where: { id: tokenId } });
    if (item !== null) {
      const comparison = compareArrays(
        [item.lastBlock, item.lastTransactionIndex],
        [blockNumber, transactionIndex],
      );
      // DBより新しいblockNumber/transactionIndexなので更新する
      // しかしながら、そのblockNumber/transactionIndexはInvalidatedなのでNFTには保存しない
      if (comparison < 0) {
        const { count } = await dao.updateMany({
          where: { id: tokenId, updatedAt: item.updatedAt },
          data: { state: NftState.IN_WALLET },
        });
        if (count === 0) {
          warn({
            msg: `${nftType}:${tokenId} had already been updated by others.state not updated.`,
          });
        } else {
          // NftのStateが更新されたので通知する
          await notify(nftType, tokenId);
        }
      }
    } else {
      warn({ msg: `Unrecognized ${nftType} with id ${tokenId}!` });
    }
  } else if (blockState === BlockState.CONFIRMED) {
    // deposit完了
    state = DepositState.CONFIRMED;
  } else {
    // deposit途中
    state = DepositState.PENDING;
  }
  await prisma.deposit.updateMany({
    data: { state: state },
    where: {
      nftType: nftType,
      tokenId: tokenId,
      hash: hash,
      state: { not: state }, //stateが変わる時だけ更新される
    },
  });
}

export async function depositAkv(
  user: User,
  hash: string,
  amount: Prisma.Decimal,
) {
  return currencyDeposit(user, CurrencyType.AKV, hash, amount);
}
async function currencyDeposit(
  user: User,
  currencyType: CurrencyType,
  hash: string,
  amount: Prisma.Decimal,
): Promise<CurrencyDeposit> {
  if (!user.walletAddress) {
    throw new IllegalStateUseCaseError("User.walletAddress is not set.");
  }
  if (amount.lessThanOrEqualTo(new Prisma.Decimal(0))) {
    throw new InvalidArgumentUseCaseError(
      "Amount must be a number greater than zero",
    );
  }
  return prisma.currencyDeposit.create({
    data: {
      userId: user.id,
      walletAddress: user.walletAddress!,
      hash: hash,
      amount: amount,
      currencyType: currencyType,
    },
  });
}
