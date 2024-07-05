import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { GameCenter } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { WithdrawGameCenterInput } from "./inputs/withdraw_game_center_input";
import { GameCenterUseCase } from "../../../../../use_cases/game_center_usecase";
import { Inject, Service } from "typedi";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver()
export default class WithdrawGameCenterResolver {
  constructor(
    @Inject("gameCenter.useCase") private readonly useCase: GameCenterUseCase,
  ) {}

  @Authorized()
  @Mutation(() => [GameCenter])
  public async withdrawGameCenter(
    @Arg("input") input: WithdrawGameCenterInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.ids || input.ids.length === 0) {
      throw new InvalidArgumentResolverError("id required");
    }
    try {
      const gameCenter = await this.useCase.withdraw(ctx, ...input.ids);
      return gameCenter;
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
