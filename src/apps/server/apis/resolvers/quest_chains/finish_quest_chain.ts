import { Inject, Service } from "typedi";
import { QuestUseCase } from "../../../../../use_cases/quest_usecase";
import { Arg, Authorized, Ctx, Info, Mutation, Resolver } from "type-graphql";
import { Context } from "../../../../../context";
import { GraphQLResolveInfo } from "graphql";
import { toResolverError } from "../errors";
import { FinishQuestChainOutput } from "./outputs/finish_quest_chain_output";
import { FinishQuestChainInput } from "./inputs/finish_quest_chain_input";

@Service()
@Resolver()
export class FinishQuestChainResolver {
  constructor(
    @Inject("quest.useCase")
    private readonly useCase: QuestUseCase,
  ) {}

  @Authorized()
  @Mutation(() => FinishQuestChainOutput)
  async finishQuestChain(
    @Ctx() ctx: Context,
    @Info() info: GraphQLResolveInfo,
    @Arg("input") input: FinishQuestChainInput,
  ): Promise<FinishQuestChainOutput> {
    ctx = ctx.getChildContext(info);
    try {
      const ret = await this.useCase.finishQuestChain(ctx, input.questMasterId);
      return new FinishQuestChainOutput(ret);
    } catch (e: unknown) {
      throw toResolverError(ctx, e);
    }
  }
}
