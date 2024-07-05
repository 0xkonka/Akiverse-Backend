import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { SwapJunkToArcadePartsInput } from "./inputs/swap_junk_to_arcade_parts_input";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { SwapJunkToArcadePartsOutput } from "./outputs/swap_junk_to_arcade_parts_output";
import { JunkUseCase } from "../../../../../use_cases/junk_usecase";

@Service()
@Resolver()
export default class SwapJunkToArcadePartsResolver {
  constructor(
    @Inject("junk.useCase")
    private readonly junkUseCase: JunkUseCase,
  ) {}

  @Authorized()
  @Mutation(() => SwapJunkToArcadePartsOutput)
  async swapJunkToArcadePart(
    @Arg("input") input: SwapJunkToArcadePartsInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (input.quantity <= 0) {
      throw new InvalidArgumentResolverError(
        "quantity must be a positive number",
      );
    }
    try {
      const ret = await this.junkUseCase.swap(
        ctx,
        input.category,
        input.subCategory,
        input.quantity,
      );
      return new SwapJunkToArcadePartsOutput(ret);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
