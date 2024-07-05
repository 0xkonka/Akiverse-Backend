import { ArcadePartCategory } from "@prisma/client";
import { Context } from "../context";
import { choice } from "../utils";
import { ArcadePartTypeId } from "../metadata/arcade-parts";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../constants";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(timezone);
dayjs.extend(utc);

type Reward = {
  teras: number; //配布するTeras量 0の場合もある
  aps: () => ArcadePartTypeId[]; // 配布するAP Empty配列の場合もある
  junks: () => {
    type: ArcadePartTypeId;
    amount: number;
  }[]; // 配布するJunk Empty配列の場合もある
};

// 2023/06/14 10:00 JST以降のプレイを対象にする
export const CAMPAIGN_START_DATE = dayjs(
  "2023-06-13 10:00",
  "yyyy-MM-dd HH:mm",
  TERM_TIME_ZONE,
).toDate();
export const CAMPAIGN_END_DATE = dayjs(
  "2023-08-21 03:00",
  "yyyy-MM-dd HH:mm",
  TERM_TIME_ZONE,
).toDate();

const playCount100RewardAPs = [
  { category: ArcadePartCategory.ROM, subCategory: "BUBBLE_ATTACK" },
  { category: ArcadePartCategory.ROM, subCategory: "CURVE_BALL_3D" },
  { category: ArcadePartCategory.ROM, subCategory: "STAR_GUARDIAN" },
  { category: ArcadePartCategory.ROM, subCategory: "YUMMY_JUMP" },
  {
    category: ArcadePartCategory.ACCUMULATOR,
    subCategory: "HOKUTO_100_LX",
  },
  {
    category: ArcadePartCategory.UPPER_CABINET,
    subCategory: "PLAIN",
  },
  {
    category: ArcadePartCategory.LOWER_CABINET,
    subCategory: "PLAIN",
  },
];

