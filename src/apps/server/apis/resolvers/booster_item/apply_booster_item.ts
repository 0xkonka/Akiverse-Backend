import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";

import { GraphQLResolveInfo } from "graphql";
import { Inject, Service } from "typedi";
import { BoosterItemUseCase } from "../../../../../use_cases/booster_item_usecase";
import { ApplyBoosterItemInput } from "./inputs/apply_booster_item_input";
import { Context } from "../../../../../context";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import {
  ActiveBooster as ActiveBoosterOutput,
  ActiveBoosterForTournament as ActiveBoosterForTournamentOutput,
} from "@generated/type-graphql";
import { createUnionType } from "type-graphql";

@Service()
@Resolver()
export default class ApplyBoosterItemResolver {
  constructor(
    @Inject("boosterItem.useCase")
    private readonly useCase: BoosterItemUseCase,
  ) {}

  @Authorized()
  @Mutation(() => ActiveBoosterUnionOutput)
  async applyBoosterItem(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Arg("input") args: ApplyBoosterItemInput,
  ) {
    ctx = ctx.getChildContext(info);
    const { boosterItemId, paidTournamentId } = args;
    if (!boosterItemId) {
      throw new InvalidArgumentResolverError("required parameter");
    }
    try {
      const ret = await this.useCase.apply(
        ctx,
        boosterItemId,
        paidTournamentId,
      );
      return ret;
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}

const ActiveBoosterUnionOutput = createUnionType({
  name: "ActiveBoosterUnionOutput", // Name of the GraphQL union
  types: () => [ActiveBoosterOutput, ActiveBoosterForTournamentOutput] as const, // function that returns tuple of object types classes
  resolveType: (value) => {
    if ("paidTournamentId" in value) {
      return ActiveBoosterForTournamentOutput;
    }
    return ActiveBoosterOutput;
  },
});
