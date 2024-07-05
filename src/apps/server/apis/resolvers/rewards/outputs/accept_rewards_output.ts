import { Field, ObjectType } from "type-graphql";
import { RewardItemType } from "@prisma/client";
import { RewardDetail } from "../../../../../../use_cases/reward_usecase";
import {
  getArcadePartMetadata,
  getJunkMetadata,
} from "../../../../../../metadata/arcade-parts";
import { getCollectibleItemName } from "../../../../../../metadata/collectible_items";

export type AcceptRewardDetail = {
  itemType: RewardItemType;
  name: string;
  category: string | null;
  subCategory: string | null;
  amount: number;
};

@ObjectType()
export class AcceptRewardsOutput {
  constructor(items: RewardDetail[]) {
    this.rewards = items.map((value) => new AcceptReward(convert(value)));
  }

  @Field(() => [AcceptReward])
  rewards: AcceptReward[];
}

@ObjectType()
export class AcceptReward {
  constructor(item: AcceptRewardDetail) {
    this.itemType = item.itemType;
    this.category = item.category;
    this.subCategory = item.subCategory;
    this.name = item.name;
    this.amount = item.amount;
  }
  @Field(() => String)
  itemType: RewardItemType;

  @Field(() => String, { nullable: true })
  category: string | null;

  @Field(() => String, { nullable: true })
  subCategory: string | null;

  @Field(() => String)
  name: string;

  @Field(() => Number)
  amount: number;
}

export function convert(detail: RewardDetail): AcceptRewardDetail {
  switch (detail.itemType) {
    case "JUNK_PART":
      return {
        name: getJunkMetadata(detail.category, detail.subCategory).name,
        itemType: detail.itemType,
        category: detail.category,
        subCategory: detail.subCategory,
        amount: detail.amount,
      };
    case "ARCADE_PART":
      return {
        name: getArcadePartMetadata(detail.category, detail.subCategory).name!,
        itemType: detail.itemType,
        category: detail.category,
        subCategory: detail.subCategory,
        amount: detail.amount,
      };
    case "TERAS":
      return {
        name: "Teras",
        itemType: detail.itemType,
        category: null,
        subCategory: null,
        amount: detail.amount,
      };

    case "COLLECTIBLE_ITEM":
      return {
        name: getCollectibleItemName(detail.category, detail.subCategory),
        itemType: detail.itemType,
        category: detail.category,
        subCategory: detail.subCategory,
        amount: detail.amount,
      };
  }
}
