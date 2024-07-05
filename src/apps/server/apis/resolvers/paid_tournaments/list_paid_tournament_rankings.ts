import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { ListPaidTournamentRankingsInput } from "./inputs/list_paid_tournament_rankings_input";
import { InvalidArgumentResolverError, toResolverError } from "../errors";
import { Inject, Service } from "typedi";
import { PaidTournamentUseCase } from "../../../../../use_cases/paid_tournament_usecase";
import {
  ListPaidTournamentRankingsOutput,
  PrizeClaimType,
} from "./outputs/list_paid_tournament_rankings_output";

@Service()
@Resolver()
export class ListPaidTournamentRankings {
  constructor(
    @Inject("paidTournament.useCase")
    private readonly useCase: PaidTournamentUseCase,
  ) {}
  @Query(() => ListPaidTournamentRankingsOutput)
  @Authorized()
  async listPaidTournamentRankings(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: ListPaidTournamentRankingsInput,
  ): Promise<ListPaidTournamentRankingsOutput> {
    ctx = ctx.getChildContext(info);
    if (!args.tournamentId) {
      throw new InvalidArgumentResolverError("tournamentId required");
    }
    try {
      const res = await this.useCase.getRanking(ctx, args.tournamentId);
      if (res.prizes && ctx.country) {
        return new ListPaidTournamentRankingsOutput(res.rankings, {
          claimType:
            ctx.country.toUpperCase() === "ID" // インドネシアのみ電話番号で送金
              ? PrizeClaimType.PHONE_NUMBER
              : PrizeClaimType.WALLET_ADDRESS,
          teras: res.prizes.teras,
          localCurrency: res.prizes.localCurrency,
          crypt: res.prizes.crypt,
        });
      }
      return new ListPaidTournamentRankingsOutput(res.rankings);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
