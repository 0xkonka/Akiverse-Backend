import { ProfilePictureCheckerUseCaseImpl } from "../../../src/use_cases/eth_nfts/profile_picture_checker_usecase";
import {
  ETH_ALCHEMY_API_KEY,
  PFP_CONTRACT_ADDRESS,
} from "../../../src/constants";
import { createMockContext } from "../../mock/context";
import { IconType } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import prismaClient from "../../../src/prisma";
import { eraseDatabase } from "../../test_helper";

const useCase = new ProfilePictureCheckerUseCaseImpl(
  ETH_ALCHEMY_API_KEY,
  PFP_CONTRACT_ADDRESS,
);
// TODO Goerliがクローズしたため検証できる環境がない
describe.skip("profile picture checker", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    // 一旦useCase.getOwnersで今存在しているNFTを取得する
    const nftOwners = await useCase.getOwners();

    // ２度呼ぶと無駄なリクエストが増えるので先に取得したデータでモックする
    (useCase.getOwners as jest.Mock) = jest.fn().mockResolvedValue(nftOwners);
    expect(nftOwners.size).toBeGreaterThan(0);

    const walletAddress = [...nftOwners.keys()][0];
    const tokenIds = nftOwners.get(walletAddress)!;
    const tokenId = tokenIds.values().next().value;

    // NFTを保有しているユーザーのウォレットアドレスでUser作成
    const haveUser = await createMockContext({
      // 小文字の変換確認用に大文字でInsertする
      walletAddress: walletAddress.toUpperCase(),
      iconType: IconType.NFT,
      iconSubCategory: tokenId,
    });

    // NFTを保有していないユーザーのウォレットアドレスをでっちあげてUserを作成
    const dontHaveUser = await createMockContext({
      walletAddress: uuidv4(),
      iconType: IconType.NFT,
      iconSubCategory: "99999",
    });

    const updatedCount = await useCase.update();
    expect(updatedCount).toEqual(1);

    // 元々持っている人はそのままである
    const afterHaveUser = await prismaClient.user.findUniqueOrThrow({
      where: {
        id: haveUser.userId,
      },
    });
    expect(afterHaveUser).toMatchObject({
      iconType: IconType.NFT,
      iconSubCategory: tokenId,
    });

    // なくなってしまった人はデフォルトになっている
    const afterDontHaveUser = await prismaClient.user.findUniqueOrThrow({
      where: {
        id: dontHaveUser.userId,
      },
    });
    expect(afterDontHaveUser).toMatchObject({
      iconType: IconType.IN_WORLD,
      iconSubCategory: "DEFAULT",
    });
  });
});
