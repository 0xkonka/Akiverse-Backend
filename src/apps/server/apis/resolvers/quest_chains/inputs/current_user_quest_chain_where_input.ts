import {
  DateTimeFilter,
  DateTimeNullableFilter,
  StringFilter,
  BoolFilter,
  QuestListRelationFilter,
  QuestChainOrderByWithRelationInput,
} from "@generated/type-graphql";
import { ArgsType, Field, InputType } from "type-graphql";

@InputType()
export class CurrentUserQuestChainWhereInput {
  @Field(() => [CurrentUserQuestChainWhereInput], { nullable: true })
  AND?: CurrentUserQuestChainWhereInput[] | undefined;
  @Field(() => [CurrentUserQuestChainWhereInput], { nullable: true })
  OR?: CurrentUserQuestChainWhereInput[] | undefined;
  @Field(() => [CurrentUserQuestChainWhereInput], { nullable: true })
  NOT?: CurrentUserQuestChainWhereInput[] | undefined;
  @Field(() => DateTimeFilter, { nullable: true })
  createdAt?: DateTimeFilter | undefined;
  @Field(() => StringFilter, { nullable: true })
  questChainMasterId?: StringFilter | undefined;
  @Field(() => BoolFilter, { nullable: true })
  completed?: BoolFilter | undefined;
  @Field(() => DateTimeFilter, { nullable: true })
  acceptedAt?: DateTimeFilter | undefined;
  @Field(() => DateTimeNullableFilter, { nullable: true })
  expiredAt?: DateTimeNullableFilter | undefined;
  @Field(() => QuestListRelationFilter, { nullable: true })
  quests?: QuestListRelationFilter | undefined;
}

@ArgsType()
export class QuestChainsArgs {
  @Field(() => CurrentUserQuestChainWhereInput, { nullable: true })
  where?: CurrentUserQuestChainWhereInput;

  @Field(() => QuestChainOrderByWithRelationInput, { nullable: true })
  orderBy?: QuestChainOrderByWithRelationInput[] | undefined;

  @Field(() => String, { nullable: true })
  cursor?: string | undefined;

  @Field(() => Number, { nullable: true })
  take?: number | undefined;

  @Field(() => Number, { nullable: true })
  skip?: number | undefined;
}
