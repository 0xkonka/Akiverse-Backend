import { FieldResolver, Resolver, Root } from "type-graphql";

import { Service } from "typedi";
import { Reward } from "@generated/type-graphql";
import {
  getArcadePartMetadata,
  getJunkMetadata,
} from "../../../../../metadata/arcade-parts";
import { ArcadePartCategory, CollectibleItemCategory } from "@prisma/client";
import { getCollectibleItemName } from "../../../../../metadata/collectible_items";

@Service()
@Resolver(() => Reward)
export default class RewardNameResolver {
  @FieldResolver(() => String)
  name(@Root() reward: Reward): string {
    switch (reward.rewardItemType) {
      case "TERAS":
        return "Teras";
      case "JUNK_PART":
        return getJunkMetadata(
          reward.category as ArcadePartCategory,
          reward.subCategory!,
        ).name;
      case "ARCADE_PART":
        return getArcadePartMetadata(
          reward.category as ArcadePartCategory,
          reward.subCategory!,
        ).name!;
      case "COLLECTIBLE_ITEM":
        return getCollectibleItemName(
          reward.category as CollectibleItemCategory,
          reward.subCategory!,
        );
    }
  }
}
