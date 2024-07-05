import { error, info } from "../../utils";
import { ProfilePictureCheckerUseCaseImpl } from "../../use_cases/eth_nfts/profile_picture_checker_usecase";
import { ETH_ALCHEMY_API_KEY, PFP_CONTRACT_ADDRESS } from "../../constants";

async function main() {
  try {
    const useCase = new ProfilePictureCheckerUseCaseImpl(
      ETH_ALCHEMY_API_KEY,
      PFP_CONTRACT_ADDRESS,
    );
    info({ msg: "profile picture check start" });
    await useCase.update();
    info({ msg: "profile picture check end" });
  } catch (e) {
    error({ error: e });
  }
}

if (require.main === module) {
  main();
}
