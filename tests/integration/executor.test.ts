import {
  eraseDatabase,
  createUser,
  createArcadeMachine,
  depositArcadeMachine,
  createArcadePart,
  depositArcadePart,
  depositAkir,
  depositAkv,
} from "../test_helper";
import { getExecutor } from "../../src/apps/executor/executor";
import {
  withdrawArcadeMachines,
  withdrawArcadeParts,
  withdrawAkir,
  withdrawAkv,
} from "../../src/helpers/withdraw";
import prisma from "../../src/prisma";
import { CurrencyType, NftType } from "@prisma/client";
import { setTimeout } from "timers/promises";
import {
  ArcadeMachine as ArcadeMachineContract,
  ArcadeParts as ArcadePartContract,
  GameCenter as GameCenterContract,
  ArcadeMachine__factory,
  ArcadeParts__factory,
  GameCenter__factory,
} from "@victgame/akiverse-nft-contracts/dist/types";
import {
  AKIR as AkirContract,
  AKIR__factory,
  AKV as AkvContract,
  AKV__factory,
} from "@victgame/akiverse-ft-contracts/dist/types";
import {
  AkiverseLocker,
  AkiverseLocker__factory,
} from "@victgame/akiverse-deposit-withdraw-contracts";
import {
  BigNumber,
  ContractTransaction,
  utils,
  ethers,
  Wallet,
  providers,
  Contract,
} from "ethers";
import { getGasPriceFunc, getProvider } from "../../src/helpers/blockchain";
import { Executor, HasWalletSigner } from "../../src/helpers/executor";
import { Watcher } from "../../src/apps/watcher/watcher";
import { Confirmer } from "../../src/apps/confirmer/confirmer";
import { NftState, Prisma } from "@prisma/client";

jest.setTimeout(30000);

