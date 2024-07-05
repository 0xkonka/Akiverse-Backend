import Moralis from "moralis";
import { WalletAddressUseCaseImpl } from "../../src/use_cases/wallet_address_usecase";
import { createUser, eraseDatabase } from "../test_helper";

import { Context } from "../../src/context";
import prisma from "../../src/prisma";
import { ArcadePartCategory, MoralisSession } from "@prisma/client";
import { games } from "../../src/metadata/games";
import {
  ConflictUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../src/use_cases/errors";
import { createMockContext, createMockFirebaseContext } from "../mock/context";
import { QuestProgressChecker } from "../../src/helpers/quests";
import { setUserClaims } from "../../src/helpers/firebase_auth";

const useCase = new WalletAddressUseCaseImpl(new QuestProgressChecker());
const orgMoralisAuthVerify = Moralis.Auth.verify;

async function createDummyMoralisSession(): Promise<MoralisSession> {
  return await prisma.moralisSession.create({
    data: {
      challengeId: "dummy_id",
      message: "dummy_message",
      nonce: "dummy_nonce",
      version: "dummy_version",
      profileId: "dummy_profile_id",
      walletAddress: "dummy_wallet_address",
      network: "dummy_network",
      chain: "dummy_chain",
      tokenHash: "dummy_token_hash",
      expiresAt: new Date(),
    },
  });
}

describe("register", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  test("success/no nft", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    const ctx = await createMockContext({ walletAddress: null });
    expect(ctx.walletAddress).toBeUndefined();
    const ret = await useCase.register(ctx, dummySession.message, "sig");
    expect(ret.walletAddress).toEqual(dummySession.walletAddress);
  });
  test("success/has nft", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    const ctx = await createMockContext({ walletAddress: null });
    const game = games.BUBBLE_ATTACK.id;
    await prisma.arcadePart.create({
      data: {
        category: ArcadePartCategory.ROM,
        subCategory: game,
        ownerWalletAddress: dummySession.walletAddress,
      },
    });
    await prisma.arcadeMachine.create({
      data: {
        game: game,
        ownerWalletAddress: dummySession.walletAddress,
        accumulatorSubCategory: "HOKUTO_100_LX",
      },
    });
    await prisma.gameCenter.create({
      data: {
        id: "dummy",
        area: "AKIHABARA",
        size: "SMALL",
        xCoordinate: 1,
        yCoordinate: 1,
        name: "dummy",
        ownerWalletAddress: dummySession.walletAddress,
      },
    });
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        arcadeParts: true,
        arcadeMachines: true,
        gameCenters: true,
      },
    });
    // はじめはNFTを持っていない
    expect(before.gameCenters).toHaveLength(0);
    expect(before.arcadeMachines).toHaveLength(0);
    expect(before.arcadeParts).toHaveLength(0);

    const ret = await useCase.register(ctx, dummySession.message, "sig");
    expect(ret.walletAddress).toEqual(dummySession.walletAddress);
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        arcadeParts: true,
        arcadeMachines: true,
        gameCenters: true,
      },
    });
    // 処理後はNFTを保有している状態になる
    expect(after.gameCenters).toHaveLength(1);
    expect(after.arcadeMachines).toHaveLength(1);
    expect(after.arcadeParts).toHaveLength(1);
  });
  test("success/has nft but state of IN_AKIVERSE", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    const ctx = await createMockContext({ walletAddress: null });
    const game = games.BUBBLE_ATTACK.id;
    await prisma.arcadePart.create({
      data: {
        userId: ctx.userId,
        category: ArcadePartCategory.ROM,
        subCategory: game,
      },
    });
    await prisma.arcadeMachine.create({
      data: {
        userId: ctx.userId,
        game: game,
        accumulatorSubCategory: "HOKUTO_100_LX",
      },
    });
    await prisma.gameCenter.create({
      data: {
        userId: ctx.userId,
        id: "dummy",
        area: "AKIHABARA",
        size: "SMALL",
        xCoordinate: 1,
        yCoordinate: 1,
        name: "dummy",
      },
    });
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        arcadeParts: true,
        arcadeMachines: true,
        gameCenters: true,
      },
    });
    // はじめからNFTは持っている
    expect(before.gameCenters).toHaveLength(1);
    expect(before.arcadeMachines).toHaveLength(1);
    expect(before.arcadeParts).toHaveLength(1);
    // すべてUserIdは入っているがwalletAddressはないこと
    expect([
      before.gameCenters[0],
      before.arcadeMachines[0],
      before.arcadeParts[0],
    ]).toMatchObject([
      {
        userId: ctx.userId,
        ownerWalletAddress: null,
      },
      {
        userId: ctx.userId,
        ownerWalletAddress: null,
      },
      {
        userId: ctx.userId,
        ownerWalletAddress: null,
      },
    ]);
    const ret = await useCase.register(ctx, dummySession.message, "sig");
    expect(ret.walletAddress).toEqual(dummySession.walletAddress);
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
      select: {
        arcadeParts: true,
        arcadeMachines: true,
        gameCenters: true,
      },
    });
    // 処理後もNFTは保有している
    expect(after.gameCenters).toHaveLength(1);
    expect(after.arcadeMachines).toHaveLength(1);
    expect(after.arcadeParts).toHaveLength(1);
    // すべてのownerWalletAddressに値がセットされている
    expect([
      after.gameCenters[0],
      after.arcadeMachines[0],
      after.arcadeParts[0],
    ]).toMatchObject([
      {
        userId: ctx.userId,
        ownerWalletAddress: dummySession.walletAddress,
      },
      {
        userId: ctx.userId,
        ownerWalletAddress: dummySession.walletAddress,
      },
      {
        userId: ctx.userId,
        ownerWalletAddress: dummySession.walletAddress,
      },
    ]);
  });
  test("same wallet address user exists", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    const ctx = await createMockContext({ walletAddress: null });
    expect(ctx.walletAddress).toBeUndefined();
    await createUser({
      walletAddress: dummySession.walletAddress,
    });
    await expect(
      useCase.register(ctx, dummySession.message, "sig"),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("update conflicted(unique constraint error)", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    const ctx = await createMockContext({ walletAddress: null });
    expect(ctx.walletAddress).toBeUndefined();
    await createUser({
      walletAddress: dummySession.walletAddress,
    });
    (ctx.prisma.user.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(() => {
        return null;
      });
    await expect(
      useCase.register(ctx, dummySession.message, "sig"),
    ).rejects.toThrowError(ConflictUseCaseError);
  });
  test("update conflicted(user not found)", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    const ctx = await createMockContext({ walletAddress: null });
    expect(ctx.walletAddress).toBeUndefined();
    (ctx.prisma.user.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(async () => {
        await prisma.user.update({
          where: { id: ctx.userId },
          data: { walletAddress: "updated" },
        });
        return null;
      });
    await expect(
      useCase.register(ctx, dummySession.message, "sig"),
    ).rejects.toThrowError(ConflictUseCaseError);
  });
  test("success/firebase login", async () => {
    const dummySession = await createDummyMoralisSession();
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: dummySession.challengeId,
        version: dummySession.version,
        nonce: dummySession.nonce,
      },
    });
    (setUserClaims as jest.Mock) = jest.fn().mockReturnValue(null);
    const ctx = await createMockFirebaseContext({ walletAddress: null });
    expect(ctx.walletAddress).toBeUndefined();
    const ret = await useCase.register(ctx, dummySession.message, "sig");
    expect(ret.walletAddress).toEqual(dummySession.walletAddress);
    expect(setUserClaims).toHaveBeenCalledTimes(1);
  });
});
