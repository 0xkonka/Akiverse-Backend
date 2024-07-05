import { GraphQLResolveInfo } from "graphql";
import { QuestChain } from "@generated/type-graphql";
import { Context } from "../../../../../context";
import { Inject, Service } from "typedi";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { QuestUseCase } from "../../../../../use_cases/quest_usecase";
import { toResolverError } from "../errors";
import { StartQuestChainInput } from "./inputs/start_quest_chain_input";

@Service()
@Resolver(() => QuestChain)
export class StartQuestChainResolver {
  constructor(
    @Inject("quest.useCase")
    private readonly useCase: QuestUseCase,
  ) {}
  @Authorized()
  @Mutation(() => QuestChain)
  async startQuestChain(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Arg("input") input: StartQuestChainInput,
  ): Promise<QuestChain> {
    ctx = ctx.getChildContext(info);
    try {
      return this.useCase.startQuestChain(
        ctx,
        input.questMasterId,
        input.usedCurrency,
      );
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
