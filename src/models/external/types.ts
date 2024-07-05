import { Context } from "../../context";

export type QuestProgressFunc = (
  ctx: Context,
  startAt: Date,
) => Promise<number>;

// Prismaにも定義があるが、FEと共有するためにあえて再定義している
export type ArcadePartCategory =
  | "ROM"
  | "ACCUMULATOR"
  | "UPPER_CABINET"
  | "LOWER_CABINET";

export type RewardType =
  | RewardTerasType
  | RewardArcadePartType
  | RewardArcadePartRandomType
  | RewardJunkPartType
  | RewardJunkPartRandomType
  | RewardTitleType
  | RewardIconType
  | RewardFrameType;

type RewardTerasType = {
  itemType: "TERAS";
  amount: number;
};

type RewardArcadePartType = {
  itemType: "ARCADE_PART";
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardArcadePartRandomType = {
  itemType: "ARCADE_PART_RANDOM";
  amount: number;
};

type RewardJunkPartType = {
  itemType: "JUNK_PART";
  category: ArcadePartCategory;
  subCategory: string;
  amount: number;
};

type RewardJunkPartRandomType = {
  itemType: "JUNK_PART_RANDOM";
  amount: number;
};

type RewardTitleType = {
  itemType: "COLLECTIBLE_ITEM";
  category: "TITLE";
  subCategory: string;
  amount: 1;
};

type RewardIconType = {
  itemType: "COLLECTIBLE_ITEM";
  category: "ICON";
  subCategory: string;
  amount: 1;
};

type RewardFrameType = {
  itemType: "COLLECTIBLE_ITEM";
  category: "FRAME";
  subCategory: string;
  amount: 1;
};
