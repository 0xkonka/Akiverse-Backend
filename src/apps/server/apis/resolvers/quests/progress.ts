import { Inject, Service } from "typedi";
import { QuestUseCase } from "../../../../../use_cases/quest_usecase";
import { Context } from "../../../../../context";
import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";
import { Quest } from "@generated/type-graphql";

@Service()
@Resolver(() => Quest)
export class QuestProgressFieldResolver {
  constructor(
    @Inject("quest.useCase")
    private readonly useCase: QuestUseCase,
  ) {}

  @FieldResolver(() => Number)
  async progress(@Root() quest: Quest, @Ctx() ctx: Context): Promise<number> {
    return await this.useCase.progress(
      ctx,
      quest.questMasterId,
      quest.completedAt,
      quest.startAt,
    );
  }
}
