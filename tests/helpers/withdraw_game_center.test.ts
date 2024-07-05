import { User } from "@prisma/client";
import { withdrawGameCenters } from "../../src/helpers/withdraw";
import {
  eraseDatabase,
  createUser,
  createGameCenter,
  createArcadeMachine,
} from "../test_helper";
import prisma from "../../src/prisma";

describe("withdrawGameCenter", () => {
  beforeEach(eraseDatabase);

  it("can withdraw", async () => {
    // User作成
    const user = await createUser();
    // GC作成
    let gc = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // Withdrawを実行
    const withdrawal = await withdrawGameCenters(gcWithUser);
    expect(withdrawal).toMatchObject([
      {
        nftType: "GAME_CENTER",
        state: "UNPROCESSED",
        tokenId: gc.id,
        userId: user.id,
        walletAddress: user.walletAddress,
      },
    ]);
    // GCの再読み込みと確認
    gc = await prisma.gameCenter.findUniqueOrThrow({ where: { id: gc.id } });
    expect(gc).toMatchObject({ state: "MOVING_TO_WALLET" });
  });

  it("can withdraw without user", async () => {
    // GC作成
    let gc = await createGameCenter({ userId: null, ownerWalletAddress: "5" });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // Withdrawを実行
    const withdrawal = await withdrawGameCenters(gcWithUser);
    expect(withdrawal).toMatchObject([
      {
        nftType: "GAME_CENTER",
        state: "UNPROCESSED",
        tokenId: gc.id,
        userId: null,
        walletAddress: "5",
      },
    ]);
    // GCの再読み込みと確認
    gc = await prisma.gameCenter.findUniqueOrThrow({ where: { id: gc.id } });
    expect(gc).toMatchObject({ state: "MOVING_TO_WALLET" });
  });

  it("cannot withdraw without a walletAddress", async () => {
    // User作成
    const user = await createUser({ walletAddress: null });
    // GC作成
    const gc = await createGameCenter({ userId: user.id });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawGameCenters(gcWithUser)).rejects.toThrow(
      "walletAddress is not set",
    );
  });

  it("cannot withdraw if placement allowed", async () => {
    // User作成
    const user = await createUser();
    // GC作成
    const gc = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      placementAllowed: true,
    });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawGameCenters(gcWithUser)).rejects.toThrow("募集中");
  });

  it("cannot withdraw if hosting arcade machines", async () => {
    // User作成
    const user = await createUser();
    // GC作成
    const gc = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      state: "IN_AKIVERSE",
    });
    // AM作成
    await createArcadeMachine({ gameCenterId: gc.id });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawGameCenters(gcWithUser)).rejects.toThrow(
      "AMが設置されている",
    );
  });

  it("cannot withdraw if not deposited", async () => {
    // User作成
    const user = await createUser();
    // GC作成
    const gc = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      state: "IN_WALLET",
    });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawGameCenters(gcWithUser)).rejects.toThrow(
      "IN_WALLETのNFT",
    );
  });

  it("cannot withdraw if information is out of date", async () => {
    // User作成
    const user = await createUser();
    // GC作成
    const gc = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    // Userを含めたGCの再読み込み
    const gcWithUser = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gc.id },
      include: { user: true },
    });
    // GCを弄る
    await prisma.gameCenter.update({
      where: { id: gc.id },
      data: { name: "new name" },
    });
    // Withdrawを実行
    await expect(withdrawGameCenters(gcWithUser)).rejects.toThrow(
      "The data was updated during processing.",
    );
  });
});
