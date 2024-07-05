import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { Service } from "typedi";
import { PaidTournament } from "@generated/type-graphql";
import { Context } from "../../../../../context";

@Service()
@Resolver(() => PaidTournament)
export default class ClaimStatusResolver {
  @FieldResolver(() => Boolean)
  async claimStatus(
    @Root() paidTournament: PaidTournament,
    @Ctx() ctx: Context,
  ): Promise<boolean> {
    const t = await ctx.prisma.paidTournament.count({
      where: {
        id: paidTournament.id,
        entries: {
          some: {
            userId: ctx.userId!,
            prizeClaimed: true,
          },
        },
      },
    });
    return t > 0;
  }
}
