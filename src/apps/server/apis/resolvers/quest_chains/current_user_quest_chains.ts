import { GraphQLResolveInfo } from "graphql";
import { QuestChain } from "@prisma/client";
import { Args, Authorized, Ctx, Info, Query, Resolver } from "type-graphql";
import { QuestChain as Output } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { QuestChainsArgs } from "./inputs/current_user_quest_chain_where_input";
import { Inject, Service } from "typedi";
import { QuestProgressChecker } from "../../../../../helpers/quests";

@Service()
@Resolver(() => Output)
export class CustomFindManyQuestChainsResolver {
  constructor(
    @Inject("questProgressChecker")
    private readonly questChecker: QuestProgressChecker,
  ) {}
  @Authorized()
  @Query(() => [Output])
  async currentUserQuestChains(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Args() args: QuestChainsArgs,
  ): Promise<QuestChain[]> {
    // ゲームのコネクションタイムアウトなど、正常に終了しなかったクエストを更新する
    await this.questChecker.checkAndUpdate(ctx);

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
    return ctx.prisma.questChain.findMany(findManyArgs);
  }
}
