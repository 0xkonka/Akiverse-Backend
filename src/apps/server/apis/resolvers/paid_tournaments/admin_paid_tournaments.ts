import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { Service } from "typedi";
import {
  FindManyPaidTournamentArgs,
  FindManyPaidTournamentResolver,
} from "@generated/type-graphql";
import { PaidTournament as Output } from "@generated/type-graphql";
import { ROLES } from "../../../auth";

@Service()
@Resolver(() => Output)
export default class AdminPaidTournamentsResolver extends FindManyPaidTournamentResolver {
  @Query(() => [Output])
  @Authorized(ROLES.ADMIN)
  async adminPaidTournaments(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() paidTournamentArgs: FindManyPaidTournamentArgs,
  ) {
    return super.paidTournaments(ctx, info, paidTournamentArgs);
  }
}
