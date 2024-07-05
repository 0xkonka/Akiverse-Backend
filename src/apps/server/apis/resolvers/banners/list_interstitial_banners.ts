import { Args, Ctx, Info, Query, Resolver } from "type-graphql";
import { InterstitialBanner as Output } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { Service } from "typedi";
import { FindManyInterstitialBannerArgs } from "@generated/type-graphql";
import { InterstitialBanner } from "@prisma/client";
import { filterTargetsByCountryAndExclusion } from "../../../../../helpers/country_filter";

@Service()
@Resolver(() => Output)
export class CustomFindManyInterstitialBannersResolver {
  @Query(() => [Output])
  async listInterstitialBanners(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: FindManyInterstitialBannerArgs,
  ): Promise<InterstitialBanner[]> {
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
    const banners = await ctx.prisma.interstitialBanner.findMany(findManyArgs);
    // 地域制限を適用する
    return filterTargetsByCountryAndExclusion<InterstitialBanner>(
      banners,
      ctx.country,
    );
  }
}
