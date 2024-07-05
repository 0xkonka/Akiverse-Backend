import {
  BlockState,
  CurrencyType,
  NftState,
  NftType,
  User,
  Prisma,
  WithdrawalState,
  Withdrawal,
} from "@prisma/client";
import {
  ArcadeMachineWithUser,
  ArcadePartWithUser,
  GameCenterWithUser,
} from "../models/nft";
import prisma from "../prisma";
import { compareArrays, warn } from "../utils";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../use_cases/errors";
import { validateItemOwner } from "./validate_item_owner";

function getDao(nftType: NftType): any {
  if (nftType == NftType.ARCADE_MACHINE) return prisma.arcadeMachine;
  if (nftType == NftType.GAME_CENTER) return prisma.gameCenter;
  if (nftType == NftType.ARCADE_PART) return prisma.arcadePart;
  return undefined;
}

export async function withdrawGameCenters(
  ...gameCenters: GameCenterWithUser[]
) {
  for (const gameCenter of gameCenters) {
    const { id, state, placementAllowed } = gameCenter;
    validateItemOwner(gameCenter);
    if (state !== NftState.IN_AKIVERSE) {
      throw new IllegalStateUseCaseError(`${state}のNFTをwithdrawできません。`);
    }
    if (placementAllowed) {
      throw new IllegalStateUseCaseError("募集中のGCをwithdrawできません。");
    }
    // AM確認
    const am = await prisma.arcadeMachine.findFirst({
      where: { gameCenterId: id },
    });
    if (am) {
      throw new IllegalStateUseCaseError(
        "AMが設置されているGMをwithdrawできません。",
      );
    }
  }
  // 全部チェックOKならUpdate実行
  const queries = [];
  for (const gameCenter of gameCenters) {
    const {
      id,
      state,
      placementAllowed,
      updatedAt,
      ownerWalletAddress,
      userId,
    } = gameCenter;
    // 状態変更
    // 上記の確認を処理している間にGCが更新した場合に失敗
    queries.push(
      prisma.gameCenter.update({
        where: { id, placementAllowed, state, updatedAt },
        data: { state: NftState.MOVING_TO_WALLET },
      }),
    );

    // 状態変更が成功しましたので、別プロセスでwithdrawを処理する
    queries.push(
      prisma.withdrawal.create({
        data: {
          tokenId: id,
          nftType: NftType.GAME_CENTER,
          userId,
          walletAddress: ownerWalletAddress!,
        },
      }),
    );
  }
  try {
    const updated = await prisma.$transaction(queries);
    return updated.filter((v) => "tokenId" in v) as Withdrawal[];
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        //https://www.prisma.io/docs/orm/reference/error-reference#p2025
        throw new ConflictUseCaseError(
          "The data was updated during processing.",
        );
      }
    }
    throw e;
  }
}

export async function withdrawArcadeMachines(
  ...arcadeMachines: ArcadeMachineWithUser[]
) {
  for (const arcadeMachine of arcadeMachines) {
    // AM確認
    const { state, gameCenterId, position } = arcadeMachine;
    validateItemOwner(arcadeMachine);
    if (state !== NftState.IN_AKIVERSE) {
      throw new IllegalStateUseCaseError(`${state}のNFTをwithdrawできません。`);
    }
    if (gameCenterId || position !== null) {
      throw new IllegalStateUseCaseError(
        "Cannot withdraw Arcade Machine that is placed.",
      );
    }
  }
  const queries = [];
  // 全部チェックOKならUpdate実行
  for (const arcadeMachine of arcadeMachines) {
    const {
      id,
      state,
      gameCenterId,
      position,
      updatedAt,
      ownerWalletAddress,
      userId,
    } = arcadeMachine;
    queries.push(
      prisma.arcadeMachine.update({
        where: { id, gameCenterId, position, state, updatedAt },
        data: { state: NftState.MOVING_TO_WALLET },
      }),
    );
    queries.push(
      prisma.withdrawal.create({
        data: {
          tokenId: id,
          nftType: NftType.ARCADE_MACHINE,
          userId,
          walletAddress: ownerWalletAddress!,
        },
      }),
    );
  }
  try {
    const updated = await prisma.$transaction(queries);
    return updated.filter((v) => "tokenId" in v) as Withdrawal[];
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        //https://www.prisma.io/docs/orm/reference/error-reference#p2025
        throw new ConflictUseCaseError(
          "The data was updated during processing.",
        );
      }
    }
    throw e;
  }
}

