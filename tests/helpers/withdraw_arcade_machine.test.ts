import { User } from "@prisma/client";
import { withdrawArcadeMachines } from "../../src/helpers/withdraw";
import {
  eraseDatabase,
  createUser,
  createGameCenter,
  createArcadeMachine,
} from "../test_helper";
import prisma from "../../src/prisma";

describe("withdrawArcadeMachine", () => {
  beforeEach(eraseDatabase);

  it("can withdraw", async () => {
    // User作成
    const user = await createUser();
    // AM作成
    let am = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    // Userを含めたAMの再読み込み
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
      include: { user: true },
    });
    // Withdrawを実行
    const withdrawal = await withdrawArcadeMachines(amWithUser);
    expect(withdrawal).toMatchObject([
      {
        nftType: "ARCADE_MACHINE",
        state: "UNPROCESSED",
        tokenId: am.id,
        userId: user.id,
        walletAddress: user.walletAddress,
      },
    ]);
    // AMの再読み込みと確認
    am = await prisma.arcadeMachine.findUniqueOrThrow({ where: { id: am.id } });
    expect(am).toMatchObject({ state: "MOVING_TO_WALLET" });
  });

  it("can withdraw without user", async () => {
    // AM作成
    let am = await createArcadeMachine({
      userId: null,
      ownerWalletAddress: "5",
    });
    // Userを含めたAMの再読み込み
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
      include: { user: true },
    });
    // Withdrawを実行
    const withdrawal = await withdrawArcadeMachines(amWithUser);
    expect(withdrawal).toMatchObject([
      {
        nftType: "ARCADE_MACHINE",
        state: "UNPROCESSED",
        tokenId: am.id,
        userId: null,
        walletAddress: "5",
      },
    ]);
    // AMの再読み込みと確認
    am = await prisma.arcadeMachine.findUniqueOrThrow({ where: { id: am.id } });
    expect(am).toMatchObject({ state: "MOVING_TO_WALLET" });
  });

  it("cannot withdraw without a walletAddress", async () => {
    // User作成
    const user = await createUser({ walletAddress: null });
    // AM作成
    const am = await createArcadeMachine({ userId: user.id });
    // Userを含めたAMの再読み込み
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawArcadeMachines(amWithUser)).rejects.toThrow(
      "walletAddress is not set",
    );
  });

  it("cannot withdraw if placed in game center", async () => {
    // User作成
    const user = await createUser();
    // GC作成
    const gc = await createGameCenter({ userId: user.id });
    // AM作成
    const am = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      gameCenterId: gc.id,
      position: 1,
    });
    // Userを含めたAMの再読み込み
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawArcadeMachines(amWithUser)).rejects.toThrow("placed");
  });

  it("cannot withdraw if not deposited", async () => {
    // User作成
    const user = await createUser();
    // AM作成
    const am = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      state: "IN_WALLET",
    });
    // Userを含めたAMの再読み込み
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawArcadeMachines(amWithUser)).rejects.toThrow(
      "IN_WALLETのNFT",
    );
  });

  it("cannot withdraw if information is out of date", async () => {
    // User作成
    const user = await createUser();
    // AM作成
    const am = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    // Userを含めたAMの再読み込み
    const amWithUser = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
      include: { user: true },
    });
    // AMを弄る
    await prisma.arcadeMachine.update({
      where: { id: am.id },
      data: { energy: 100 },
    });
    // Withdrawを実行
    await expect(withdrawArcadeMachines(amWithUser)).rejects.toThrow(
      "The data was updated during processing.",
    );
  });
});
