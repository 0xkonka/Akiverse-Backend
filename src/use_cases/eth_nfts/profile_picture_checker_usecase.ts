import { Alchemy } from "alchemy-sdk";
import { ETH_NETWORK } from "../../constants";
import prisma from "../../prisma";
import { IconType } from "@prisma/client";
import Web3 from "web3";

export interface ProfilePictureCheckerUseCase {
  update(): Promise<number>;
}

type Owners = Map<string, Set<string>>;

export class ProfilePictureCheckerUseCaseImpl
  implements ProfilePictureCheckerUseCase
{
  private readonly alchemy: Alchemy;
  private readonly contractAddress: string;
  constructor(alchemyApiKey: string, contractAddress: string) {
    if (alchemyApiKey === "") {
      throw new Error("ETH_ALCHEMY_API_KEY is required");
    }
    this.contractAddress = contractAddress;
    this.alchemy = new Alchemy({
      apiKey: alchemyApiKey,
      network: ETH_NETWORK,
    });
  }
  /**
   * ロジックメモ
   * AlchemyのAPIでOwnerの一覧を取得
   *  https://docs.alchemy.com/reference/getownersforcollection
   * 取得した一覧を Map<OwnerWalletAddress,Array<TokenId>>に変換
   * UsersテーブルでiconTypeをPFPにしているユーザーの一覧を取得
   * ユーザー一覧をループし保有しているかチェック
   * 保有していなかったらアイコンをデフォルトアイコンに更新
   * ** ユーザーに通知したいが、そんな機能がないので一旦無視
   */
  async update(): Promise<number> {
    const owners = await this.getOwners();
    const pfpIconUsers = await prisma.user.findMany({
      where: {
        iconType: IconType.NFT,
      },
    });
    const resetUserIds = [];
    for (const user of pfpIconUsers) {
      // wallet_addressは大文字/小文字混在しているが、alchemyのレスポンスは小文字のみなので小文字に変換して比較する
      const owner = owners.get(user.walletAddress!.toLowerCase());
      if (!owner) {
        // 保有者の中に存在しないのでデフォルトに戻す
        resetUserIds.push(user.id);
      } else {
        if (!owner.has(user.iconSubCategory)) {
          // 保有者一覧には存在するが、設定しているPFPアイコンが未保有なのでこちらもデフォルトに戻す
          resetUserIds.push(user.id);
        }
      }
    }
    const batchPayload = await prisma.user.updateMany({
      where: {
        iconType: IconType.NFT,
        AND: {
          id: {
            in: resetUserIds,
          },
        },
      },
      data: {
        iconType: IconType.IN_WORLD,
        iconSubCategory: "DEFAULT",
      },
    });
    return batchPayload.count;
  }

  async getOwners(): Promise<Owners> {
    const web3 = new Web3();

    const response = await this.alchemy.nft.getOwnersForContract(
      this.contractAddress,
      {
        withTokenBalances: true,
      },
    );
    const map = new Map<string, Set<string>>();
    for (const owner of response.owners) {
      const tokenIds = new Set<string>();
      for (const tokenBalance of owner.tokenBalances) {
        tokenIds.add(web3.utils.hexToNumberString(tokenBalance.tokenId));
      }

      // alchemyのレスポンスは小文字のみ返ってくるが、念のため小文字に変換する
      map.set(owner.ownerAddress.toLowerCase(), tokenIds);
    }
    return map;
  }
}