export async function withdrawArcadeParts(
  ...arcadeParts: ArcadePartWithUser[]
) {
  for (const arcadePart of arcadeParts) {
    // AM確認
    const { state, destroyedAt } = arcadePart;
    validateItemOwner(arcadePart);
    if (state !== NftState.IN_AKIVERSE) {
      throw new IllegalStateUseCaseError(`${state}のNFTをwithdrawできません。`);
    }
    // 実際はuseCaseでもチェックされているが念のためここでもチェック実施
    if (destroyedAt !== null) {
      throw new IllegalStateUseCaseError(
        "craft済みのNFTをwithdrawできません。",
      );
    }
  }
  const queries = [];
  // 全部チェックOKならUpdate実行
  for (const arcadePart of arcadeParts) {
    const { id, state, updatedAt, destroyedAt, ownerWalletAddress, userId } =
      arcadePart;
    queries.push(
      prisma.arcadePart.update({
        where: { id, state, updatedAt, destroyedAt },
        data: { state: NftState.MOVING_TO_WALLET },
      }),
    );
    queries.push(
      prisma.withdrawal.create({
        data: {
          tokenId: id,
          nftType: NftType.ARCADE_PART,
          userId,
          walletAddress: ownerWalletAddress!,
        },
      }),
    );
  }
  try {
    const updated = await prisma.$transaction(queries);
    return updated.filter((v) => "tokenId" in v) as Withdrawal[];
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        //https://www.prisma.io/docs/orm/reference/error-reference#p2025
        throw new ConflictUseCaseError(
          "The data was updated during processing.",
        );
      }
    }
    throw e;
  }
}

export async function withdrawAkir(user: User, amount: Prisma.Decimal) {
  // validate wallet address
  if (!user.walletAddress) {
    throw new IllegalStateUseCaseError("User.walletAddress is not set.");
  }
  // amount確認
  if (amount.lessThanOrEqualTo(new Prisma.Decimal(0))) {
    throw new IllegalStateUseCaseError("Withdrawal amount must be positive.");
  }
  if (user.akirBalance.lessThan(amount)) {
    throw new IllegalStateUseCaseError(`AKIR${amount}を保有していません`);
  }

  // CurrencyWithdrawalの作成
  const [, currencyWithdrawal] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { akirBalance: { decrement: amount } },
    }),
    prisma.currencyWithdrawal.create({
      data: {
        userId: user.id,
        walletAddress: user.walletAddress,
        currencyType: CurrencyType.AKIR,
        amount,
      },
    }),
  ]);

  return currencyWithdrawal;
}

export async function withdrawAkv(user: User, amount: Prisma.Decimal) {
  // validate wallet address
  if (!user.walletAddress) {
    throw new IllegalStateUseCaseError("User.walletAddress is not set.");
  }
  // amount確認
  if (amount.lessThanOrEqualTo(new Prisma.Decimal(0))) {
    throw new InvalidArgumentUseCaseError(
      "Withdrawal amount must be positive.",
    );
  }
  if (user.akvBalance.lessThan(amount)) {
    throw new IllegalStateUseCaseError(`AKV${amount}を保有していません`);
  }

  // CurrencyWithdrawalの作成
  const [, currencyWithdrawal] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { akvBalance: { decrement: amount } },
    }),
    prisma.currencyWithdrawal.create({
      data: {
        userId: user.id,
        walletAddress: user.walletAddress,
        currencyType: CurrencyType.AKV,
        amount,
      },
    }),
  ]);

  return currencyWithdrawal;
}

export async function updateWithdrawalState(
  nftType: NftType,
  tokenId: string,
  blockState: BlockState,
  hash: string,
  blockNumber: number,
  transactionIndex: number,
) {
  let state: WithdrawalState;
  if (blockState === BlockState.INVALIDATED) {
    // Withdrawalが失敗しているのでIN_AKIVERSEにNFTのステータスを戻す
    state = WithdrawalState.ERROR;
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
        await dao.updateMany({
          where: { id: tokenId, updatedAt: item.updatedAt },
          data: { state: NftState.IN_AKIVERSE },
        });
      }
    } else {
      warn({ msg: `Unrecognized ${nftType} with id ${tokenId}!` });
    }
  } else if (blockState === BlockState.CONFIRMED) {
    // withdraw完了
    state = WithdrawalState.CONFIRMED;
  } else {
    // withdraw途中
    state = WithdrawalState.PENDING;
  }
  await prisma.withdrawal.updateMany({
    data: { state: state },
    where: {
      nftType: nftType,
      tokenId: tokenId,
      hash: hash,
      state: { not: state }, //stateが変わる時だけ更新される
    },
  });
}
