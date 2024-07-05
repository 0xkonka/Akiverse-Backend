import "reflect-metadata";

import { Args, Ctx, Info, Query, Resolver } from "type-graphql";
import { LoginOutput } from "./outputs/login_output";
import { LoginInput } from "./inputs/login_input";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { Inject, Service } from "typedi";
import { LoginUseCase } from "../../../../../use_cases/login_usecase";

@Service()
@Resolver()
export default class LoginResolver {
  constructor(
    @Inject("login.useCase")
    private loginUseCase: LoginUseCase,
  ) {}
  @Query(() => LoginOutput)
  public async login(
    @Args() args: LoginInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<LoginOutput> {
    ctx = ctx.getChildContext(info);
    if (!args.isValid()) {
      throw new InvalidArgumentResolverError(
        "didToken or message/signature required",
      );
    }

    try {
      if (args.didToken !== "") {
        // didTokenが設定されていたらMagicログイン
        const ret = await this.loginUseCase.emailLogin(ctx, args.didToken);
        return new LoginOutput(
          ret.user,
          ret.accessToken,
          ret.refreshToken,
          ret.firebaseCustomToken,
        );
      } else {
        // Walletログイン
        const ret = await this.loginUseCase.walletLogin(
          ctx,
          args.message,
          args.signature,
        );
        return new LoginOutput(
          ret.user,
          ret.accessToken,
          ret.refreshToken,
          ret.firebaseCustomToken,
        );
      }
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
