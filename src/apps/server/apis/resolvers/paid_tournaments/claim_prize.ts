import { Arg, Ctx, Info, Mutation, Resolver } from "type-graphql";

import { GraphQLResolveInfo } from "graphql";
import { Inject, Service } from "typedi";
import { PaidTournamentUseCase } from "../../../../../use_cases/paid_tournament_usecase";
import { ClaimPrizeInput } from "./inputs/claim_prize_input";
import { Context } from "../../../../../context";
import { toResolverError } from "../errors";

@Service()
@Resolver()
export default class ClaimPrizeResolver {
  constructor(
    @Inject("paidTournament.useCase")
    private readonly useCase: PaidTournamentUseCase,
  ) {}
  @Mutation(() => Boolean)
  async claimPrize(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Arg("input") args: ClaimPrizeInput,
  ): Promise<boolean> {
    ctx = ctx.getChildContext(info);
    try {
      await this.useCase.claimPrize(ctx, args.tournamentId, {
        walletAddress: args.walletAddress,
        phoneNumber: args.phoneNumber,
      });
      return true;
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
