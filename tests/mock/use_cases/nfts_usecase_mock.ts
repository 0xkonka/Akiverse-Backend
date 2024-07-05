import {
  ProfilePictureNftUseCase,
  ProfileIcon,
} from "../../../src/use_cases/eth_nfts/profile_picture_nft_usecase";
import { Context } from "vm";

export class NFTsUseCaseMock implements ProfilePictureNftUseCase {
  throwError: null | any = null;
  returnValue: ProfileIcon[] | null = null;

  reset() {
    this.returnValue = null;
    this.throwError = null;
  }
  async listProfileIconImages(ctx: Context): Promise<ProfileIcon[]> {
    if (this.throwError) throw this.throwError;
    if (!this.returnValue) throw new Error("setup failed");
    return this.returnValue;
  }
}
