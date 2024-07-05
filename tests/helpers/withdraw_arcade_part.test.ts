import { withdrawArcadeParts } from "../../src/helpers/withdraw";
import { eraseDatabase, createUser, createArcadePart } from "../test_helper";
import prisma from "../../src/prisma";

describe("withdrawArcadePart", () => {
  beforeEach(eraseDatabase);

  it("can withdraw", async () => {
    // User作成
    const user = await createUser();
    // AP作成
    let ap = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    // Userを含めたAPの再読み込み
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
      include: { user: true },
    });
    // Withdrawを実行
    const withdrawal = await withdrawArcadeParts(apWithUser);
    expect(withdrawal).toMatchObject([
      {
        nftType: "ARCADE_PART",
        state: "UNPROCESSED",
        tokenId: ap.id,
        userId: user.id,
        walletAddress: user.walletAddress,
      },
    ]);
    // APの再読み込みと確認
    ap = await prisma.arcadePart.findUniqueOrThrow({ where: { id: ap.id } });
    expect(ap).toMatchObject({ state: "MOVING_TO_WALLET" });
  });

  it("can withdraw without user", async () => {
    // AP作成
    let ap = await createArcadePart({ userId: null, ownerWalletAddress: "5" });
    // Userを含めたAPの再読み込み
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
      include: { user: true },
    });
    // Withdrawを実行
    const withdrawal = await withdrawArcadeParts(apWithUser);
    expect(withdrawal).toMatchObject([
      {
        nftType: "ARCADE_PART",
        state: "UNPROCESSED",
        tokenId: ap.id,
        userId: null,
        walletAddress: "5",
      },
    ]);
    // APの再読み込みと確認
    ap = await prisma.arcadePart.findUniqueOrThrow({ where: { id: ap.id } });
    expect(ap).toMatchObject({ state: "MOVING_TO_WALLET" });
  });

  it("cannot withdraw without a walletAddress", async () => {
    // User作成
    const user = await createUser({ walletAddress: null });
    // AP作成
    const ap = await createArcadePart({ userId: user.id });
    // Userを含めたAPの再読み込み
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawArcadeParts(apWithUser)).rejects.toThrow(
      "walletAddress is not set",
    );
  });

  it("cannot withdraw if not deposited", async () => {
    // User作成
    const user = await createUser();
    // AP作成
    const ap = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      state: "IN_WALLET",
    });
    // Userを含めたAPの再読み込み
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
      include: { user: true },
    });
    // Withdrawを実行
    await expect(withdrawArcadeParts(apWithUser)).rejects.toThrow(
      "IN_WALLETのNFT",
    );
  });

  it("cannot withdraw if information is out of date", async () => {
    // User作成
    const user = await createUser();
    // AP作成
    const ap = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    // Userを含めたAPの再読み込み
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
      include: { user: true },
    });
    // APを弄る
    await prisma.arcadePart.update({
      where: { id: ap.id },
      data: { subCategory: "new subcategory" },
    });
    // Withdrawを実行
    await expect(withdrawArcadeParts(apWithUser)).rejects.toThrow(
      "The data was updated during processing.",
    );
  });

  it("cannot withdraw if already crafted", async () => {
    // User作成
    const user = await createUser();
    // AP作成
    const ap = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });

    // APを弄る
    await prisma.arcadePart.update({
      where: { id: ap.id },
      data: { destroyedAt: new Date() },
    });
    // Userを含めたAPの再読み込み
    const apWithUser = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
      include: { user: true },
    });

    // Withdrawを実行
    await expect(withdrawArcadeParts(apWithUser)).rejects.toThrow("craft済み");
  });
});
