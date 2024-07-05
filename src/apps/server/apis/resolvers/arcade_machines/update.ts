import { Resolver, Mutation, Arg, Ctx, Authorized, Info } from "type-graphql";
import { ArcadeMachine } from "@generated/type-graphql";

import { Context } from "../../../../../context";
import ArcadeMachineUseCase from "../../../../../use_cases/arcade_machine_usecase";
import { toResolverError } from "../errors";

import { Inject, Service } from "typedi";
import { GraphQLResolveInfo } from "graphql";
import { UpdateArcadeMachineInput } from "./inputs/update_input";

@Service()
@Resolver(() => ArcadeMachine)
export default class ArcadeMachineUpdateResolver {
  constructor(
    @Inject("arcadeMachine.useCase")
    private readonly useCase: ArcadeMachineUseCase,
  ) {}

  @Authorized()
  @Mutation(() => ArcadeMachine)
  public async updateArcadeMachine(
    @Arg("input") input: UpdateArcadeMachineInput,
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
  ) {
    ctx = ctx.getChildContext(info);
    try {
      return await this.useCase.update(
        ctx,
        input.arcadeMachineId,
        input.autoRenewLease,
      );
    } catch (e) {
      ctx.log.error(e, "handled error");
      throw toResolverError(ctx, e);
    }
  }
}
