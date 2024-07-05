import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { GameCenter } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { ListPlacementArcadeMachinesInput } from "./inputs/list_placement_arcade_machines_input";
import { GameCenterUseCase } from "../../../../../use_cases/game_center_usecase";
import { Inject, Service } from "typedi";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver()
export default class ListPlacementArcadeMachinesResolver {
  constructor(
    @Inject("gameCenter.useCase") private readonly useCase: GameCenterUseCase,
  ) {}

  @Authorized()
  @Query(() => GameCenter)
  public async listPlacementArcadeMachines(
    @Args() args: ListPlacementArcadeMachinesInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!args.id) {
      throw new InvalidArgumentResolverError("id required");
    }
    try {
      return await this.useCase.listPlacementArcadeMachines(ctx, args.id);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
