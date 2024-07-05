import { CurrencyType, NftType } from "@prisma/client";
import { Executor, HasWalletSigner } from "../../helpers/executor";
import {
  AKIVERSE_LOCKER_ADDRESS,
  NFT_ADDRESSES,
  GAS_PRICE_ADJUSTMENT_RATIO,
  FT_ADDRESSES,
} from "../../constants";
import {
  ArcadeMachine as ArcadeMachineContract,
  ArcadeParts as ArcadePartContract,
  GameCenter as GameCenterContract,
  ArcadeMachine__factory,
  ArcadeParts__factory,
  GameCenter__factory,
} from "@victgame/akiverse-nft-contracts/dist/types";
import {
  AkiverseLocker,
  AkiverseLocker__factory,
} from "@victgame/akiverse-deposit-withdraw-contracts";
import { ethers, Wallet } from "ethers";
import { error, info } from "../../utils";
import { getGasPriceFunc, getProvider } from "../../helpers/blockchain";
import { ERC20ContractAbi } from "../../helpers/executor/currency/usdc_executor";

const provider = getProvider();

const amSignerKey: string = process.env.AM_SIGNER_KEY as string;
const amSigner = new Wallet(amSignerKey);
const apSignerKey: string = process.env.AP_SIGNER_KEY as string;
const apSigner = new Wallet(apSignerKey);
const lockerSignerKey: string = process.env
  .AKIVERSE_LOCKER_SIGNER_KEY as string;
const lockerSigner = new Wallet(lockerSignerKey);
// GCのミントを実装する時に使います
// const gcSignerKey: string = process.env.GC_SIGNER_KEY as string;
// const gcSigner = new Wallet(gcSignerKey);
// トナメ賞金の送金用ウォレット
const usdcSignerKey: string = process.env.USDC_SIGNER_KEY as string;
const usdcSinger = new Wallet(usdcSignerKey);

info({ amSignerKey, apSignerKey });

export function getExecutor(
  arcadeMachineContractAddress: string,
  arcadeMachineSigner: Wallet,
  arcadePartContractAddress: string,
  arcadePartSigner: Wallet,
  gameCenterContractAddress: string,
  gameCenterSigner: Wallet,
  akiverseLockerAddress: string,
  akiverseLockerSigner: Wallet,
  usdcContractAddress: string,
  usdcSigner: Wallet,
): Executor {
  const arcadeMachineContract = new ArcadeMachine__factory()
    .attach(arcadeMachineContractAddress)
    .connect(
      arcadeMachineSigner.connect(provider),
    ) as any as ArcadeMachineContract & HasWalletSigner;
  const arcadePartContract = new ArcadeParts__factory()
    .attach(arcadePartContractAddress)
    .connect(arcadePartSigner.connect(provider)) as any as ArcadePartContract &
    HasWalletSigner;
  const gameCenterContract = new GameCenter__factory()
    .attach(gameCenterContractAddress)
    .connect(gameCenterSigner.connect(provider)) as any as GameCenterContract &
    HasWalletSigner; // TODO: 鍵の設定
  const akiverseLocker = new AkiverseLocker__factory()
    .attach(akiverseLockerAddress)
    .connect(akiverseLockerSigner.connect(provider)) as any as AkiverseLocker &
    HasWalletSigner;

  const usdcContractWithSigner = new ethers.Contract(
    usdcContractAddress,
    ERC20ContractAbi,
    usdcSigner.connect(provider),
  );

  const executor = new Executor(
    arcadeMachineContract,
    arcadePartContract,
    gameCenterContract,
    akiverseLocker,
    usdcContractWithSigner,
    getGasPriceFunc(provider, GAS_PRICE_ADJUSTMENT_RATIO),
  );
  return executor;
}

const main = async () => {
  try {
    const executor = getExecutor(
      NFT_ADDRESSES[NftType.ARCADE_MACHINE]!,
      amSigner,
      NFT_ADDRESSES[NftType.ARCADE_PART]!,
      apSigner,
      NFT_ADDRESSES[NftType.GAME_CENTER]!,
      amSigner,
      AKIVERSE_LOCKER_ADDRESS,
      lockerSigner,
      FT_ADDRESSES[CurrencyType.USDC]!,
      usdcSinger,
    );
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await executor.poll();
      await new Promise((f) => setTimeout(f, 10000));
    }
  } catch (e) {
    error({
      err: JSON.stringify(e, Object.getOwnPropertyNames(e)),
      msg: "executor failed",
    });
  }
};

if (require.main === module) {
  main();
}
