import dayjs from "dayjs";
import { RankingType } from "../models/external/ranking";
import { InternalServerUseCaseError } from "../use_cases/errors";
import { getSecondsDifference } from "./datetime";
import { TERM_TIME_ZONE } from "../constants";
import { redisClient } from "../redis";
import { IconType, User } from "@prisma/client";
import { toHandlerError } from "../apps/server/apis/rest_apis/errors";
import { Context } from "../context";

export type RegularRankingType = "SPARK" | "MEGA_SPARK";
export type CountType = "SPARK" | "MEGA_SPARK";
export type RateType = "SPARK_RATE";

// BigIntで整数を浮動小数表記せずに保持できる最大ビット数
const BIGINT_MAX_SAFE_BIT_NUM = 53n;

// カウントタイプの場合は上位30bitが実際のスコア
const COUNT_SCORE_BIT_NUM = 30n;
export const COUNT_SCORE_LEFT_SHIFT_NUM =
  BIGINT_MAX_SAFE_BIT_NUM - COUNT_SCORE_BIT_NUM;

// パーセントの場合は上位14bitが実際のスコア、15bit〜30bitが試行回数
const RATE_SCORE_BIT_NUM = 14n;
const RATE_COUNT_BIT_NUM = 16n;
export const RATE_SCORE_LEFT_SHIFT_NUM =
  BIGINT_MAX_SAFE_BIT_NUM - RATE_SCORE_BIT_NUM;
export const RATE_COUNT_LEFT_SHIFT_NUM =
  BIGINT_MAX_SAFE_BIT_NUM - (RATE_COUNT_BIT_NUM + RATE_SCORE_BIT_NUM);

// CombinedRateScoreに設定可能な最大カウント
export const RATE_MAX_COUNT = Number((1n << RATE_COUNT_BIT_NUM) - 1n);

/**
 * Calculates the combined count score based on the given parameters.
 *
 * @param {number} score - The score value. e.g. spark count/craft count
 * @param {Date} date - Now date.
 * @param {Date} endDate - The event/term end date.
 *
 * @return {number} - The calculated combined count score.
 */
export function getCombinedCountScore(
  score: number,
  date: Date,
  endDate: Date,
): number {
  if (score < 0) {
    throw new InternalServerUseCaseError("score must be a positive integer");
  }
  const timestamp = BigInt(getSecondsDifference(date, endDate));
  if (timestamp < 0) {
    throw new InternalServerUseCaseError("date must be before endDate");
  }
  // スコアが設定されるビットを0で埋めてtimestampが指定ビットより大きくなってもスコアに影響させない
  const maskedTimestamp = timestamp & ((1n << COUNT_SCORE_LEFT_SHIFT_NUM) - 1n);

  const combinedScore =
    (BigInt(score) << COUNT_SCORE_LEFT_SHIFT_NUM) | maskedTimestamp;
  return Number(combinedScore);
}

/**
 * Obtains the original count score from a combined score.
 *
 * @param {number} combinedScore - The combined score to extract the original count score from.
 * @return {number} - The original count score extracted from the combined score.
 */
export function getSeparatedCountScore(combinedScore: number): number {
  const toBig = BigInt(combinedScore);
  const originalScore = toBig >> COUNT_SCORE_LEFT_SHIFT_NUM;
  return Number(originalScore);
}

/**
 * Calculates the combined rate score based on the given rate, count, date, and endDate.
 *
 * @param {number} rate - The rate value. e.g. 100.00 / 12.555 etc
 * @param {number} count - The count value.
 * @param {Date} date - Now date.
 * @param {Date} endDate - The event/term end date.
 * @returns {number} The combined rate score.
 */
