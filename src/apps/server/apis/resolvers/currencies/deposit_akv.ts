import { GraphQLResolveInfo } from "graphql";
import { Context } from "../../../../../context";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Inject, Service } from "typedi";
import { AKVUseCase } from "../../../../../use_cases/currencies/akv_usecase";
import { DepositAKVInput } from "./inputs/deposit_akv_input";
import { toResolverError } from "../errors";

@Service()
@Resolver()
export default class DepositAKVResolver {
  constructor(
    @Inject("currency.akv.useCase")
    private readonly useCase: AKVUseCase,
  ) {}
  @Authorized()
  @Mutation(() => Boolean)
  public async depositAKV(
    @Ctx() ctx: Context,
    @Arg("input") input: DepositAKVInput,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      await this.useCase.deposit(ctx, input.transactionHash, input.amount!);
      return true;
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
