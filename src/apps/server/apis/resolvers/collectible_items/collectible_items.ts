import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { Service } from "typedi";
import { CollectibleItemsArgs } from "./inputs/collectible_items_input";
import { CollectibleItem as Output } from "@generated/type-graphql";

@Service()
@Resolver(() => Output)
export class CustomFindManyCollectibleItemsResolver {
  @Authorized()
  @Query(() => [Output])
  async currentUserCollectibleItems(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: CollectibleItemsArgs,
  ) {
    ctx = ctx.getChildContext(info);

    const findManyArgs = Object();
    findManyArgs.where = {
      userId: ctx.userId,
      ...args.where,
    };
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

    return ctx.prisma.collectibleItem.findMany(findManyArgs);
  }
}
