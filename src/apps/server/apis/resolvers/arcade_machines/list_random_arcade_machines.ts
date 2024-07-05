import { Inject, Service } from "typedi";
import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { ArcadeMachineUseCase } from "../../../../../use_cases/arcade_machine_usecase";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { ListRandomArcadeMachinesInput } from "./inputs/list_random_arcade_machines_input";
import { ListRandomArcadeMachinesOutput } from "./output/list_random_arcade_machines_output";
import { toResolverError } from "../errors";

@Service()
@Resolver()
export default class ListRandomArcadeMachines {
  constructor(
    @Inject("arcadeMachine.useCase")
    private readonly useCase: ArcadeMachineUseCase,
  ) {}

  /**
   * ログインユーザーの当日Gameプレイ状況を考慮してArcadeMachineのリストを返す
   * @param args
   * @param ctx
   * @param info
   */
  @Authorized()
  @Query(() => ListRandomArcadeMachinesOutput)
  async listRandomArcadeMachines(
    @Args() args: ListRandomArcadeMachinesInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      return new ListRandomArcadeMachinesOutput(
        await this.useCase.listPlayableAndRandomize(
          ctx,
          args.game,
          args.requestCount,
          args.maxPlayingCount,
        ),
      );
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
