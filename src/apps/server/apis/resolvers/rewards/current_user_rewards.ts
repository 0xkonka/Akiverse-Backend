import { Service } from "typedi";
import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { Reward as Output } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { RewardsArgs } from "./inputs/current_user_reward_where_input";
import { Reward } from "@prisma/client";

@Service()
@Resolver(() => Output)
export class CustomFindManyRewardsResolver {
  @Authorized()
  @Query(() => [Output])
  async currentUserRewards(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: RewardsArgs,
  ): Promise<Reward[]> {
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
    return ctx.prisma.reward.findMany(findManyArgs);
  }
}
