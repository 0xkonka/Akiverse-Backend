import { GraphQLResolveInfo } from "graphql";
import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { ListRankingsInput } from "./inputs/list_rankings_input";
import { Inject, Service } from "typedi";
import { RankingUseCase } from "../../../../../use_cases/ranking_usecase";
import { toResolverError } from "../errors";
import { ListRankingsOutput } from "./outputs/list_rankings_output";

@Resolver()
@Service()
export class RankingsResolver {
  constructor(
    @Inject("ranking.useCase")
    private readonly useCase: RankingUseCase,
  ) {}
  @Query(() => ListRankingsOutput)
  @Authorized()
  async listRankings(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: ListRankingsInput,
  ): Promise<ListRankingsOutput> {
    ctx = ctx.getChildContext(info);
    try {
      const res = await this.useCase.getRanking(
        ctx,
        args.rankingId!,
        new Date(),
      );
      return new ListRankingsOutput(res);
    } catch (e) {
      throw toResolverError(ctx, e);
    }
  }
}
