import {
  createArcadeMachine,
  createArcadePart,
  createGameCenter,
  createUser,
  eraseDatabase,
} from "../test_helper";
import prisma from "../../src/prisma";
import {
  depositArcadeMachine,
  depositArcadePart,
  depositGameCenter,
  updateDepositState,
} from "../../src/helpers/deposit";
import {
  BlockState,
  Deposit,
  DepositState,
  NftState,
  NftType,
} from "@prisma/client";
import { games } from "../../src/metadata/games";
import { warn } from "../../src/utils";
import { setTimeout } from "timers/promises";

describe("deposit", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  describe("arcadeMachine", () => {
    test("can deposit", async () => {
      const user = await createUser();
      const beforeArcadeMachine = await createArcadeMachine({
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
        state: "IN_WALLET",
      });
      const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: beforeArcadeMachine.id },
        include: { user: true },
      });

      const deposited = await depositArcadeMachine(amWithUser, "hash");
      expect(deposited).toMatchObject({
        nftType: "ARCADE_MACHINE",
        state: "UNPROCESSED",
        tokenId: beforeArcadeMachine.id,
        userId: user.id,
        walletAddress: user.walletAddress,
      });
      const afterArcadeMachine = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: beforeArcadeMachine.id },
      });
      expect(afterArcadeMachine).toMatchObject({ state: "MOVING_TO_AKIVERSE" });
    });
    test("can deposit without user", async () => {
      const beforeArcadeMachine = await createArcadeMachine({
        userId: null,
        ownerWalletAddress: "5",
        state: "IN_WALLET",
      });
      const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: beforeArcadeMachine.id },
        include: { user: true },
      });

      const deposited = await depositArcadeMachine(amWithUser, "hash");
      expect(deposited).toMatchObject({
        nftType: "ARCADE_MACHINE",
        state: "UNPROCESSED",
        tokenId: beforeArcadeMachine.id,
        userId: null,
        walletAddress: "5",
      });
      const afterArcadeMachine = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: beforeArcadeMachine.id },
      });
      expect(afterArcadeMachine).toMatchObject({ state: "MOVING_TO_AKIVERSE" });
    });
    test("cannot deposit without a walletAddress", async () => {
      const user = await createUser({ walletAddress: null });
      const am = await createArcadeMachine({ userId: user.id });
      const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: am.id },
        include: { user: true },
      });
      await expect(depositArcadeMachine(amWithUser, "hoge")).rejects.toThrow(
        "walletAddress is not set",
      );
    });
    test("cannot deposit if not withdrawal", async () => {
      const user = await createUser();
      const am = await createArcadeMachine({
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
      });
      const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: am.id },
        include: { user: true },
      });
      await expect(depositArcadeMachine(amWithUser, "hoge")).rejects.toThrow(
        "IN_AKIVERSEのNFTをdepositできません。",
      );
    });
    test("cannot deposit if information is out of date", async () => {
      const user = await createUser();
      const am = await createArcadeMachine({
        userId: user.id,
        state: "IN_WALLET",
        ownerWalletAddress: user.walletAddress,
      });
      const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: am.id },
        include: { user: true },
      });
      await setTimeout(10);
      await prisma.arcadeMachine.update({
        where: { id: am.id },
        data: { energy: 100 },
      });
      await expect(depositArcadeMachine(amWithUser, "hoge")).rejects.toThrow(
        "conflicted",
      );
    });
  });
  describe("arcadePart", () => {
    test("can deposit", async () => {
      const user = await createUser();
      const beforeArcadePart = await createArcadePart({
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
        state: "IN_WALLET",
      });
      const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: beforeArcadePart.id },
        include: { user: true },
      });

      const deposited = await depositArcadePart(apWithUser, "hash");
      expect(deposited).toMatchObject({
        nftType: "ARCADE_PART",
        state: "UNPROCESSED",
        tokenId: beforeArcadePart.id,
        userId: user.id,
        walletAddress: user.walletAddress,
      });
      const afterArcadePart = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: beforeArcadePart.id },
      });
      expect(afterArcadePart).toMatchObject({ state: "MOVING_TO_AKIVERSE" });
    });
    test("can deposit without user", async () => {
      const beforeArcadePart = await createArcadePart({
        userId: null,
        ownerWalletAddress: "5",
        state: "IN_WALLET",
      });
      const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: beforeArcadePart.id },
        include: { user: true },
      });

      const deposited = await depositArcadePart(apWithUser, "hash");
      expect(deposited).toMatchObject({
        nftType: "ARCADE_PART",
        state: "UNPROCESSED",
        tokenId: beforeArcadePart.id,
        userId: null,
        walletAddress: "5",
      });
      const afterArcadePart = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: beforeArcadePart.id },
      });
      expect(afterArcadePart).toMatchObject({ state: "MOVING_TO_AKIVERSE" });
    });
    test("cannot deposit without a walletAddress", async () => {
      const user = await createUser({ walletAddress: null });
      const ap = await createArcadePart({ userId: user.id });
      const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: ap.id },
        include: { user: true },
      });
      await expect(depositArcadePart(apWithUser, "hoge")).rejects.toThrow(
        "walletAddress is not set",
      );
    });
    test("cannot deposit if not withdrawal", async () => {
      const user = await createUser();
      const ap = await createArcadePart({
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
      });
      const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: ap.id },
        include: { user: true },
      });
      await expect(depositArcadePart(apWithUser, "hoge")).rejects.toThrow(
        "IN_AKIVERSEのNFTをdepositできません。",
      );
    });
    test("cannot deposit if information is out of date", async () => {
      const user = await createUser();
      const ap = await createArcadePart({
        userId: user.id,
        state: "IN_WALLET",
        ownerWalletAddress: user.walletAddress,
      });
      const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
        where: { id: ap.id },
        include: { user: true },
      });
      await setTimeout(10);
      await prisma.arcadePart.update({
        where: { id: ap.id },
        data: { destroyedAt: new Date() },
      });
      await expect(depositArcadePart(apWithUser, "hoge")).rejects.toThrow(
        "conflicted",
      );
    });
  });
  describe("gameCenter", () => {
    test("can deposit", async () => {
      const user = await createUser();
      const beforeGameCenter = await createGameCenter({
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
        state: "IN_WALLET",
      });
      const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: beforeGameCenter.id },
        include: { user: true },
      });

      const deposited = await depositGameCenter(gcWithUser, "hash");
      expect(deposited).toMatchObject({
        nftType: "GAME_CENTER",
        state: "UNPROCESSED",
        tokenId: beforeGameCenter.id,
        userId: user.id,
        walletAddress: user.walletAddress,
      });
      const afterGameCenter = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: beforeGameCenter.id },
      });
      expect(afterGameCenter).toMatchObject({ state: "MOVING_TO_AKIVERSE" });
    });
    test("can deposit without user", async () => {
      const beforeGameCenter = await createGameCenter({
        userId: null,
        ownerWalletAddress: "5",
        state: "IN_WALLET",
      });
      const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: beforeGameCenter.id },
        include: { user: true },
      });

      const deposited = await depositGameCenter(gcWithUser, "hash");
      expect(deposited).toMatchObject({
        nftType: "GAME_CENTER",
        state: "UNPROCESSED",
        tokenId: beforeGameCenter.id,
        userId: null,
        walletAddress: "5",
      });
      const afterGameCenter = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: beforeGameCenter.id },
      });
      expect(afterGameCenter).toMatchObject({ state: "MOVING_TO_AKIVERSE" });
    });
    test("cannot deposit without a walletAddress", async () => {
      const user = await createUser({ walletAddress: null });
      const gc = await createGameCenter({ userId: user.id });
      const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: gc.id },
        include: { user: true },
      });
      await expect(depositGameCenter(gcWithUser, "hoge")).rejects.toThrow(
        "walletAddress is not set",
      );
    });
    test("cannot deposit if not withdrawal", async () => {
      const user = await createUser();
      const gc = await createGameCenter({
        userId: user.id,
        ownerWalletAddress: user.walletAddress,
      });
      const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: gc.id },
        include: { user: true },
      });
      await expect(depositGameCenter(gcWithUser, "hoge")).rejects.toThrow(
        "IN_AKIVERSEのNFTをdepositできません。",
      );
    });
    test("cannot deposit if information is out of date", async () => {
      const user = await createUser();
      const gc = await createGameCenter({
        userId: user.id,
        state: "IN_WALLET",
        ownerWalletAddress: user.walletAddress,
      });
      const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
        where: { id: gc.id },
        include: { user: true },
      });
      await setTimeout(10);
      await prisma.gameCenter.update({
        where: { id: gc.id },
        data: { updatedAt: new Date() },
      });
      await expect(depositGameCenter(gcWithUser, "hoge")).rejects.toThrow(
        "conflicted",
      );
    });
  });
});

