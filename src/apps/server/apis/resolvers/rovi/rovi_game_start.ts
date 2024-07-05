import { Inject, Service } from "typedi";
import { Arg, Ctx, Info, Mutation } from "type-graphql";
import { RoviGameStartInput } from "./inputs/rovi_game_start_input";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../../../../../context";
import { RobiGameStartOutput } from "./outputs/rovi_game_start_output";
import { RoviGameUseCase } from "../../../../../use_cases/rovi_game_usecase";
import { InvalidArgumentResolverError } from "../errors";

@Service()
export default class RoviGameStartResolver {
  constructor(
    @Inject("rovi.useCase") private readonly useCase: RoviGameUseCase,
  ) {}

  @Mutation(() => RobiGameStartOutput)
  async roviGameStart(
    @Arg("input") input: RoviGameStartInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ): Promise<RobiGameStartOutput> {
    ctx = ctx.getChildContext(info);
    if (input.data.length === 0) {
      throw new InvalidArgumentResolverError("data required");
    }
    const playToken = await this.useCase.start(ctx, input.data);
    return new RobiGameStartOutput(playToken);
  }
}
