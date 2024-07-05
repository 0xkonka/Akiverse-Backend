import { Args, Ctx, Info, Query, Resolver } from "type-graphql";
import { Service } from "typedi";
import { Banner as Output } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { FindManyBannerArgs } from "@generated/type-graphql";
import { Banner } from "@prisma/client";
import { filterTargetsByCountryAndExclusion } from "../../../../../helpers/country_filter";

@Service()
@Resolver(() => Output)
export class CustomFindManyBannersResolver {
  @Query(() => [Output])
  async listBanners(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: FindManyBannerArgs,
  ): Promise<Banner[]> {
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
    const banners = await ctx.prisma.banner.findMany(findManyArgs);
    // 地域制限を適用する
    return filterTargetsByCountryAndExclusion<Banner>(banners, ctx.country);
  }
}
