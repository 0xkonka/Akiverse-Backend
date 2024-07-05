import { UserUseCase } from "../../../../../use_cases/user_usecase";
import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { User } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { toResolverError } from "../errors";
import { UpdateUserInput } from "./inputs/update_user_input";

@Service()
@Resolver(() => User)
export default class UpdateUserResolver {
  constructor(
    @Inject("user.useCase")
    private readonly userUseCase: UserUseCase,
  ) {}

  @Authorized()
  @Mutation(() => User)
  async updateUser(
    @Arg("input") input: UpdateUserInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      return await this.userUseCase.update(
        ctx,
        input.name,
        input.iconType,
        input.iconSubCategory,
        input.titleSubCategory,
        input.frameSubCategory,
      );
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
