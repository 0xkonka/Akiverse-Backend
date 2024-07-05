import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { GameCenter } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { StartRecruitArcadeMachineInput } from "./inputs/start_recruit_arcade_machine_input";
import { GameCenterUseCase } from "../../../../../use_cases/game_center_usecase";
import { Inject, Service } from "typedi";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { GraphQLResolveInfo } from "graphql";

@Service()
@Resolver()
export default class StartRecruitArcadeMachineResolver {
  constructor(
    @Inject("gameCenter.useCase") private readonly useCase: GameCenterUseCase,
  ) {}

  @Authorized()
  @Mutation(() => GameCenter)
  public async startRecruitArcadeMachine(
    @Arg("input") input: StartRecruitArcadeMachineInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    if (!input.id) {
      throw new InvalidArgumentResolverError("id required");
    }
    try {
      return await this.useCase.startRecruitmentForArcadeMachine(ctx, input.id);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}