describe.only("poll", () => {
  let arcadeMachineContract: ArcadeMachineContract;
  let arcadeMachineSigner: ethers.Wallet;
  let arcadePartContract: ArcadePartContract;
  let arcadePartSigner: ethers.Wallet;
  let gameCenterContract: GameCenterContract;
  let gameCenterSigner: ethers.Wallet;
  let akirContract: AkirContract;
  let akirSigner: ethers.Wallet;
  let akvContract: AkvContract;
  let akvSigner: ethers.Wallet;
  let akiverseLockerContract: AkiverseLocker;
  let akiverseLockerSigner: ethers.Wallet;
  let executor: Executor;
  let userSigner: ethers.Wallet;
  let provider: ethers.providers.BaseProvider;
  let watcher: Watcher;
  let confirmer: Confirmer;
  let nftAddresses: Record<NftType, string>;
  let ftAddresses: Record<CurrencyType, string>;

  beforeAll(async () => {
    const contracts = await deployContracts();
    userSigner = contracts.userSigner;
    arcadeMachineContract = contracts.arcadeMachineContract;
    arcadeMachineSigner = contracts.arcadeMachineSigner;
    arcadePartContract = contracts.arcadePartContract;
    arcadePartSigner = contracts.arcadePartSigner;
    gameCenterContract = contracts.gameCenterContract;
    gameCenterSigner = contracts.gameCenterSigner;
    akirContract = contracts.akirContract;
    akirSigner = contracts.akirSigner;
    akvContract = contracts.akvContract;
    akvSigner = contracts.akvSigner;
    akiverseLockerContract = contracts.akiverseLockerContract;
    akiverseLockerSigner = contracts.akiverseLockerSigner;
    provider = contracts.provider;
    await akiverseLockerContract.setArcadeMachineAddress(
      arcadeMachineContract.address,
    );
    await akiverseLockerContract.setArcadePartsAddress(
      arcadePartContract.address,
    );
    await akiverseLockerContract.setGameCenterAddress(
      gameCenterContract.address,
    );
    await akiverseLockerContract.setAkirAddress(akirContract.address);
    await akiverseLockerContract.setAkvAddress(akvContract.address);

    // await arcadeMachineContract
    //   .connect(userSigner)
    //   .setApprovalForAll(akiverseLockerContract.address, true);

    await akirContract.grantRole(
      await akirContract.MINTER_ROLE(),
      akiverseLockerContract.address,
    );

    nftAddresses = {
      [NftType.GAME_CENTER]: gameCenterContract.address,
      [NftType.ARCADE_MACHINE]: arcadeMachineContract.address,
      [NftType.ARCADE_PART]: arcadePartContract.address,
    };

    ftAddresses = {
      [CurrencyType.AKIR]: akirContract.address,
      [CurrencyType.AKV]: akvContract.address, // TODO
      [CurrencyType.USDC]: akvContract.address, // TODO
    };

    executor = getExecutor(
      arcadeMachineContract.address,
      arcadeMachineSigner,
      arcadePartContract.address,
      arcadePartSigner,
      gameCenterContract.address,
      gameCenterSigner,
      akiverseLockerContract.address,
      akiverseLockerSigner,
      akvContract.address,
      akiverseLockerSigner,
    );
  });

  beforeEach(async () => {
    await eraseDatabase();
    watcher = new Watcher(300, 100, nftAddresses, ftAddresses);
    watcher.start();
    confirmer = new Confirmer(
      100,
      akiverseLockerContract.address,
      userSigner.address,
    );
    confirmer.start();
  });

  afterEach(async () => {
    await watcher.stop();
    await confirmer.stop();
  });

  it("withdraw & mint am, deposit am", async () => {
    const user = await createUser({
      walletAddress: userSigner.address,
    });
    let am = await createArcadeMachine({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    const withdrawals = await withdrawArcadeMachines({ ...am, user });

    await executor.poll();

    const withdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawals[0].id },
    });

    expect(withdrawal.state).toBe("PENDING");

    // 待機時間がないとtransferイベントを検知できない（原因不明）
    await setTimeout(1000);

    await mineNBlocks(200);

    // JsonRpc._startPending内で1000待機しているため1000だと失敗する可能性があるかも（その場合は増やす）
    await setTimeout(3000);
    am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
    });

    expect(am.state).toBe(NftState.IN_WALLET);

    await depositArcadeMachine(
      akiverseLockerContract,
      arcadeMachineContract,
      userSigner,
      am.id,
    );
    await setTimeout(1000);
    await mineNBlocks(200);
    await setTimeout(3000);

    am = await prisma.arcadeMachine.findUniqueOrThrow({
      where: { id: am.id },
    });

    expect(am.state).toBe(NftState.IN_AKIVERSE);
  }, 30000);

  it("withdraw & mint ap, deposit ap", async () => {
    const user = await createUser({
      walletAddress: userSigner.address,
    });
    let ap = await createArcadePart({
      userId: user.id,
      ownerWalletAddress: user.walletAddress,
    });
    const withdrawals = await withdrawArcadeParts({ ...ap, user });

    await executor.poll();

    const withdrawal = await prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawals[0].id },
    });

    expect(withdrawal.state).toBe("PENDING");

    // 待機時間がないとtransferイベントを検知できない（原因不明）
    await setTimeout(1000);

    await mineNBlocks(200);

    // JsonRpc._startPending内で1000待機しているため1000だと失敗する可能性があるかも（その場合は増やす）
    await setTimeout(3000);
    ap = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
    });

    expect(ap.state).toBe(NftState.IN_WALLET);

    await depositArcadePart(
      akiverseLockerContract,
      arcadePartContract,
      userSigner,
      ap.id,
    );
    await setTimeout(1000);
    await mineNBlocks(200);
    await setTimeout(3000);

    ap = await prisma.arcadePart.findUniqueOrThrow({
      where: { id: ap.id },
    });

    expect(ap.state).toBe(NftState.IN_AKIVERSE);
  }, 30000);

  it("withdraw & deposit AKIR", async () => {
    let user = await createUser({
      walletAddress: userSigner.address,
      akirBalance: new Prisma.Decimal("100"),
    });
    let currencyWithdrawal = await withdrawAkir(user, new Prisma.Decimal("30"));

    await executor.poll();

    currencyWithdrawal = await prisma.currencyWithdrawal.findUniqueOrThrow({
      where: { id: currencyWithdrawal.id },
    });

    expect(currencyWithdrawal.state).toBe("PENDING");

    // 待機時間がないとtransferイベントを検知できない（原因不明）
    await setTimeout(1000);

    await mineNBlocks(200);

    // JsonRpc._startPending内で1000待機しているため1000だと失敗する可能性があるかも（その場合は増やす）
    await setTimeout(3000);
    user = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(user.akirBalance).toStrictEqual(new Prisma.Decimal("70"));

    await depositAkir(akiverseLockerContract, akirContract, userSigner, "20");

    await setTimeout(1000);
    await mineNBlocks(200);
    await setTimeout(3000);

    user = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(user.akirBalance).toStrictEqual(new Prisma.Decimal("90"));
  }, 30000);

  it("withdraw & deposit AKV", async () => {
    let user = await createUser({
      walletAddress: userSigner.address,
      akvBalance: new Prisma.Decimal("100"),
    });
    let currencyWithdrawal = await withdrawAkv(user, new Prisma.Decimal("30"));

    await executor.poll();

    currencyWithdrawal = await prisma.currencyWithdrawal.findUniqueOrThrow({
      where: { id: currencyWithdrawal.id },
    });

    expect(currencyWithdrawal.state).toBe("PENDING");

    // 待機時間がないとtransferイベントを検知できない（原因不明）
    await setTimeout(1000);

    await mineNBlocks(200);

    // JsonRpc._startPending内で1000待機しているため1000だと失敗する可能性があるかも（その場合は増やす）
    await setTimeout(3000);
    user = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(user.akvBalance).toStrictEqual(new Prisma.Decimal("70"));

    await depositAkv(akiverseLockerContract, akvContract, userSigner, "20");

    await setTimeout(1000);
    await mineNBlocks(200);
    await setTimeout(3000);

    user = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(user.akvBalance).toStrictEqual(new Prisma.Decimal("90"));
  }, 30000);
});

