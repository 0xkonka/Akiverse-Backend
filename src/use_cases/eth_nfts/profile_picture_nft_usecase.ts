import { Context } from "../../context";
import { Alchemy } from "alchemy-sdk";
import {
  ETH_ALCHEMY_API_KEY,
  ETH_NETWORK,
  PFP_CONTRACT_ADDRESS,
} from "../../constants";
import { Service } from "typedi";

export type ProfileIcon = {
  name: string;
  tokenId: string;
};
export interface ProfilePictureNftUseCase {
  listProfileIconImages(ctx: Context): Promise<ProfileIcon[]>;
}

@Service()
export class ProfilePictureNftUseCaseImpl implements ProfilePictureNftUseCase {
  private readonly alchemy: Alchemy;
  private readonly contractAddress: string;
  constructor() {
    if (ETH_ALCHEMY_API_KEY === "") {
      throw new Error("ETH_ALCHEMY_API_KEY is required");
    }
    this.contractAddress = PFP_CONTRACT_ADDRESS;
    this.alchemy = new Alchemy({
      apiKey: ETH_ALCHEMY_API_KEY,
      network: ETH_NETWORK,
    });
  }
  async listProfileIconImages(ctx: Context): Promise<ProfileIcon[]> {
    if (!ctx.walletAddress) {
      return [];
    }
    const ret = await this.alchemy.nft.getNftsForOwner(ctx.walletAddress, {
      contractAddresses: [this.contractAddress],
    });
    if (ret.totalCount === 0) {
      return [];
    }
    const res = ret.ownedNfts.map((value) => {
      return {
        name: value.title,
        tokenId: value.tokenId,
      };
    });
    return res;
  }
}
