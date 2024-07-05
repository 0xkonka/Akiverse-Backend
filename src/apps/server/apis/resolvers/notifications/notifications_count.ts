import { Service } from "typedi";
import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { GraphQLResolveInfo } from "graphql";
import { Context } from "../../../../../context";
import { NotificationsCountArgs } from "./inputs/notifications";
import { NotificationCountOutput } from "./outputs/notification_count_output";

@Service()
@Resolver(() => NotificationCountOutput)
export class CountNotificationsResolver {
  @Authorized()
  @Query(() => NotificationCountOutput, {
    description: "current user's notifications count",
  })
  async currentUserNotificationsCount(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: NotificationsCountArgs,
  ): Promise<NotificationCountOutput> {
    const findManyArgs = Object();
    findManyArgs.where = {
      userId: ctx.userId,
      ...args.where,
    };
    const count = await ctx.prisma.notification.count(findManyArgs);
    return { count: count };
  }
}
