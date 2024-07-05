import { UserUseCase } from "../../../../../use_cases/user_usecase";
import { Inject, Service } from "typedi";
import { Arg, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { CreateUserInput } from "./inputs/create_user_input";
import { LoginUseCase } from "../../../../../use_cases/login_usecase";
import { CreateUserOutput } from "./outputs/create_user_output";

@Service()
@Resolver()
export default class CreateUserResolver {
  constructor(
    @Inject("user.useCase")
    private readonly userUseCase: UserUseCase,
    @Inject("login.useCase")
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Mutation(() => CreateUserOutput)
  async createUser(
    @Arg("input") input: CreateUserInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<CreateUserOutput> {
    ctx = ctx.getChildContext(info);
    try {
      if (input.didToken && input.didToken.length > 0) {
        // Magic
        await this.userUseCase.createFromMagic(ctx, input.didToken, input.name);
        const token = await this.loginUseCase.emailLogin(ctx, input.didToken);
        return new CreateUserOutput(
          token.user,
          token.accessToken,
          token.refreshToken,
        );
      } else if (input.idToken && input.idToken.length > 0) {
        // Firebase
        const user = await this.userUseCase.createFromFirebase(
          ctx,
          input.idToken,
          input.name,
        );
        return new CreateUserOutput(user, "", "");
      } else {
        throw new InvalidArgumentResolverError("didToken or idToken required");
      }
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
