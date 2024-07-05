import {
  Block,
  BlockState,
  CurrencyType,
  DepositState,
  NftState,
  NftType,
  Prisma,
  TransferState,
  WithdrawalState,
  WithdrawalType,
} from "@prisma/client";
import prisma from "../../../src/prisma";
import { BlockCache } from "../../../src/helpers/blockchain";
import {
  checkBlocks,
  Confirmer,
  getLastAddress,
} from "../../../src/apps/confirmer/confirmer";
import {
  AKIVERSE_LOCKER_ADDRESS,
  BLOCKS_TO_CONFIRM,
  USDC_WALLET_ADDRESS,
} from "../../../src/constants";
import {
  createGameCenter,
  createUser,
  eraseDatabase,
  recordBlock,
} from "../../test_helper";
import { updateDepositState } from "../../../src/helpers/deposit";

describe("checkBlocks", () => {
  beforeEach(eraseDatabase);

  it("saves a block as PENDING", async () => {
    await recordBlock(0, "block 0", "nothing");
    await checkBlocks();
    const savedBlock = await new BlockCache().getBlock(0, "block 0");
    expect(savedBlock!.state).toEqual(BlockState.PENDING);
  });

  it("confirms a block with BLOCKS_TO_CONFIRM descendants", async () => {
    await recordBlock(0, "block 0", "nothing");
    for (let i = 1; i < 1 + BLOCKS_TO_CONFIRM; i++) {
      await recordBlock(i, `block ${i}`, `block ${i - 1}`);
    }
    await checkBlocks();
    const savedBlock = await new BlockCache().getBlock(0, "block 0");
    expect(savedBlock!.state).toEqual(BlockState.CONFIRMED);
  });

  it("does not confirm a block with fewer than BLOCKS_TO_CONFIRM descendants", async () => {
    await recordBlock(0, "block 0", "nothing");
    for (let i = 1; i < BLOCKS_TO_CONFIRM; i++) {
      await recordBlock(i, `block ${i}`, `block ${i - 1}`);
    }
    await checkBlocks();
    const savedBlock = await new BlockCache().getBlock(0, "block 0");
    expect(savedBlock!.state).toEqual(BlockState.PENDING);
  });
  jest.setTimeout(100000);
  it("invalidates siblings of a confirmed branch", async () => {
    await recordBlock(0, "block 0", "nothing");
    // loser branch
    await recordBlock(1, "loser 1", "block 0");
    for (let i = 2; i < 1 + BLOCKS_TO_CONFIRM; i++) {
      await recordBlock(i, `loser ${i}`, `loser ${i - 1}`);
    }
    // loser branch is pending
    await checkBlocks();
    const pendingLoser = await new BlockCache().getBlock(1, "loser 1");
    expect(pendingLoser!.state).toEqual(BlockState.PENDING);
    // winner branch
    for (let i = 1; i < 2 + BLOCKS_TO_CONFIRM; i++) {
      await recordBlock(i, `block ${i}`, `block ${i - 1}`);
    }
    // check results
    await checkBlocks();
    const winner = await new BlockCache().getBlock(1, "block 1");
    expect(winner!.state).toEqual(BlockState.CONFIRMED);
    const invalidLoser = await new BlockCache().getBlock(1, "loser 1");
    expect(invalidLoser!.state).toEqual(BlockState.INVALIDATED);
    // TODO: check all blocks of loser branch
  });
});

describe("getLastAddress", () => {
  it("returns the destination of a single transfer", () => {
    const transfers = [{ from: "a", to: "b" }];
    expect(getLastAddress(transfers)).toBe("b");
  });
  it("returns the last address in a chain", () => {
    const transfers = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ];
    expect(getLastAddress(transfers)).toBe("c");
  });
  it("does not depend on array order", () => {
    const transfers = [
      { from: "b", to: "c" },
      { from: "a", to: "b" },
    ];
    expect(getLastAddress(transfers)).toBe("c");
  });
  it("returns null on a loop", () => {
    const transfers = [
      { from: "a", to: "b" },
      { from: "b", to: "a" },
    ];
    expect(getLastAddress(transfers)).toBeNull();
  });
});

