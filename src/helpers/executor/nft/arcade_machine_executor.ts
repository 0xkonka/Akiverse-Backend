import { ArcadeMachine as ArcadeMachineContract } from "@victgame/akiverse-nft-contracts/dist/types/ArcadeMachine";
import { AkiverseLocker } from "@victgame/akiverse-deposit-withdraw-contracts";
import { BigNumber, ContractTransaction } from "ethers";
import { info } from "../../../utils";
import { GetGasPriceFunc, HasWalletSigner } from "../../executor";
import { ArcadeMachine, User } from "@prisma/client";
import { NftExecutor } from "./abstract_nft_executor";

type ArcadeMachineWithUser = ArcadeMachine & { user: User | null };
export class ArcadeMachineExecutor extends NftExecutor<ArcadeMachineWithUser> {
  arcadeMachineContract: ArcadeMachineContract & HasWalletSigner;

  constructor(
    arcadeMachineContract: ArcadeMachineContract & HasWalletSigner,
    akiverseLocker: AkiverseLocker & HasWalletSigner,
    gasPriceFunction: GetGasPriceFunc,
  ) {
    super(
      (to, id, over) => akiverseLocker.withdrawArcadeMachine(to, id, over),
      gasPriceFunction,
      akiverseLocker.signer.address,
      arcadeMachineContract.signer.address,
    );
    this.arcadeMachineContract = arcadeMachineContract;
  }

  async mint(t: ArcadeMachineWithUser): Promise<ContractTransaction> {
    info({ msg: "minting ArcadeMachine" });
    const gasPrice = await this.getGasPriceFunction();
    const result = await this.arcadeMachineContract.mintToken(
      t.ownerWalletAddress!,
      BigNumber.from(t.id),
      t.id + ".json",
      { gasPrice: gasPrice },
    );
    info(result);
    return result;
  }
}
