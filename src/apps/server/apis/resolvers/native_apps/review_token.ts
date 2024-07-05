import { Context } from "../../../../../context";
import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { TempReviewTokenInput } from "./inputs/temp_review_token_input";
import { Service } from "typedi";
import { InvalidArgumentHandlerError } from "../../rest_apis/errors";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../../../../helpers/token";
import { InternalServerResolverError } from "../errors";
import { LoginOutput } from "../auth/outputs/login_output";

@Service()
@Resolver()
/**
 * MagicSDKのテストモードがうまく動かない問題の対処用
 * 認証処理をFirebaseにするときに削除する
 * また、一時的なもののため、UseCaseなどは作っていない
 */
export default class ReviewTokenResolver {
  @Mutation(() => LoginOutput)
  async tempReviewToken(
    @Arg("input") input: TempReviewTokenInput,
    @Ctx() ctx: Context,
  ) {
    // メアドチェック
    if (input.emailAddress !== "review@akiverse.io") {
      throw new InvalidArgumentHandlerError("invalid parameter(s)");
    }
    // OS/バージョンがテスト中かチェック
    const version = await ctx.prisma.appVersion.findUnique({
      where: {
        os_version: {
          os: input.os,
          version: input.version,
        },
        underReview: true,
      },
    });
    if (!version) {
      throw new InvalidArgumentHandlerError("invalid parameter(s)");
    }
    // トークン発行
    const user = await ctx.prisma.user.findUnique({
      where: { email: input.emailAddress },
    });
    if (!user) {
      throw new InternalServerResolverError("review user not found");
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    return {
      user: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }
}
