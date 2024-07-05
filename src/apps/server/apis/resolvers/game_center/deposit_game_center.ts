import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { GameCenter } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { DepositGameCenterInput } from "./inputs/deposit_game_center_input";
import { GameCenterUseCase } from "../../../../../use_cases/game_center_usecase";
import { Inject, Service } from "typedi";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver()
export default class DepositGameCenterResolver {
  constructor(
    @Inject("gameCenter.useCase") private readonly useCase: GameCenterUseCase,
  ) {}

  @Authorized()
  @Mutation(() => [GameCenter])
  public async depositGameCenter(
    @Arg("input") input: DepositGameCenterInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.ids || input.ids.length === 0) {
      throw new InvalidArgumentResolverError("id required");
    }
    if (!input.hash) {
      throw new InvalidArgumentResolverError("hash required");
    }
    try {
      return await this.useCase.deposit(ctx, input.hash, ...input.ids);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
