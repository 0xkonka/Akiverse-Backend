import { Prisma, User } from "@prisma/client";
import { Context } from "../context";
import Moralis from "moralis";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "./errors";
import { Inject, Service } from "typedi";
import { QuestProgressChecker } from "../helpers/quests";
import { setUserClaims } from "../helpers/firebase_auth";

export interface WalletAddressUseCase {
  register(ctx: Context, message: string, signature: string): Promise<User>;
}

@Service("walletAddress.useCase")
export class WalletAddressUseCaseImpl implements WalletAddressUseCase {
  constructor(
    @Inject("questProgressChecker")
    private readonly questChecker: QuestProgressChecker,
  ) {}
  async register(
    ctx: Context,
    message: string,
    signature: string,
  ): Promise<User> {
    const verifiedData = await Moralis.Auth.verify({
      message,
      signature,
      network: "evm",
    });
    const { id, version, nonce } = verifiedData.raw;
    // Save version and nonce
    const session = await ctx.prisma.moralisSession.update({
      where: { challengeId: id },
      data: { version, nonce, verified: true },
    });

    if (ctx.walletAddress) {
      throw new IllegalStateUseCaseError(
        "wallet address is already registered",
      );
    }
    // wallet addressでUserを検索して存在しないこと
    const user = await ctx.prisma.user.findUnique({
      where: { walletAddress: session.walletAddress },
    });
    if (user) {
      // すでに同一のwalletAddressを設定したユーザーが存在しているのでおかしい
      throw new InvalidArgumentUseCaseError("same wallet address user exist");
    }
    try {
      const ret = await ctx.prisma.$transaction([
        ctx.prisma.user.update({
          where: {
            id: ctx.userId,
            AND: {
              walletAddress: null,
            },
          },
          data: {
            walletAddress: session.walletAddress,
          },
        }),
        // BC上に存在したものにUser紐づけ
        ctx.prisma.arcadeMachine.updateMany({
          where: {
            ownerWalletAddress: session.walletAddress,
            userId: null,
          },
          data: {
            userId: ctx.userId,
          },
        }),
        ctx.prisma.arcadePart.updateMany({
          where: {
            ownerWalletAddress: session.walletAddress,
            userId: null,
          },
          data: {
            userId: ctx.userId,
          },
        }),
        ctx.prisma.gameCenter.updateMany({
          where: {
            ownerWalletAddress: session.walletAddress,
            userId: null,
          },
          data: {
            userId: ctx.userId,
          },
        }),
        // Akiverse内で直接配布してWallet未紐づけだったNFTにも紐づける
        ctx.prisma.arcadeMachine.updateMany({
          where: {
            userId: ctx.userId,
            ownerWalletAddress: null,
          },
          data: {
            ownerWalletAddress: session.walletAddress,
          },
        }),
        ctx.prisma.arcadePart.updateMany({
          where: {
            userId: ctx.userId,
            ownerWalletAddress: null,
          },
          data: {
            ownerWalletAddress: session.walletAddress,
          },
        }),
        ctx.prisma.gameCenter.updateMany({
          where: {
            userId: ctx.userId,
            ownerWalletAddress: null,
          },
          data: {
            ownerWalletAddress: session.walletAddress,
          },
        }),
      ]);

      await this.questChecker.checkAndUpdate(ctx);
      if (ctx.tokenType === "firebase") {
        // firebase認証されている=FirebaseのクレームにWalletAddressを設定する必要がある
        await setUserClaims(ctx, ctx.userId!, ctx.firebaseId);
      }

      return ret[0];
    } catch (e: unknown) {
      // userのみupdateで呼び出しているので更新が0行だったらエラーが発生してここに来る
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code == "P2002") {
          // Unique constraint error
          throw new ConflictUseCaseError("update operation conflicted");
        } else if (e.code == "P2025") {
          // Not Found error
          throw new ConflictUseCaseError("update operation conflicted");
        }
      }
      throw e;
    }
  }
}
