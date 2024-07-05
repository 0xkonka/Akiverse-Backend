import { Inject, Service } from "typedi";
import { LoginUseCase } from "../../../../../use_cases/login_usecase";
import { Args, Ctx, Info, Query, Resolver } from "type-graphql";
import { TokenRefreshOutput } from "./outputs/token_refresh_output";
import { TokenRefreshInput } from "./inputs/token_refresh_input";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import {
  IllegalStateResolverError,
  InvalidArgumentResolverError,
  toResolverError,
} from "../errors";
import {
  IllegalStateUseCaseError,
  RefreshTokenInvalidUseCaseError,
} from "../../../../../use_cases/errors";

@Service()
@Resolver()
export default class TokenRefreshResolver {
  constructor(
    @Inject("login.useCase")
    private loginUseCase: LoginUseCase,
  ) {}

  @Query(() => TokenRefreshOutput)
  public async tokenRefresh(
    @Args() args: TokenRefreshInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<TokenRefreshOutput> {
    ctx = ctx.getChildContext(info);

    try {
      const newAccessToken = await this.loginUseCase.tokenRefresh(
        ctx,
        args.refreshToken,
        args.requestNewAuth,
      );

      return new TokenRefreshOutput(
        newAccessToken.accessToken,
        newAccessToken.firebaseCustomToken,
      );
    } catch (e: unknown) {
      // 不正アクセスでログが大量発生する懸念があるので、toResolverErrorを呼ばずに個別対応
      if (e instanceof RefreshTokenInvalidUseCaseError) {
        ctx.log.warn(e);
        throw new InvalidArgumentResolverError(e.message);
      } else if (e instanceof IllegalStateUseCaseError) {
        // token expired
        ctx.log.warn(e);
        throw new IllegalStateResolverError(e.message);
      }
      throw toResolverError(ctx, e);
    }
  }
}
