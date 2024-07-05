import { NftState, WithdrawalState } from "@prisma/client";
import prisma from "../../src/prisma";
import { Executor, HasWalletSigner } from "../../src/helpers/executor";
import {
  withdrawArcadeMachines,
  withdrawArcadeParts,
  withdrawGameCenters,
} from "../../src/helpers/withdraw";
import {
  createArcadeMachine,
  createArcadePart,
  createGameCenter,
  createUser,
  eraseDatabase,
} from "../test_helper";
import { mock } from "jest-mock-extended";
import {
  ArcadeMachine as ArcadeMachineContract,
  ArcadeParts as ArcadePartContract,
  GameCenter as GameCenterContract,
} from "@victgame/akiverse-nft-contracts/dist/types";
import { AkiverseLocker } from "@victgame/akiverse-deposit-withdraw-contracts";
import {
  BigNumber,
  ContractReceipt,
  ContractTransaction,
  ethers,
  utils,
} from "ethers";
import { AKIVERSE_LOCKER_ADDRESS } from "../../src/constants";

const GAS_PRICE = utils.parseUnits("100", "gwei");

async function getGasPriceMock(): Promise<BigNumber> {
  return GAS_PRICE;
}

function createExecutor(
  extraData: {
    arcadeMachineContract?: ArcadeMachineContract & HasWalletSigner;
    arcadePartContract?: ArcadePartContract & HasWalletSigner;
    gameCenterContract?: GameCenterContract & HasWalletSigner;
    akiverseLocker?: AkiverseLocker & HasWalletSigner;
  } = {},
): Executor {
  return new Executor(
    extraData.arcadeMachineContract ||
      mock<ArcadeMachineContract & HasWalletSigner>(),
    extraData.arcadePartContract ||
      mock<ArcadePartContract & HasWalletSigner>(),
    extraData.gameCenterContract ||
      mock<GameCenterContract & HasWalletSigner>(),
    extraData.akiverseLocker || mock<AkiverseLocker & HasWalletSigner>(),
    mock<ethers.Contract>(),
    getGasPriceMock,
  );
}

function mockTransaction(): ContractTransaction {
  const contractTransaction = mock<ContractTransaction>();
  contractTransaction.hash = "transaction hash";
  contractTransaction.nonce = 1;

  const contractReceipt = mock<ContractReceipt>();
  contractReceipt.status = 1;
  contractTransaction.wait.mockReturnValue(Promise.resolve(contractReceipt));
  return contractTransaction;
}

