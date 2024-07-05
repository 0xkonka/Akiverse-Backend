import { GameCenter as GameCenterContract } from "@victgame/akiverse-nft-contracts/dist/types/GameCenter";
import { AkiverseLocker } from "@victgame/akiverse-deposit-withdraw-contracts";
import { ContractTransaction } from "ethers";
import { GetGasPriceFunc, HasWalletSigner } from "../../executor";
import { GameCenter, User } from "@prisma/client";
import { NftExecutor } from "./abstract_nft_executor";

type GameCenterWithUser = GameCenter & { user: User | null };
export class GameCenterExecutor extends NftExecutor<GameCenterWithUser> {
  gameCenterContract: GameCenterContract & HasWalletSigner;

  constructor(
    gameCenterContract: GameCenterContract & HasWalletSigner,
    akiverseLocker: AkiverseLocker & HasWalletSigner,
    gasPriceFunction: GetGasPriceFunc,
  ) {
    super(
      (to, id, over) => akiverseLocker.withdrawGameCenter(to, id, over),
      gasPriceFunction,
      akiverseLocker.signer.address,
      gameCenterContract.signer.address,
    );
    this.gameCenterContract = gameCenterContract;
  }

  async mint(t: GameCenterWithUser): Promise<ContractTransaction> {
    throw new Error(`Minting GC with ID ${t.id} not supported.`);
  }
}
