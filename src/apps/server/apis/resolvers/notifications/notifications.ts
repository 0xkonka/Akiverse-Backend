import { Notification as Output } from "@generated/type-graphql";
import { Service } from "typedi";
import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { GraphQLResolveInfo } from "graphql";
import { Notification } from "@prisma/client";
import { Context } from "../../../../../context";
import { NotificationsArgs } from "./inputs/notifications";

@Service()
@Resolver(() => Output)
export class CustomFindManyNotificationsResolver {
  @Authorized()
  @Query(() => [Output], { description: "current user's notifications" })
  async currentUserNotifications(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: NotificationsArgs,
  ): Promise<Notification[]> {
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

    return ctx.prisma.notification.findMany(findManyArgs);
  }
}