export function getCombinedRateScore(
  rate: number,
  count: number,
  date: Date,
  endDate: Date,
): number {
  if (rate < 0 || count < 0) {
    throw new InternalServerUseCaseError(
      "rate/count must be a positive number",
    );
  }
  if (count > RATE_MAX_COUNT) {
    throw new InternalServerUseCaseError("count overflow");
  }
  const timestamp = BigInt(getSecondsDifference(date, endDate));
  if (timestamp < 0) {
    throw new InternalServerUseCaseError("date must be before endDate");
  }
  // レート・カウントが設定されるビットを0で埋めてtimestampが指定ビットより大きくなってもスコアに影響させない
  const maskedTimestamp = timestamp & ((1n << RATE_COUNT_LEFT_SHIFT_NUM) - 1n);

  // rateを100倍して切り捨てる
  const fixedRate = BigInt(Math.floor(rate * 100));
  const c = BigInt(count);
  const combinedScore =
    (fixedRate << RATE_SCORE_LEFT_SHIFT_NUM) |
    (c << RATE_COUNT_LEFT_SHIFT_NUM) |
    maskedTimestamp;
  return Number(combinedScore);
}

/**
 * Retrieves the original rate score from the given score.
 *
 * @param {number} score - The combined rate score to extract the original rate score from.
 * @return {number} - The original rate score.
 */
export function getSeparatedRateScore(score: number): number {
  const toBig = BigInt(score);
  const originalRate = toBig >> RATE_SCORE_LEFT_SHIFT_NUM;
  return Number(originalRate) / 100;
}

type RegularRankingKeyAndEndDate = {
  key: string;
  endDate: Date;
};

/**
 * Returns the regular ranking key and end date based on the given parameters.
 *
 * @param {RegularRankingType} rankingType - The type of ranking.
 * @param {boolean} current - Indicates whether to use the current term or the previous term.
 * @param {Date} [nowDate=new Date()] - The current date and time. Defaults to the current date and time if not specified.
 * @return {RegularRankingKeyAndEndDate} - An object containing the regular ranking key and end date.
 */
export function getRegularRankingKeyAndEndDate(
  rankingType: RegularRankingType,
  current: boolean,
  nowDate: Date = new Date(), // 指定しなければnow
): RegularRankingKeyAndEndDate {
  const now = dayjs(nowDate).tz(TERM_TIME_ZONE);
  // 16日JST0時で前半後半が切り替わる
  const nowTerm = now.date() < 16 ? "early" : "late";
  const nowYyyymm = `${now.year()}${now.month() + 1}`;

  let retTerm;
  let retYyyymm;
  let endDate;
  if (current) {
    // 今のtermを使う
    retTerm = nowTerm;
    retYyyymm = nowYyyymm;

    // endDate
    if (nowTerm === "early") {
      // 15日の終わりの時刻
      endDate = dayjs(now)
        .tz(TERM_TIME_ZONE)
        .set("date", 15)
        .endOf("date")
        .toDate();
    } else {
      // 月末
      endDate = dayjs(now).tz(TERM_TIME_ZONE).endOf("month").toDate();
    }
  } else {
    // 前のtermを使う
    if (nowTerm === "late") {
      // 当月の前半
      retYyyymm = nowYyyymm;
      retTerm = "early";
      // 15日の終わりの時刻
      endDate = dayjs(now)
        .tz(TERM_TIME_ZONE)
        .set("date", 15)
        .endOf("date")
        .toDate();
    } else {
      // 前月の後半
      retTerm = "late";
      if (now.month() === 0) {
        // 前年12月
        retYyyymm = `${now.year() - 1}12`;
        // 12/31
        endDate = dayjs(now)
          .tz(TERM_TIME_ZONE)
          .add(-1, "year")
          .endOf("year")
          .toDate();
      } else {
        // 前月 now.month()は0-11を返すので−1していない
        retYyyymm = `${now.year()}${now.month()}`;
        endDate = dayjs(now)
          .tz(TERM_TIME_ZONE)
          .add(-1, "month")
          .endOf("month")
          .toDate();
      }
    }
  }

  return {
    key: `regular_${rankingType.toLowerCase()}_${retYyyymm}_${retTerm}`,
    endDate: endDate,
  };
}

export function getEventRankingKey(event: RankingType): string {
  return `${event.id}_${event.actionType}`.toLowerCase();
}

