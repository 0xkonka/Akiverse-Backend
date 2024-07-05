import { ProfilePictureNftUseCaseImpl } from "../../../src/use_cases/eth_nfts/profile_picture_nft_usecase";
import { createMockContext } from "../../mock/context";
import { eraseDatabase } from "../../test_helper";

const useCase = new ProfilePictureNftUseCaseImpl();
const walletAddress = process.env.ETH_TEST_WALLET_ADDRESS;

// TODO hardhatで検証できるようにする
// TODO Goerliがクローズしてしまったため検証できない
describe.skip("listProfileIconImages", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no wallet address", async () => {
    const ctx = await createMockContext({ walletAddress: null });
    const ret = await useCase.listProfileIconImages(ctx);
    expect(ret).toHaveLength(0);
  });
  test("success", async () => {
    const ctx = await createMockContext({ walletAddress: walletAddress });
    const ret = await useCase.listProfileIconImages(ctx);
    expect(ret.length).toBeGreaterThan(1);
  });
});
