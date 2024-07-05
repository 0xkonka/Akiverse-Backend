import { ArgsType, Field, InputType } from "type-graphql";
import {
  DateTimeFilter,
  RewardOrderByWithRelationInput,
  StringNullableFilter,
  EnumRewardItemTypeFilter,
  IntNullableFilter,
  DateTimeNullableFilter,
} from "@generated/type-graphql";

@InputType()
class CurrentUserRewardWhereInput {
  @Field(() => [CurrentUserRewardWhereInput], { nullable: true })
  AND?: CurrentUserRewardWhereInput[];

  @Field(() => [CurrentUserRewardWhereInput], { nullable: true })
  OR?: CurrentUserRewardWhereInput[];

  @Field(() => [CurrentUserRewardWhereInput], { nullable: true })
  NOT?: CurrentUserRewardWhereInput[];

  @Field(() => StringNullableFilter, { nullable: true })
  title?: StringNullableFilter | undefined;

  @Field(() => DateTimeFilter, { nullable: true })
  createdAt?: DateTimeFilter | undefined;

  @Field(() => EnumRewardItemTypeFilter, { nullable: true })
  rewardItemType?: EnumRewardItemTypeFilter | undefined;

  @Field(() => StringNullableFilter, { nullable: true })
  category?: StringNullableFilter | undefined;

  @Field(() => StringNullableFilter, { nullable: true })
  subCategory?: StringNullableFilter | undefined;

  @Field(() => IntNullableFilter, { nullable: true })
  amount?: IntNullableFilter | undefined;

  @Field(() => DateTimeNullableFilter, { nullable: true })
  availableUntil?: DateTimeNullableFilter | undefined;

  @Field(() => DateTimeNullableFilter, { nullable: true })
  acceptedAt?: DateTimeNullableFilter | undefined;
}

@ArgsType()
export class RewardsArgs {
  @Field(() => CurrentUserRewardWhereInput, { nullable: true })
  where?: CurrentUserRewardWhereInput;

  @Field(() => RewardOrderByWithRelationInput, { nullable: true })
  orderBy?: RewardOrderByWithRelationInput[] | undefined;

  @Field(() => String, { nullable: true })
  cursor?: string | undefined;

  @Field(() => Number, { nullable: true })
  take?: number | undefined;

  @Field(() => Number, { nullable: true })
  skip?: number | undefined;
}
