import { GraphQLResolveInfo } from "graphql";
import { Context } from "../../../../../context";
import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { toResolverError } from "../errors";
import { AKVUseCase } from "../../../../../use_cases/currencies/akv_usecase";
import { WithdrawAKVInput } from "./inputs/withdraw_akv_input";

@Service()
@Resolver()
export default class WithdrawAKVResolver {
  constructor(
    @Inject("currency.akv.useCase")
    private readonly useCase: AKVUseCase,
  ) {}
  @Authorized()
  @Mutation(() => Boolean)
  public async withdrawAKV(
    @Ctx() ctx: Context,
    @Arg("input") input: WithdrawAKVInput,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      await this.useCase.withdraw(ctx, input.amount!);
      return true;
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
