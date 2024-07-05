import { ArcadeMachineWithUser, ArcadePartWithUser } from "../models/nft";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
} from "../use_cases/errors";
import { validateItemOwner } from "./validate_item_owner";
import prisma from "../prisma";
import { NftState, NftType } from "@prisma/client";

export async function burnArcadeMachine(arcadeMachine: ArcadeMachineWithUser) {
  // AM確認
  const { id, physicalWalletAddress, state, updatedAt, destroyedAt } =
    arcadeMachine;

  if (state !== NftState.IN_AKIVERSE) {
    throw new IllegalStateUseCaseError(
      `Cannot burn Arcade Machine that state is ${state}`,
    );
  }

  if (destroyedAt === null) {
    throw new IllegalStateUseCaseError(
      "Cannot burn Arcade Machine that is not dismantled",
    );
  }

  // validateItemOwnerでも判定しているが、そこまで到達しないケースがあるので別途やる
  if (arcadeMachine.userId !== arcadeMachine.user?.id) {
    throw new IllegalStateUseCaseError("user mismatch");
  }

  if (physicalWalletAddress === null) {
    // BC上に出ていないのでBurn処理不要
    await prisma.arcadeMachine.update({
      where: { id: id, updatedAt: updatedAt },
      data: {
        state: NftState.BURNED,
      },
    });
    return;
  }

  const { userId } = validateItemOwner(arcadeMachine);

  try {
    await prisma.arcadeMachine.update({
      where: {
        id: id,
        updatedAt: updatedAt,
      },
      data: {
        state: NftState.BURNING,
      },
    });
    return prisma.burn.create({
      data: {
        tokenId: id,
        nftType: NftType.ARCADE_MACHINE,
        userId,
      },
    });
  } catch (e) {
    throw new ConflictUseCaseError(
      "Could not Burn because Arcade Machine was updated during processing",
    );
  }
}

// TODO APのBurn処理呼び出し元未実装
export async function burnArcadePart(arcadePart: ArcadePartWithUser) {
  const { id, physicalWalletAddress, state, updatedAt, destroyedAt } =
    arcadePart;
  if (state !== NftState.IN_AKIVERSE) {
    throw new IllegalStateUseCaseError(
      `Cannot burn Arcade Machine that state is ${state}`,
    );
  }

  if (destroyedAt === null) {
    throw new IllegalStateUseCaseError(
      "Cannot burn Arcade Machine that is not dismantled",
    );
  }

  // validateItemOwnerでも判定しているが、そこまで到達しないケースがあるので別途やる
  if (arcadePart.userId !== arcadePart.user?.id) {
    throw new IllegalStateUseCaseError("user mismatch");
  }

  if (physicalWalletAddress === null) {
    // BC上に出ていないのでBurn処理不要
    await prisma.arcadePart.update({
      where: { id: id, updatedAt: updatedAt },
      data: {
        state: NftState.BURNED,
      },
    });
    return;
  }

  const { userId } = validateItemOwner(arcadePart);
  try {
    await prisma.arcadePart.update({
      where: {
        id: id,
        updatedAt: updatedAt,
      },
      data: {
        state: NftState.BURNING,
      },
    });
    return prisma.burn.create({
      data: {
        tokenId: id,
        nftType: NftType.ARCADE_PART,
        userId,
      },
    });
  } catch (e) {
    throw new ConflictUseCaseError(
      "Could not Burn because Arcade Machine was updated during processing",
    );
  }
}