async function createDeposit(extraData = {}): Promise<Deposit> {
  return await prisma.deposit.create({
    data: {
      nftType: NftType.ARCADE_MACHINE,
      state: DepositState.UNPROCESSED,
      tokenId: "1",
      hash: "hash",
      ...extraData,
    },
  });
}
describe("updateDepositState", () => {
  beforeEach(async () => {
    await eraseDatabase();
    jest.resetAllMocks();
  });
  test("unprocessed to pending", async () => {
    const deposit = await createDeposit();
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.UNPROCESSED);
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.PENDING,
      deposit.hash!,
      1,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.PENDING);
  });
  test("pending to pending(not update)", async () => {
    const deposit = await createDeposit({ state: DepositState.PENDING });
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.PENDING);
    await setTimeout(10);
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.PENDING,
      deposit.hash!,
      1,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.PENDING);
    // 更新されていない
    expect(after.updatedAt).toEqual(deposit.updatedAt);
  });
  test("unprocessed to confirmed", async () => {
    const deposit = await createDeposit();
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.UNPROCESSED);
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.CONFIRMED,
      deposit.hash!,
      1,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.CONFIRMED);
  });
  test("pending to confirmed", async () => {
    const deposit = await createDeposit({ state: DepositState.PENDING });
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.PENDING);
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.CONFIRMED,
      deposit.hash!,
      1,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.CONFIRMED);
  });
  test("unprocessed to invalidated", async () => {
    const deposit = await createDeposit();
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.UNPROCESSED);
    await prisma.arcadeMachine.create({
      data: {
        id: deposit.tokenId,
        state: NftState.MOVING_TO_AKIVERSE,
        game: games.BUBBLE_ATTACK.id,
        lastBlock: 2,
        lastTransactionIndex: 2,
        accumulatorSubCategory: "HOKUTO_100_LX",
      },
    });
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.INVALIDATED,
      deposit.hash!,
      3,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.INVALIDATED);
    const am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: deposit.tokenId },
    });
    expect(am.state).toEqual(NftState.IN_WALLET);
  });
  test("unprocessed to invalidated. NFT is newer blockNumber and transactionIndex", async () => {
    const deposit = await createDeposit();
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.UNPROCESSED);
    const beforeAM = await prisma.arcadeMachine.create({
      data: {
        id: deposit.tokenId,
        state: NftState.MOVING_TO_AKIVERSE,
        game: games.BUBBLE_ATTACK.id,
        lastBlock: 2,
        lastTransactionIndex: 2,
        accumulatorSubCategory: "HOKUTO_100_LX",
      },
    });
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.INVALIDATED,
      deposit.hash!,
      1,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.INVALIDATED);
    const am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: deposit.tokenId },
    });
    // NFTは更新されていない
    expect(am).toEqual(beforeAM);
  });
  test("pending to invalidated", async () => {
    const deposit = await createDeposit({ state: DepositState.PENDING });
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.PENDING);
    await prisma.arcadeMachine.create({
      data: {
        id: deposit.tokenId,
        state: NftState.MOVING_TO_AKIVERSE,
        game: games.BUBBLE_ATTACK.id,
        lastBlock: 2,
        lastTransactionIndex: 2,
        accumulatorSubCategory: "HOKUTO_100_LX",
      },
    });
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.INVALIDATED,
      deposit.hash!,
      3,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.INVALIDATED);
    const am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: deposit.tokenId },
    });
    expect(am.state).toEqual(NftState.IN_WALLET);
  });
  test("invalidated error if NFT item not exists", async () => {
    (warn as jest.Mock) = jest.fn().mockImplementation(warn);
    const deposit = await createDeposit();
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.UNPROCESSED);
    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.INVALIDATED,
      deposit.hash!,
      3,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.INVALIDATED);
    // ログ出力チェック
    expect(warn).toHaveBeenCalledTimes(1);
  });
  test("NFT had already been updated by others", async () => {
    const deposit = await createDeposit({ state: DepositState.PENDING });
    const before = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(before.state).toEqual(DepositState.PENDING);
    await prisma.arcadeMachine.create({
      data: {
        id: deposit.tokenId,
        state: NftState.MOVING_TO_AKIVERSE,
        game: games.BUBBLE_ATTACK.id,
        lastBlock: 2,
        lastTransactionIndex: 2,
        accumulatorSubCategory: "HOKUTO_100_LX",
      },
    });

    (warn as jest.Mock) = jest.fn().mockImplementation(warn);
    const orgMethod = prisma.arcadeMachine.findUnique;
    (prisma.arcadeMachine.findUnique as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const before = await orgMethod(args);
        await setTimeout(10);
        await prisma.arcadeMachine.update({
          where: { id: deposit.tokenId },
          data: { maxEnergy: 100 },
        });
        return before;
      });

    await updateDepositState(
      deposit.nftType,
      deposit.tokenId,
      BlockState.INVALIDATED,
      deposit.hash!,
      3,
      1,
    );
    const after = await prisma.deposit.findUniqueOrThrow({
      where: { id: deposit.id },
    });
    expect(after.state).toEqual(DepositState.INVALIDATED);
    const am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: deposit.tokenId },
    });
    // 更新されていない
    expect(am.state).toEqual(NftState.MOVING_TO_AKIVERSE);
    // ログ出力チェック
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
