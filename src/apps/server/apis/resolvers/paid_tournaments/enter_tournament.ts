import { Inject, Service } from "typedi";
import { Arg, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { EnterTournamentInput } from "./inputs/enter_tournament_input";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { PaidTournamentUseCase } from "../../../../../use_cases/paid_tournament_usecase";

@Service()
@Resolver()
export default class EnterTournament {
  constructor(
    @Inject("paidTournament.useCase")
    private readonly useCase: PaidTournamentUseCase,
  ) {}
  @Mutation(() => Boolean)
  async enterPaidTournament(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Arg("input") args: EnterTournamentInput,
  ) {
    ctx = ctx.getChildContext(info);
    if (args.tournamentId === "") {
      throw new InvalidArgumentResolverError("tournamentId required");
    }
    try {
      await this.useCase.enter(ctx, args.tournamentId);
      return true;
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