const mineNBlocks = async (n: number) => {
  const provider = getProvider() as any as providers.JsonRpcProvider;
  for (let index = 0; index < n; index++) {
    await provider.send("evm_mine", []);
  }
};

const deployContracts = async () => {
  const provider = getProvider();
  const userKey =
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";

  const userSigner = new Wallet(userKey, provider);
  // arcade machines
  const amSigner = new Wallet(process.env.AM_SIGNER_KEY as string);
  const arcadeMachineContract = new ArcadeMachine__factory().connect(
    amSigner.connect(provider),
  );
  const am = await arcadeMachineContract.deploy(
    "https://metadata.staging.akiverse.io/arcademachines/",
  );
  await am.deployed();
  // arcade parts
  const apSigner = new Wallet(process.env.AP_SIGNER_KEY as string);
  const arcadePartContract = new ArcadeParts__factory().connect(
    apSigner.connect(provider),
  );
  const ap = await arcadePartContract.deploy(
    "https://metadata.staging.akiverse.io/arcadeparts/",
  );
  await ap.deployed();
  // game centers
  const gcSigner = new Wallet(process.env.GC_SIGNER_KEY as string);
  const gameCenterContract = new GameCenter__factory().connect(
    gcSigner.connect(provider),
  );
  const gc = await gameCenterContract.deploy(
    "https://metadata.staging.akiverse.io/gamecenters/",
  );
  await gc.deployed();
  // AKIR
  const akirSigner = new Wallet(process.env.AKIR_SIGNER_KEY as string);
  const akirContract = new AKIR__factory().connect(
    akirSigner.connect(provider),
  );
  const akir = await akirContract.deploy();
  await akir.deployed();
  // Akiverse locker
  const lockerSigner = new Wallet(
    process.env.AKIVERSE_LOCKER_SIGNER_KEY as string,
  );
  const withdrawer = Wallet.createRandom();
  const akiverseLocker = new AkiverseLocker__factory().connect(
    lockerSigner.connect(provider),
  );
  const al = await akiverseLocker.deploy(withdrawer.address);
  await al.deployed();
  await al.grantRole(await al.WITHDRAWER_ROLE(), lockerSigner.address);
  // AKV
  const akvSigner = new Wallet(process.env.AKV_SIGNER_KEY as string);
  const akvContract = new AKV__factory().connect(akvSigner.connect(provider));
  const akv = await akvContract.deploy([al.address], [30]);
  await akv.deployed();
  // result
  return {
    provider: provider,
    userSigner: userSigner,
    arcadeMachineContract: am,
    arcadeMachineSigner: amSigner,
    arcadePartContract: ap,
    arcadePartSigner: apSigner,
    gameCenterContract: gc,
    gameCenterSigner: gcSigner,
    akirContract: akir,
    akirSigner: akirSigner,
    akvContract: akv,
    akvSigner: akvSigner,
    akiverseLockerContract: al,
    akiverseLockerSigner: lockerSigner,
  };
};

// nftはオンチェーン上では生まれない。withdraw->データベースで作成->mint。withdraw->deposit->withdrawを一つのテストでやる

// psql akiverse_test
// select * from transfers;
//select * from blocks;
