import { ArcadeMachineUseCase } from "../../../../../use_cases/arcade_machine_usecase";
import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { DismantleInput } from "./inputs/dismantle_input";
import { DismantleOutput } from "./output/dismantle_output";
import { toResolverError } from "../errors";

@Service()
export default class DismantleResolver {
  constructor(
    @Inject("arcadeMachine.useCase")
    private readonly useCase: ArcadeMachineUseCase,
  ) {}

  @Authorized()
  @Mutation(() => DismantleOutput)
  async dismantle(
    @Arg("input") input: DismantleInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      const ret = await this.useCase.dismantle(
        ctx,
        input.arcadeMachineId,
        input.usedCurrency,
      );
      return new DismantleOutput(
        ret.rom,
        ret.upperCabinet,
        ret.upperCabinetGradeUp,
        ret.lowerCabinet,
        ret.lowerCabinetGradeUp,
      );
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
