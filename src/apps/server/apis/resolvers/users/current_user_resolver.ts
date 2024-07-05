import { Authorized, Ctx, Query, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { User } from "@generated/type-graphql";
import { Service } from "typedi";
import { NotFoundResolverError } from "../errors";

@Service()
@Resolver(() => User)
export default class CurrentUserResolver {
  @Authorized()
  @Query(() => User)
  async currentUser(@Ctx() ctx: Context) {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
    });
    if (user) {
      return user;
    }
    throw new NotFoundResolverError("user not found");
  }
}
