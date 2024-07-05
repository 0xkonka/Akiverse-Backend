import { Inject, Service } from "typedi";
import { RoviGameUseCase } from "../../../../../use_cases/rovi_game_usecase";
import { Arg, Ctx, Info, Mutation } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { RoviGameFinishInput } from "./inputs/rovi_game_finish_input";
import { InvalidArgumentResolverError } from "../errors";
import { RoviGameFinishOutput } from "./outputs/rovi_game_finish_output";

@Service()
export default class RoviGameFinishResolver {
  constructor(
    @Inject("rovi.useCase") private readonly useCase: RoviGameUseCase,
  ) {}

  @Mutation(() => RoviGameFinishOutput)
  async roviGameFinish(
    @Arg("input") input: RoviGameFinishInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<RoviGameFinishOutput> {
    ctx = ctx.getChildContext(info);
    if (!input.isValid()) {
      throw new InvalidArgumentResolverError("parameter(s) is invalid");
    }
    try {
      const success = await this.useCase.finish(
        ctx,
        input.token,
        input.score,
        input.duration,
      );
      return new RoviGameFinishOutput(success);
    } catch (e) {
      ctx.log.warn(e, "Rovi game finish failed");
      return new RoviGameFinishOutput(false);
    }
  }
}
