import { Context } from "../context";
import {
  ArcadePart,
  ArcadePartCategory,
  CollectibleItemCategory,
  Junk,
  Prisma,
} from "@prisma/client";
import { choice } from "../utils";

type DistributableArcadePartType = {
  category: ArcadePartCategory;
  subCategory: string;
};
export const availableRewardArcadeParts: DistributableArcadePartType[] = [
  {
    category: "ROM",
    subCategory: "BUBBLE_ATTACK",
  },
  {
    category: "ROM",
    subCategory: "STAR_GUARDIAN",
  },
  {
    category: "ROM",
    subCategory: "YUMMY_JUMP",
  },
  {
    category: "ROM",
    subCategory: "CYBER_PINBALL",
  },
  {
    category: "ROM",
    subCategory: "NEON_BLITZ",
  },
  {
    category: "ROM",
    subCategory: "SUPER_SNAKE",
  },
  {
    category: "ROM",
    subCategory: "NEON_PONG",
  },
  {
    category: "ROM",
    subCategory: "MYTHIC_MATCH",
  },
  {
    category: "ROM",
    subCategory: "AKIBA_FC",
  },
  {
    category: "ROM",
    subCategory: "NEON_SNAP",
  },
  {
    category: "ROM",
    subCategory: "NINJA_GO_GO",
  },
  {
    category: "ROM",
    subCategory: "MYTHIC_SWING",
  },
  {
    category: "ACCUMULATOR",
    subCategory: "HOKUTO_100_LX",
  },
  {
    category: "UPPER_CABINET",
    subCategory: "PLAIN",
  },
  {
    category: "LOWER_CABINET",
    subCategory: "PLAIN",
  },
];

type Reward = {
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardRandomResponse = {
  queries:
    | Prisma.Prisma__ArcadePartClient<ArcadePart>[]
    | Prisma.Prisma__JunkClient<Junk>[];
  rewards: Reward[];
};

export function rewardArcadePart(
  ctx: Context,
  category: ArcadePartCategory,
  subCategory: string,
  amount: number = 1,
) {
  const ret = [];
  for (let i = 0; i < amount; i++) {
    ret.push(
      ctx.prisma.arcadePart.create({
        data: {
          userId: ctx.userId,
          ownerWalletAddress: ctx.walletAddress,
          category: category,
          subCategory: subCategory,
          state: "IN_AKIVERSE",
        },
      }),
    );
  }

  return ret;
}

export function rewardRandomArcadePart(
  ctx: Context,
  amount: number = 1,
): RewardRandomResponse {
  const ret = [];
  const rewards = new Map<MapKey, Reward>();

  for (let i = 0; i < amount; i++) {
    const picked = choice(availableRewardArcadeParts);
    ret.push(...rewardArcadePart(ctx, picked.category, picked.subCategory, 1));
    const key: MapKey = `${picked.category}-${picked.subCategory}`;
    let amount = 0;
    if (rewards.has(key)) {
      amount = rewards.get(key)!.amount;
    }
    amount++;
    rewards.set(key, {
      category: picked.category,
      subCategory: picked.subCategory,
      amount,
    });
  }
  return {
    queries: ret,
    rewards: [...rewards.values()],
  };
}

export function rewardTeras(ctx: Context, amount: number) {
  return ctx.prisma.user.update({
    where: { id: ctx.userId },
    data: {
      terasBalance: {
        increment: amount,
      },
    },
  });
}

export function rewardJunkPart(
  ctx: Context,
  category: ArcadePartCategory,
  subCategory: string,
  amount: number,
) {
  return ctx.prisma.junk.upsert({
    where: {
      userId_category_subCategory: {
        userId: ctx.userId!,
        category: category,
        subCategory: subCategory,
      },
    },
    update: {
      amount: {
        increment: amount,
      },
    },
    create: {
      userId: ctx.userId!,
      category: category,
      subCategory: subCategory,
      amount: amount,
    },
  });
}

type MapKey = `${ArcadePartCategory}-${string}`;
export function rewardRandomJunkPart(
  ctx: Context,
  amount: number,
): RewardRandomResponse {
  const map = new Map<MapKey, Reward>();
  for (let i = 0; i < amount; i++) {
    const picked = choice(availableRewardArcadeParts);
    const key: MapKey = `${picked.category}-${picked.subCategory}`;
    let amount = 0;
    if (map.has(key)) {
      amount = map.get(key)!.amount;
    }
    amount++;
    map.set(key, {
      category: picked.category,
      subCategory: picked.subCategory,
      amount: amount,
    });
  }
  const ret = [];
  for (const element of map.values()) {
    ret.push(
      rewardJunkPart(
        ctx,
        element.category,
        element.subCategory,
        element.amount,
      ),
    );
  }
  return {
    queries: ret,
    rewards: [...map.values()],
  };
}

export function rewardCollectibleItem(
  ctx: Context,
  category: CollectibleItemCategory,
  subCategory: string,
) {
  return ctx.prisma.collectibleItem.upsert({
    where: {
      userId_category_subCategory: {
        userId: ctx.userId!,
        category: category,
        subCategory: subCategory,
      },
    },
    create: {
      userId: ctx.userId!,
      category: category,
      subCategory: subCategory,
    },
    update: {
      // すでに持っている場合は無視
    },
  });
}