export function getTournamentRankingKey(tournamentId: string): string {
  return `paid_${tournamentId}`.toLowerCase();
}

export async function getRanking(
  ctx: Context,
  key: string,
  isRateScore: boolean,
) {
  try {
    // 凍結ユーザーのSetを作る
    const lockedUsers = await ctx.prisma.user.findMany({
      where: {
        lockedAt: {
          not: null,
        },
      },
      select: {
        id: true,
      },
    });
    const lockedUsersSet = new Set<string>(
      lockedUsers.map((value) => value.id),
    );

    // 表示は99位までだが凍結ユーザーを除外するために追加で取得する
    const rankings = await redisClient.zRangeWithScores(key, 0, 120, {
      REV: true,
    });

    /**
     * 凍結日が設定されているユーザーの一覧を取得してSetにする
     * valueにIDが入っているので凍結ユーザーをフィルタする
     * CombinedScoreをノーマルのスコアにする
     * 返却用のリストに追加していく
     */

    // 順位(1から)
    let i = 1;
    const filteredRankings = rankings
      .filter((value) => !lockedUsersSet.has(value.value))
      .map((value) => {
        const orgScore = isRateScore
          ? getSeparatedRateScore(value.score)
          : getSeparatedCountScore(value.score);
        return {
          score: orgScore,
          userId: value.value,
          rank: i++,
        };
      });
    let myself = filteredRankings.find((v) => v.userId === ctx.userId);
    if (!myself && ctx.userId) {
      // 自分を取得する
      // TODO FIXME クライアントがまだZREVRANKのWITHSCOREオプションを提供していないため、2つのコマンドに分けて取得している

      // 順位
      // この順位はRedis上での順位なので、実際に表示される順位ではないのだが無視している
      // 本当の順位を出す場合、自分より上の順位から凍結ユーザーを除外しないといけないので現実的ではない
      const myselfRank = await redisClient.zRevRank(key, ctx.userId);
      const myselfCombinedScore = await redisClient.zScore(key, ctx.userId);
      if (!myselfCombinedScore || !myselfRank) {
        // 不参加 or 最低アクション数不足
      } else {
        myself = {
          userId: ctx.userId,
          score: isRateScore
            ? getSeparatedRateScore(myselfCombinedScore)
            : getSeparatedCountScore(myselfCombinedScore),
          rank: myselfRank + 1,
        };
      }
    }

    // iconを持ってくる
    const targets = [...filteredRankings.map((v) => v.userId)];
    if (myself) {
      targets.push(myself.userId);
    }
    const users = await ctx.prisma.user.findMany({
      where: {
        id: {
          in: targets,
        },
      },
    });
    const usersMap = new Map<string, User>(users.map((v) => [v.id, v]));

    // レスポンス生成
    const resRankings = filteredRankings
      .map((v) => {
        const user = usersMap.get(v.userId)!;
        return {
          userId: v.userId,
          rank: v.rank,
          score: v.score,
          name: user.name,
          iconType: user.iconType,
          iconSubCategory: user.iconSubCategory,
          titleSubCategory: user.titleSubCategory,
          frameSubCategory: user.frameSubCategory,
        } as RankingItem;
      })
      .slice(0, 99);
    let resMyself: RankingItem | null = null;
    if (myself) {
      const user = usersMap.get(myself.userId)!;
      resMyself = {
        userId: myself.userId,
        rank: myself.rank,
        score: myself.score,
        name: user.name,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        titleSubCategory: user.titleSubCategory,
        frameSubCategory: user.frameSubCategory,
      };
    }
    return {
      topList: resRankings,
      myself: resMyself,
    };
  } catch (e: unknown) {
    throw toHandlerError(e);
  }
}

export type RankingItem = {
  rank: number;
  userId: string;
  score: number;
  name: string;
  iconType: IconType;
  iconSubCategory: string;
  titleSubCategory: string;
  frameSubCategory: string;
};

export type Rankings = {
  topList: RankingItem[];
  myself: RankingItem | null;
};
