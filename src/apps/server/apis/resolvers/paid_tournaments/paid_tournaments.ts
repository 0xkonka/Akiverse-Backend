import { Args, Ctx, Info, Query, Resolver } from "type-graphql";
import { Service } from "typedi";
import { Context } from "../../../../../context";
import { PaidTournament as Output } from "@generated/type-graphql";
import { GraphQLResolveInfo } from "graphql";
import { FindManyPaidTournamentArgs } from "@generated/type-graphql";
import { PaidTournament } from "@prisma/client";
import { filterTargetsByCountryAndExclusion } from "../../../../../helpers/country_filter";
@Service()
@Resolver(() => Output)
export default class PaidTournamentsResolver {
  @Query(() => [Output])
  async paidTournaments(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: FindManyPaidTournamentArgs,
  ): Promise<PaidTournament[]> {
    const findManyArgs = Object();
    if (args.where) {
      findManyArgs.where = args.where;
    }
    if (args.skip) {
      findManyArgs.skip = args.skip;
    }
    if (args.take) {
      findManyArgs.take = args.take;
    }
    if (args.orderBy) {
      findManyArgs.orderBy = args.orderBy;
    }
    if (args.cursor) {
      findManyArgs.cursor = {
        id: args.cursor,
      };
    }
    if (args.distinct) {
      findManyArgs.distinct = args.distinct;
    }
    findManyArgs.include = {
      _count: true,
    };

    const paidTournaments =
      await ctx.prisma.paidTournament.findMany(findManyArgs);
    return filterTargetsByCountryAndExclusion<PaidTournament>(
      paidTournaments,
      ctx.country,
    );
  }
}
