import { ArcadeParts as ArcadePartContract } from "@victgame/akiverse-nft-contracts/dist/types/ArcadeParts";
import { AkiverseLocker } from "@victgame/akiverse-deposit-withdraw-contracts";
import { BigNumber, ContractTransaction } from "ethers";
import { info } from "../../../utils";
import { GetGasPriceFunc, HasWalletSigner } from "../../executor";
import { ArcadePart, User } from "@prisma/client";
import { NftExecutor } from "./abstract_nft_executor";

type ArcadePartWithUser = ArcadePart & { user: User | null };
export class ArcadePartExecutor extends NftExecutor<ArcadePartWithUser> {
  arcadePartContract: ArcadePartContract & HasWalletSigner;

  constructor(
    arcadePartContract: ArcadePartContract & HasWalletSigner,
    akiverseLocker: AkiverseLocker & HasWalletSigner,
    gasPriceFunction: GetGasPriceFunc,
  ) {
    super(
      (to, id, over) => akiverseLocker.withdrawArcadeParts(to, id, over),
      gasPriceFunction,
      akiverseLocker.signer.address,
      arcadePartContract.signer.address,
    );
    this.arcadePartContract = arcadePartContract;
  }

  async mint(t: ArcadePartWithUser): Promise<ContractTransaction> {
    info({ msg: "minting ArcadePart" });
    const gasPrice = await this.getGasPriceFunction();
    const result = await this.arcadePartContract.mintToken(
      t.ownerWalletAddress!,
      BigNumber.from(t.id),
      t.id + ".json",
      { gasPrice: gasPrice },
    );
    info(result);
    return result;
  }
}