const playCountRewardMap = new Map<number, Reward>([
  [
    5,
    {
      teras: 0,
      aps: () => {
        return [
          {
            category: ArcadePartCategory.UPPER_CABINET,
            subCategory: "PLAIN",
          },
        ];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    10,
    {
      teras: 100,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    15,
    {
      teras: 150,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    20,
    {
      teras: 0,
      aps: () => {
        return [
          {
            category: ArcadePartCategory.LOWER_CABINET,
            subCategory: "PLAIN",
          },
        ];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    25,
    {
      teras: 250,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    30,
    {
      teras: 300,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    35,
    {
      teras: 0,
      aps: () => {
        return [
          {
            category: ArcadePartCategory.ACCUMULATOR,
            subCategory: "HOKUTO_100_LX",
          },
        ];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    40,
    {
      teras: 400,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    45,
    {
      teras: 450,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    50,
    {
      teras: 3500,
      aps: () => {
        // 初期リリースのROMから選択
        return [
          {
            category: ArcadePartCategory.ROM,
            subCategory: choice([
              "BUBBLE_ATTACK",
              "CURVE_BALL_3D",
              "STAR_GUARDIAN",
            ]),
          },
        ];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    60,
    {
      teras: 600,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    70,
    {
      teras: 700,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    80,
    {
      teras: 800,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    90,
    {
      teras: 900,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    100,
    {
      teras: 1000,
      aps: () => {
        // ランダムに2個配布
        return [choice(playCount100RewardAPs), choice(playCount100RewardAPs)];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    150,
    {
      teras: 1500,
      aps: () => {
        return [choice(playCount100RewardAPs)];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    200,
    {
      teras: 2000,
      aps: () => {
        return [choice(playCount100RewardAPs)];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    250,
    {
      teras: 2500,
      aps: () => {
        return [choice(playCount100RewardAPs)];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    300,
    {
      teras: 3000,
      aps: () => {
        return [choice(playCount100RewardAPs), choice(playCount100RewardAPs)];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    400,
    {
      teras: 4000,
      aps: () => {
        return [choice(playCount100RewardAPs), choice(playCount100RewardAPs)];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    500,
    {
      teras: 5000,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
  [
    5000,
    {
      teras: 50000,
      aps: () => {
        return [];
      },
      junks: () => {
        return [];
      },
    },
  ],
]);

// OBT P1だと配布対象なし
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sparkCountRewardMap = new Map<number, Reward>();

const craftCountRewardMap = new Map<number, Reward>([
  [
    1,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    2,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    3,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    4,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    5,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    6,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    7,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    8,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    9,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    10,
    {
      teras: 5000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    11,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    12,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    13,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    14,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    15,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    16,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    17,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    18,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    19,
    {
      teras: 1000,
      aps: () => [],
      junks: () => [],
    },
  ],
  [
    20,
    {
      teras: 10000,
      aps: () => [],
      junks: () => [],
    },
  ],
]);

// ユーザーのプレイ回数が一定回数の場合、リワードを付与する
export async function distributionRewardPlayCount(
  ctx: Context,
  playerId: string,
): Promise<void> {
  const now = dayjs.tz(Date(), TERM_TIME_ZONE).toDate();
  if (now >= CAMPAIGN_END_DATE) {
    return;
  }

  const playCount = await ctx.prisma.play.count({
    where: {
      playSession: {
        playerId,
      },
      createdAt: {
        gte: CAMPAIGN_START_DATE,
        lte: CAMPAIGN_END_DATE,
      },
    },
  });

  const reward = playCountRewardMap.get(playCount);

  // 配布対象がない
  if (!reward) return;
  await distributionReward(ctx, playerId, reward);
}

// ユーザーのSpark回数が一定回数の場合、リワードを付与する
export async function distributionRewardSparkCount(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: Context,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  playerId: string,
): Promise<void> {
  // OBT P1だと配布対象がない
  return;
}

// ユーザーのCraft回数が一定回数の場合、リワードを付与する
export async function distributionRewardCraftCount(
  ctx: Context,
): Promise<void> {
  const now = dayjs.tz(Date(), TERM_TIME_ZONE).toDate();
  if (now >= CAMPAIGN_END_DATE) {
    return;
  }
  const craftCount = await ctx.prisma.craft.count({
    where: {
      userId: ctx.userId!,
      createdAt: {
        gte: CAMPAIGN_START_DATE,
        lte: CAMPAIGN_END_DATE,
      },
    },
  });
  const reward = craftCountRewardMap.get(craftCount);
  if (!reward) return;

  await distributionReward(ctx, ctx.userId!, reward);
}

export async function distributionReward(
  ctx: Context,
  userId: string,
  reward: Reward,
): Promise<void> {
  const user = await ctx.prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const queries = [];
  if (reward.teras > 0) {
    queries.push(
      ctx.prisma.user.update({
        where: { id: userId },
        data: {
          terasBalance: { increment: reward.teras },
        },
      }),
    );
  }

  const aps = reward.aps();
  if (aps.length > 0) {
    for (const ap of aps) {
      queries.push(
        ctx.prisma.arcadePart.create({
          data: {
            userId: user.id,
            ownerWalletAddress: user.walletAddress,
            state: "IN_AKIVERSE",
            ...ap,
          },
        }),
      );
    }
  }

  const junks = reward.junks();
  if (junks.length > 0) {
    for (const junk of junks) {
      queries.push(
        ctx.prisma.junk.upsert({
          where: {
            userId_category_subCategory: {
              userId: userId,
              category: junk.type.category,
              subCategory: junk.type.subCategory,
            },
          },
          create: {
            userId: userId,
            category: junk.type.category,
            subCategory: junk.type.subCategory,
            amount: junk.amount,
          },
          update: {
            amount: {
              increment: junk.amount,
            },
          },
        }),
      );
    }
  }

  await ctx.prisma.$transaction(queries);
}
