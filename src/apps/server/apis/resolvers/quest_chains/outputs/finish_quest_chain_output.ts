import { QuestChain } from "@prisma/client";
import { Field, ObjectType } from "type-graphql";
import {
  AcceptReward,
  convert,
} from "../../rewards/outputs/accept_rewards_output";
import { RewardDetail } from "../../../../../../use_cases/quest_usecase";
import { QuestChain as Output } from "@generated/type-graphql";

type FinishQuestChainResponse = QuestChain & {
  rewards: RewardDetail[];
};
@ObjectType()
export class FinishQuestChainOutput {
  constructor(chain: FinishQuestChainResponse) {
    this.questChain = chain;
    this.rewards = chain.rewards.map(
      (value) => new AcceptReward(convert(value)),
    );
  }
  @Field(() => Output)
  questChain: QuestChain;
  @Field(() => [AcceptReward])
  rewards: AcceptReward[];
}
