import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { RewardType } from "../types";

dayjs.extend(timezone);
dayjs.extend(utc);

// constants.tsを読んでしまうとnpmパッケージ化した時に不要なソースもまとめてパッケージ化されるので、敢えて再定義している。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TIME_ZONE = "Asia/Tokyo";

type EventPrefix = "EVENT";
export type EventIdType = `${EventPrefix}_${string}`;
export type RankingType = RankingSparkType | RankingCraftType | RankingRateType;
export type RankingRewardType = {
  title: string;
  seq: number;
  rewards: RewardType[];
};

export type RankingSparkType = {
  id: EventIdType;
  seq: number;
  title: string;
  startAt: Date;
  endAt: Date;
  actionType: "SPARK" | "MEGA_SPARK";
  rewards: RankingRewardType[];
  lowestRankNumber: number;
  targetGames?: string[]; // undefined is all game
};

export type RankingCraftType = {
  id: EventIdType;
  seq: number;
  title: string;
  startAt: Date;
  endAt: Date;
  actionType: "CRAFT";
  rewards: RankingRewardType[];
  lowestRankNumber: number;
};

export type RankingRateType = {
  id: EventIdType;
  seq: number;
  title: string;
  startAt: Date;
  endAt: Date;
  actionType: "SPARK_RATE";
  minActionCount: number;
  rewards: RankingRewardType[];
  lowestRankNumber: number;
  targetGames?: string[]; // undefined is all game
};

export const EventRankings: Record<string, RankingType> = {
  // EVENT_1: {
  //   id: "EVENT_1",
  //   seq: 1,
  //   title: "Sample",
  //   startAt: dayjs
  //     .tz("2023-10-01 16:00", "YYYY-MM-DD HH:mm", TIME_ZONE)
  //     .toDate(),
  //   endAt: dayjs.tz("2023-12-31 16:00", "YYYY-MM-DD HH:mm", TIME_ZONE).toDate(),
  //   actionType: "SPARK",
  //   rewards: [
  //     {
  //       title: "reward title 1",
  //       seq: 1,
  //       rewards: [
  //         {
  //           itemType: "TERAS",
  //           amount: 1000,
  //         },
  //       ],
  //     },
  //     {
  //       title: "reward title 2",
  //       seq: 2,
  //       rewards: [
  //         {
  //           itemType: "TERAS",
  //           amount: 500,
  //         },
  //       ],
  //     },
  //   ],
  //   lowestRankNumber: 999,
  // },
  EVENT_CHRISTMAS_2023: {
    id: "EVENT_CHRISTMAS_2023",
    seq: 1,
    title: "Xmas Mythic Ranking",
    startAt: dayjs
      .tz("2023-12-25 16:00", "YYYY-MM-DD HH:mm", TIME_ZONE)
      .toDate(),
    endAt: dayjs("2023-12-29 0:00", "YYYY-MM-DD HH:mm", TIME_ZONE).toDate(),
    actionType: "SPARK",
    rewards: [
      {
        title: "1st to 5th place",
        seq: 1,
        rewards: [
          {
            itemType: "JUNK_PART_RANDOM",
            amount: 1,
          },
        ],
      },
    ],
    lowestRankNumber: 999,
    targetGames: ["MYTHIC_MATCH"],
  },
};
