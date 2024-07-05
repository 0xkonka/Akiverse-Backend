import { Context } from "../context";
import { ArcadePartCategory, CollectibleItemCategory } from "@prisma/client";
import { IllegalStateUseCaseError } from "./errors";
import {
  rewardArcadePart,
  rewardCollectibleItem,
  rewardJunkPart,
  rewardTeras,
} from "../helpers/rewards";
export interface RewardUseCase {
  acceptAll(ctx: Context): Promise<RewardDetail[]>;
}

type RewardDetailTeras = {
  itemType: "TERAS";
  amount: number;
};

type RewardDetailJunk = {
  itemType: "JUNK_PART";
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardDetailArcadePart = {
  itemType: "ARCADE_PART";
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardDetailCollectibleItem = {
  itemType: "COLLECTIBLE_ITEM";
  category: CollectibleItemCategory;
  subCategory: string;
  amount: number;
};

export type RewardDetail =
  | RewardDetailTeras
  | RewardDetailJunk
  | RewardDetailArcadePart
  | RewardDetailCollectibleItem;

export class RewardUseCaseImpl implements RewardUseCase {
  async acceptAll(ctx: Context): Promise<RewardDetail[]> {
    const now = new Date();
    const targets = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId,
        acceptedAt: null,
        OR: [{ availableUntil: null }, { availableUntil: { gte: now } }],
      },
    });

    if (targets.length === 0) {
      throw new IllegalStateUseCaseError(
        "There are no rewards that have not been receive",
      );
    }

    // ItemType,category,subCategory別に集計
    const rewardsMap = new Map<string, RewardDetail>();
    for (const target of targets) {
      const key = `${target.rewardItemType}-${target.category}-${target.subCategory}`;
      if (rewardsMap.has(key)) {
        const detail = rewardsMap.get(key)!;
        detail.amount = detail.amount + target.amount;
      } else {
        if (target.rewardItemType === "TERAS") {
          const detail = {
            itemType: target.rewardItemType,
            amount: target.amount,
          };
          rewardsMap.set(key, detail);
        } else if (target.rewardItemType === "COLLECTIBLE_ITEM") {
          const detail = {
            itemType: target.rewardItemType,
            category: target.category as CollectibleItemCategory,
            subCategory: target.subCategory!,
            amount: target.amount,
          };
          rewardsMap.set(key, detail);
        } else {
          const detail = {
            itemType: target.rewardItemType,
            category: target.category as ArcadePartCategory,
            subCategory: target.subCategory!,
            amount: target.amount,
          };
          rewardsMap.set(key, detail);
        }
      }
    }

    // queryを組み立てる
    const queries = [];

    // 受取日反映
    for (const target of targets) {
      queries.push(
        ctx.prisma.reward.update({
          where: { id: target.id, acceptedAt: null },
          data: {
            acceptedAt: now,
          },
        }),
      );
    }

    for (const detail of rewardsMap.values()) {
      switch (detail.itemType) {
        case "TERAS":
          queries.push(rewardTeras(ctx, detail.amount));
          break;
        case "JUNK_PART":
          queries.push(
            rewardJunkPart(
              ctx,
              detail.category,
              detail.subCategory,
              detail.amount,
            ),
          );
          break;
        case "ARCADE_PART":
          queries.push(
            ...rewardArcadePart(
              ctx,
              detail.category,
              detail.subCategory,
              detail.amount,
            ),
          );
          break;
        case "COLLECTIBLE_ITEM":
          queries.push(
            rewardCollectibleItem(ctx, detail.category, detail.subCategory),
          );
      }
    }
    await ctx.prisma.$transaction(queries);
    return [...rewardsMap.values()];
  }
}