describe("checkTransfers", () => {
  beforeEach(eraseDatabase);

  it("deposits a game center", async () => {
    (updateDepositState as jest.Mock) = jest
      .fn()
      .mockImplementation(async () => {
        return;
      });
    // Create user with wallet
    const walletAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    const user = await createUser({ walletAddress });
    // GCがブロックチェーン上に存在するとします。
    let gc = await createGameCenter({ state: NftState.IN_WALLET });
    await prisma.transfer.create({
      data: {
        nftType: NftType.GAME_CENTER,
        tokenId: gc.id,
        // 下記の二つのフィルドはtransferの時刻を表します。
        // その時刻がGCのlastBlockやlastTransactionIndex未満の場合、
        // transferが処理されません。
        blockNumber: 1,
        transactionIndex: 1,
        // 下記のフィルドはブロックとの関連を表します。
        blockHash: "block 1",
        // transactionHashはBC上に存在するが、ここで特に使っていません
        transactionHash: "foo",
        // checkTransfers確認待ちのtransferはPENDING。
        state: "PENDING",
        // depositを行なったウォレットアドレス
        from: walletAddress,
        // 下記のフィルドでdepositだと分かる
        to: AKIVERSE_LOCKER_ADDRESS,
      },
    });
    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });
    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkTransfers();
    gc = await prisma.gameCenter.findUniqueOrThrow({ where: { id: gc.id } });
    expect(gc.ownerWalletAddress).toBe(walletAddress);
    expect(gc.state).toBe(NftState.IN_AKIVERSE);
    expect(gc.userId).toBe(user.id);
    expect(updateDepositState).toHaveBeenCalledTimes(1);
  });

  it("withdraws a game center", async () => {
    // Create user with wallet
    const walletAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    const user = await createUser({ walletAddress });
    // Create game center
    let gc = await createGameCenter({ state: NftState.IN_AKIVERSE });
    // Create withdrawal
    const withdrawalHash = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    let withdrawal = await prisma.withdrawal.create({
      data: {
        tokenId: gc.id,
        nftType: NftType.GAME_CENTER,
        userId: user.id,
        walletAddress,
        state: WithdrawalState.PENDING,
        type: WithdrawalType.MINT,
        hash: withdrawalHash,
      },
    });
    // Create transfer
    await prisma.transfer.create({
      data: {
        nftType: NftType.GAME_CENTER,
        tokenId: gc.id,
        // 下記の二つのフィルドはtransferの時刻を表します。
        // その時刻がGCのlastBlockやlastTransactionIndex未満の場合、
        // transferが処理されません。
        blockNumber: 1,
        transactionIndex: 1,
        // 下記のフィルドはブロックとの関連を表します。
        blockHash: "block 1",
        transactionHash: withdrawalHash,
        // checkTransfers確認待ちのtransferはPENDING。
        state: "PENDING",
        from: AKIVERSE_LOCKER_ADDRESS,
        to: walletAddress,
      },
    });
    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });
    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkTransfers();
    // Check GC
    gc = await prisma.gameCenter.findUniqueOrThrow({ where: { id: gc.id } });
    expect(gc.ownerWalletAddress).toBe(walletAddress);
    expect(gc.state).toBe(NftState.IN_WALLET);
    expect(gc.userId).toBe(user.id);
    // Check Withdrawal
    withdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawal.id },
    });
    expect(withdrawal.state).toBe(WithdrawalState.CONFIRMED);
  });

  it("withdraws AKV", async () => {
    // Create user with wallet
    const walletAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    const user = await createUser({ walletAddress });
    // Create CurrencyWithdrawal
    const currencyWithdrawalHash = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    let currencyWithdrawal = await prisma.currencyWithdrawal.create({
      data: {
        amount: "100",
        currencyType: CurrencyType.AKV,
        userId: user.id,
        walletAddress,
        state: WithdrawalState.PENDING,
        type: WithdrawalType.TRANSFER,
        hash: currencyWithdrawalHash,
      },
    });
    // Create CurrencyTransfer
    await prisma.currencyTransfer.create({
      data: {
        currencyType: CurrencyType.AKV,
        amount: "100",
        // 下記の二つのフィルドはtransferの時刻を表します。
        // その時刻がGCのlastBlockやlastTransactionIndex未満の場合、
        // transferが処理されません。
        blockNumber: 1,
        transactionIndex: 1,
        // 下記のフィルドはブロックとの関連を表します。
        blockHash: "block 1",
        transactionHash: currencyWithdrawalHash,
        // checkTransfers確認待ちのtransferはPENDING。
        state: "PENDING",
        from: AKIVERSE_LOCKER_ADDRESS,
        to: walletAddress,
      },
    });
    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });
    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkCurrencyTransfers();
    // Check CurrencyWithdrawal
    currencyWithdrawal = await prisma.currencyWithdrawal.findUniqueOrThrow({
      where: { id: currencyWithdrawal.id },
    });
    expect(currencyWithdrawal.state).toBe(WithdrawalState.CONFIRMED);
  });
  it("deposit AKV", async () => {
    // Create user with wallet
    const walletAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    const user = await createUser({ walletAddress });

    // Create CurrencyDeposit
    const currencyDepositHash = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const currencyDeposit = await prisma.currencyDeposit.create({
      data: {
        currencyType: CurrencyType.AKV,
        walletAddress: walletAddress,
        userId: user.id,
        amount: "100",
        hash: currencyDepositHash,
        state: DepositState.PENDING,
      },
    });

    // Create CurrencyTransfer
    await prisma.currencyTransfer.create({
      data: {
        currencyType: CurrencyType.AKV,
        amount: "100",
        // 下記の二つのフィルドはtransferの時刻を表します。
        // その時刻がGCのlastBlockやlastTransactionIndex未満の場合、
        // transferが処理されません。
        blockNumber: 1,
        transactionIndex: 1,
        // 下記のフィルドはブロックとの関連を表します。
        blockHash: "block 1",
        transactionHash: currencyDepositHash,
        // checkTransfers確認待ちのtransferはPENDING。
        state: "PENDING",
        from: walletAddress,
        to: AKIVERSE_LOCKER_ADDRESS,
      },
    });

    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });

    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkCurrencyTransfers();

    // Check CurrencyDeposit and User
    const afterUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(100));

    const afterCurrencyDeposit = await prisma.currencyDeposit.findUniqueOrThrow(
      {
        where: { id: currencyDeposit.id },
      },
    );
    expect(afterCurrencyDeposit.state).toEqual(DepositState.CONFIRMED);
  });

  it("freezes AKV deposit without user", async () => {
    const walletAddress =
      "0x2222222222222222222222222222222222222222222222222222222222222222";
    // Create CurrencyTransfer
    let currencyTransfer = await prisma.currencyTransfer.create({
      data: {
        currencyType: CurrencyType.AKV,
        amount: "100",
        blockNumber: 1,
        transactionIndex: 1,
        blockHash: "block 1",
        transactionHash: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        state: "PENDING",
        from: walletAddress,
        to: AKIVERSE_LOCKER_ADDRESS,
      },
    });

    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });

    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkCurrencyTransfers();

    currencyTransfer = await prisma.currencyTransfer.findUniqueOrThrow({
      where: { id: currencyTransfer.id },
    });
    expect(currencyTransfer.state).toEqual(TransferState.FROZEN);
  });

  it("deposit AKV. without CurrencyDeposit record", async () => {
    // Create user with wallet
    const walletAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    const user = await createUser({ walletAddress });

    // Create CurrencyDeposit
    const currencyDepositHash = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    // Create CurrencyTransfer
    await prisma.currencyTransfer.create({
      data: {
        currencyType: CurrencyType.AKV,
        amount: "100",
        // 下記の二つのフィルドはtransferの時刻を表します。
        // その時刻がGCのlastBlockやlastTransactionIndex未満の場合、
        // transferが処理されません。
        blockNumber: 1,
        transactionIndex: 1,
        // 下記のフィルドはブロックとの関連を表します。
        blockHash: "block 1",
        transactionHash: currencyDepositHash,
        // checkTransfers確認待ちのtransferはPENDING。
        state: "PENDING",
        from: walletAddress,
        to: AKIVERSE_LOCKER_ADDRESS,
      },
    });

    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });

    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkCurrencyTransfers();

    // Check CurrencyDeposit and User
    const afterUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(100));
  });
  it("deposit AKV. wallet mismatch", async () => {
    // Create user with wallet
    const walletAddress = "0xffffffffffffffffffffffffffffffffffffffff";
    const mismatchWalletAddress = "0xfffffffffffffffffffffffffffffffffffffffa";
    const user = await createUser({ walletAddress });

    // Create CurrencyDeposit
    const currencyDepositHash = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const currencyDeposit = await prisma.currencyDeposit.create({
      data: {
        currencyType: CurrencyType.AKV,
        walletAddress: mismatchWalletAddress,
        userId: user.id,
        amount: "100",
        hash: currencyDepositHash,
        state: DepositState.PENDING,
      },
    });
    // Create CurrencyTransfer
    await prisma.currencyTransfer.create({
      data: {
        currencyType: CurrencyType.AKV,
        amount: "100",
        // 下記の二つのフィルドはtransferの時刻を表します。
        // その時刻がGCのlastBlockやlastTransactionIndex未満の場合、
        // transferが処理されません。
        blockNumber: 1,
        transactionIndex: 1,
        // 下記のフィルドはブロックとの関連を表します。
        blockHash: "block 1",
        transactionHash: currencyDepositHash,
        // checkTransfers確認待ちのtransferはPENDING。
        state: "PENDING",
        from: walletAddress,
        to: AKIVERSE_LOCKER_ADDRESS,
      },
    });

    // Block is CONFIRMED -- needed to confirm attached transfers
    await prisma.block.create({
      data: {
        number: 1,
        hash: "block 1",
        parentHash: "no parent",
        state: BlockState.CONFIRMED,
      },
    });

    const confirmer = new Confirmer(
      1000,
      AKIVERSE_LOCKER_ADDRESS,
      USDC_WALLET_ADDRESS,
    );
    await confirmer.checkCurrencyTransfers();

    // Check CurrencyDeposit and User
    const afterUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(100));
    const afterCurrencyDeposit = await prisma.currencyDeposit.findUniqueOrThrow(
      {
        where: { id: currencyDeposit.id },
      },
    );
    // walletAddressが不一致なのでCurrencyDepositのStateは更新されていない
    expect(afterCurrencyDeposit.state).toEqual(DepositState.PENDING);
  });
});