describe("Executor", () => {
  beforeEach(eraseDatabase);

  it("AMをmintできる", async () => {
    // AKIVERSE内のAMを作成
    const user = await createUser();
    const arcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: null,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawArcadeMachines({ ...arcadeMachine, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    // Executorを作成
    const arcadeMachineContract = mock<
      ArcadeMachineContract & HasWalletSigner
    >();
    arcadeMachineContract.mintToken.mockReturnValue(
      Promise.resolve(mockTransaction()),
    );

    const executor = createExecutor({ arcadeMachineContract });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(arcadeMachineContract.mintToken).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(arcadeMachine.id),
      arcadeMachine.id + ".json",
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはPENDINGになる (watcher/confirmer待ち)
    expect(updatedWithdrawal.state).toBe(WithdrawalState.PENDING);
    expect(updatedWithdrawal.hash).toBe("transaction hash");
  });

  it("AkiverseLockerからAMをtransferできる", async () => {
    // AKIVERSE内のAMを作成
    const user = await createUser();
    const arcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: AKIVERSE_LOCKER_ADDRESS,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawArcadeMachines({ ...arcadeMachine, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    // Executorを作成
    const akiverseLocker = mock<AkiverseLocker & HasWalletSigner>();
    akiverseLocker.withdrawArcadeMachine.mockReturnValue(
      Promise.resolve(mockTransaction()),
    );
    const executor = createExecutor({ akiverseLocker });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(akiverseLocker.withdrawArcadeMachine).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(arcadeMachine.id),
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはPENDINGになる (watcher/confirmer待ち)
    expect(updatedWithdrawal.state).toBe(WithdrawalState.PENDING);
    expect(updatedWithdrawal.hash).toBe("transaction hash");
  });

  it("APをmintできる", async () => {
    // AKIVERSE内のAPを作成
    const user = await createUser();
    const arcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: null,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawArcadeParts({ ...arcadePart, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    // Executorを作成
    const arcadePartContract = mock<ArcadePartContract & HasWalletSigner>();
    arcadePartContract.mintToken.mockReturnValue(
      Promise.resolve(mockTransaction()),
    );
    const executor = createExecutor({ arcadePartContract });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(arcadePartContract.mintToken).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(arcadePart.id),
      arcadePart.id + ".json",
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはPENDINGになる (watcher/confirmer待ち)
    expect(updatedWithdrawal.state).toBe(WithdrawalState.PENDING);
    expect(updatedWithdrawal.hash).toBe("transaction hash");
  });

  it("AkiverseLockerからAPをtransferできる", async () => {
    // AKIVERSE内のAPを作成
    const user = await createUser();
    const arcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: AKIVERSE_LOCKER_ADDRESS,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawArcadeParts({ ...arcadePart, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    // Executorを作成
    const akiverseLocker = mock<AkiverseLocker & HasWalletSigner>();
    akiverseLocker.withdrawArcadeParts.mockReturnValue(
      Promise.resolve(mockTransaction()),
    );
    const executor = createExecutor({ akiverseLocker });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(akiverseLocker.withdrawArcadeParts).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(arcadePart.id),
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはPENDINGになる (watcher/confirmer待ち)
    expect(updatedWithdrawal.state).toBe(WithdrawalState.PENDING);
    expect(updatedWithdrawal.hash).toBe("transaction hash");
  });

  it("AkiverseLockerからGCをtransferできる", async () => {
    // AKIVERSE内のGCを作成
    const user = await createUser();
    const gameCenter = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: AKIVERSE_LOCKER_ADDRESS,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawGameCenters({ ...gameCenter, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    // Executorを作成
    const akiverseLocker = mock<AkiverseLocker & HasWalletSigner>();
    akiverseLocker.withdrawGameCenter.mockReturnValue(
      Promise.resolve(mockTransaction()),
    );
    const executor = createExecutor({ akiverseLocker });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(akiverseLocker.withdrawGameCenter).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(gameCenter.id),
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはPENDINGになる (watcher/confirmer待ち)
    expect(updatedWithdrawal.state).toBe(WithdrawalState.PENDING);
    expect(updatedWithdrawal.hash).toBe("transaction hash");
  });
  it("withdraw中にエラーが発生してエラーメッセージが残る", async () => {
    // AKIVERSE内のGCを作成
    const user = await createUser();
    const gameCenter = await createGameCenter({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: AKIVERSE_LOCKER_ADDRESS,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawGameCenters({ ...gameCenter, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    const beforeGameCenter = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gameCenter.id },
    });
    expect(beforeGameCenter.state).toEqual("MOVING_TO_WALLET");
    // Executorを作成
    const akiverseLocker = mock<AkiverseLocker & HasWalletSigner>();
    akiverseLocker.withdrawGameCenter.mockRejectedValue(
      new Error("mock rejected"),
    );
    const executor = createExecutor({ akiverseLocker });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(akiverseLocker.withdrawGameCenter).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(gameCenter.id),
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはERRORになる
    expect(updatedWithdrawal.state).toBe(WithdrawalState.ERROR);
    expect(updatedWithdrawal.errorMessage).toBe("mock rejected");
    expect(updatedWithdrawal.hash).toBeNull();
    // 処理対象だったGCはIN_AKIVERSEに戻る
    const afterGameCenter = await prisma.gameCenter.findUniqueOrThrow({
      where: { id: gameCenter.id },
    });
    expect(afterGameCenter.state).toEqual("IN_AKIVERSE");
  });
  it("withdraw中にエラーが発生してエラーメッセージが残る(非Errorインスタンスがスローされた場合)", async () => {
    // AKIVERSE内のGCを作成
    const user = await createUser();
    const arcadeMachine = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      physicalWalletAddress: AKIVERSE_LOCKER_ADDRESS,
      state: NftState.IN_AKIVERSE,
    });

    // Withdrawを申し込む
    const withdrawal = await withdrawArcadeMachines({ ...arcadeMachine, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    const beforeArcadeMachine = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: arcadeMachine.id },
    });
    expect(beforeArcadeMachine.state).toEqual("MOVING_TO_WALLET");
    // Executorを作成
    const akiverseLocker = mock<AkiverseLocker & HasWalletSigner>();
    akiverseLocker.withdrawArcadeMachine.mockRejectedValue("ret error message");
    const executor = createExecutor({ akiverseLocker });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(akiverseLocker.withdrawArcadeMachine).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(arcadeMachine.id),
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはERRORになる
    expect(updatedWithdrawal.state).toBe(WithdrawalState.ERROR);
    expect(updatedWithdrawal.errorMessage).toBe('"ret error message"');
    expect(updatedWithdrawal.hash).toBeNull();
    // 処理対象だったAMはIN_AKIVERSEに戻る
    const afterArcadeMachine = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: arcadeMachine.id },
    });
    expect(afterArcadeMachine.state).toEqual("IN_AKIVERSE");
  });
  it("withdraw中にエラーが発生してエラーメッセージが残る(ArcadePart)", async () => {
    // AKIVERSE内のGCを作成
    const user = await createUser();
    const arcadePart = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
      // nullのphysicalWalletAddressは未ミントのトークンを示す
      physicalWalletAddress: AKIVERSE_LOCKER_ADDRESS,
      state: NftState.IN_AKIVERSE,
    });
    // Withdrawを申し込む
    const withdrawal = await withdrawArcadeParts({ ...arcadePart, user });
    expect(withdrawal[0].state).toBe(WithdrawalState.UNPROCESSED);
    const beforeArcadePart = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: arcadePart.id },
    });
    expect(beforeArcadePart.state).toEqual("MOVING_TO_WALLET");
    // Executorを作成
    const akiverseLocker = mock<AkiverseLocker & HasWalletSigner>();
    akiverseLocker.withdrawArcadeParts.mockRejectedValue(
      new Error("mock rejected"),
    );
    const executor = createExecutor({ akiverseLocker });
    // Withdrawの処理を行う
    await executor.poll();
    // Mintが行われた
    expect(akiverseLocker.withdrawArcadeParts).toHaveBeenCalledWith(
      user.walletAddress,
      BigNumber.from(arcadePart.id),
      { gasPrice: expect.anything() },
    );
    // Withdrawの状態が更新された
    const updatedWithdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal[0].id },
    });
    // 実行済みのWithdrawはERRORになる
    expect(updatedWithdrawal.state).toBe(WithdrawalState.ERROR);
    expect(updatedWithdrawal.errorMessage).toBe("mock rejected");
    expect(updatedWithdrawal.hash).toBeNull();
    // 処理対象だったAPはIN_AKIVERSEに戻る
    const afterArcadePart = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: arcadePart.id },
    });
    expect(afterArcadePart.state).toEqual("IN_AKIVERSE");
  });
});
