import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { Service } from "typedi";
import { PaidTournament } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { canExchangePrize } from "../../../../../helpers/paid_tournament";

@Service()
@Resolver(() => PaidTournament)
export default class BadgeResolver {
  @FieldResolver(() => Boolean)
  async badge(
    @Root() paidTournament: PaidTournament,
    @Ctx() ctx: Context,
  ): Promise<boolean> {
    return await canExchangePrize(
      ctx,
      paidTournament.endAt,
      paidTournament.prizeTerasOnly,
    );
  }
}
