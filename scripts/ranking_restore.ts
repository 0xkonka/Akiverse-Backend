import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../src/constants";
import {
  getCombinedCountScore,
  getCombinedRateScore,
  getEventRankingKey,
  getRegularRankingKeyAndEndDate,
} from "../src/helpers/ranking";
import { EventRankings } from "../src/models/external/ranking";
import prismaClient from "../src/prisma";
import { redisClient } from "../src/redis";

type RankingKey = {
  key: string;
  startDate: Date;
  endDate: Date;
  actionType: string;
  minActionCount: number;
};
async function main() {
  const commandArgs = process.argv;
  if (commandArgs.length !== 4) {
    usage();
    return;
  }

  const targets: RankingKey[] = [];
  // 対象のイベントないし常設イベントの範囲、キー情報を作成
  if (commandArgs[2] === "EVENT") {
    // イベント
    const eventRankingType = EventRankings[commandArgs[3]];
    if (!eventRankingType) {
      console.log("unknown event id");
      usage();
      return;
    }
    targets.push({
      key: getEventRankingKey(eventRankingType),
      startDate: eventRankingType.startAt,
      endDate: eventRankingType.endAt,
      actionType: eventRankingType.actionType,
      minActionCount:
        eventRankingType.actionType === "SPARK_RATE"
          ? eventRankingType.minActionCount
          : 0,
    });
  } else if (commandArgs[2] === "SPARK") {
    // 常設SPARKランキング
    const now = parseDate(commandArgs[3]);
    const keyAndEndDate = getRegularRankingKeyAndEndDate("SPARK", true, now);
    targets.push({
      key: keyAndEndDate.key,
      startDate: regularRankingStartDate(keyAndEndDate.endDate),
      endDate: keyAndEndDate.endDate,
      actionType: "SPARK",
      minActionCount: 0,
    });
  } else if (commandArgs[2] === "MEGA_SPARK") {
    // 常設MegaSparkランキング
    const now = parseDate(commandArgs[3]);
    const keyAndEndDate = getRegularRankingKeyAndEndDate(
      "MEGA_SPARK",
      true,
      now,
    );
    targets.push({
      key: keyAndEndDate.key,
      startDate: regularRankingStartDate(keyAndEndDate.endDate),
      endDate: keyAndEndDate.endDate,
      actionType: "MEGA_SPARK",
      minActionCount: 0,
    });
  } else if (commandArgs[2] === "ALL") {
    // Spark/MegaSparkと当該日付時点で有効だったイベントランキング全てを対象にする
    // Spark
    const now = parseDate(commandArgs[3]);
    const spark = getRegularRankingKeyAndEndDate("SPARK", true, now);
    targets.push({
      key: spark.key,
      startDate: regularRankingStartDate(spark.endDate),
      endDate: spark.endDate,
      actionType: "SPARK",
      minActionCount: 0,
    });

    // MegaSpark
    const megaSpark = getRegularRankingKeyAndEndDate("MEGA_SPARK", true, now);
    targets.push({
      key: megaSpark.key,
      startDate: regularRankingStartDate(megaSpark.endDate),
      endDate: megaSpark.endDate,
      actionType: "MEGA_SPARK",
      minActionCount: 0,
    });

    // Event
    // nowの時点で有効なイベントを探し出す
    const events = Object.values(EventRankings).filter((value) => {
      return value.startAt <= now && now <= value.endAt;
    });
    for (const event of events) {
      targets.push({
        key: getEventRankingKey(event),
        startDate: event.startAt,
        endDate: event.endAt,
        actionType: event.actionType,
        minActionCount:
          event.actionType === "SPARK_RATE" ? event.minActionCount : 0,
      });
    }
  } else {
    usage();
    return;
  }

  try {
    await redisClient.connect();
    for (const target of targets) {
      console.log(target);
      // 対象の関数呼び出し
      switch (target.actionType) {
        case "SPARK":
          await updateForSpark(target.key, target.startDate, target.endDate);
          break;
        case "MEGA_SPARK":
          await updateForMegaSpark(
            target.key,
            target.startDate,
            target.endDate,
          );
          break;
        case "CRAFT":
          await updateForCraft(target.key, target.startDate, target.endDate);
          break;
        case "SPARK_RATE":
          await updateForSparkRate(
            target.key,
            target.startDate,
            target.endDate,
            target.minActionCount,
          );
          break;
      }
    }

    await redisClient.disconnect();
  } catch (e) {
    console.log(e);
  }
}

function parseDate(date: string): Date {
  const parsed = dayjs(date, TERM_TIME_ZONE);
  if (!parsed.isValid()) {
    throw Error("invalid date");
  }
  return parsed.toDate();
}

function regularRankingStartDate(endDate: Date): Date {
  // 終了日が15日だった場合=>当月1日の開始日時
  // 終了日が15じゃなかった場合=>当月16日の開始日時
  const parsedDate = dayjs(endDate).tz(TERM_TIME_ZONE);
  if (parsedDate.date() === 15) {
    return parsedDate.startOf("month").toDate();
  } else {
    return parsedDate.set("date", 16).startOf("date").toDate();
  }
}

function usage() {
  console.log("Usage: \n yarn ranking-restore EVENT target_event_id");
  console.log(" yarn ranking-restore {SPARK | MEGA_SPARK | ALL} 2023-11-11");
  console.log("\ndate is JST time.");
}

async function updateForSpark(
  key: string,
  start: Date,
  end: Date,
): Promise<void> {
  // 当該期間中に１度でもSparkしたユーザーを抽出
  const ids = await prismaClient.user.findMany({
    select: {
      id: true,
    },
    where: {
      playSessions: {
        some: {
          endedAt: {
            lte: end,
            gte: start,
          },
          plays: {
            some: {
              result: "WIN",
            },
          },
        },
      },
    },
  });
  console.log(ids);

  for (const { id } of ids) {
    const aggregateData = await prismaClient.playSession.aggregate({
      where: {
        endedAt: {
          gte: start,
          lte: end,
        },
        plays: {
          some: {
            result: "WIN",
          },
        },
        playerId: id,
      },
      _count: {
        id: true,
      },
      _max: {
        endedAt: true,
      },
    });
    if (aggregateData._count.id === 0) {
      console.log(`illegal state: userId:[${id}]`);
      continue;
    }
    console.log(aggregateData);
    // 統合スコア作成
    const combinedScore = getCombinedCountScore(
      aggregateData._count.id,
      aggregateData._max.endedAt!,
      end,
    );

    await redisClient.zAdd(key, { value: id, score: combinedScore });
  }
}

async function updateForMegaSpark(
  key: string,
  start: Date,
  end: Date,
): Promise<void> {
  const ids = await prismaClient.user.findMany({
    select: {
      id: true,
    },
    where: {
      playSessions: {
        some: {
          endedAt: {
            lte: end,
            gte: start,
          },
          plays: {
            some: {
              result: "WIN",
              megaSpark: true,
            },
          },
        },
      },
    },
  });
  console.log(ids);
  for (const { id } of ids) {
    const aggregateData = await prismaClient.playSession.aggregate({
      where: {
        endedAt: {
          gte: start,
          lte: end,
        },
        plays: {
          some: {
            result: "WIN",
            megaSpark: true,
          },
        },
        playerId: id,
      },
      _count: {
        id: true,
      },
      _max: {
        endedAt: true,
      },
    });
    if (aggregateData._count.id === 0) {
      console.log(`illegal state: userId:[${id}]`);
      continue;
    }
    console.log(aggregateData);
    // 統合スコア作成
    const combinedScore = getCombinedCountScore(
      aggregateData._count.id,
      aggregateData._max.endedAt!,
      end,
    );

    await redisClient.zAdd(key, { value: id, score: combinedScore });
  }
}

async function updateForCraft(
  key: string,
  start: Date,
  end: Date,
): Promise<void> {
  const ids = await prismaClient.user.findMany({
    select: {
      id: true,
    },
    where: {
      crafts: {
        some: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      },
    },
  });
  for (const { id } of ids) {
    const aggregateData = await prismaClient.craft.aggregate({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        userId: id,
      },
      _count: {
        id: true,
      },
      _max: {
        createdAt: true,
      },
    });
    if (aggregateData._count.id === 0) {
      console.log(`illegal state: userId:[${id}]`);
      continue;
    }
    console.log(aggregateData);
    // 統合スコア作成
    const combinedScore = getCombinedCountScore(
      aggregateData._count.id,
      aggregateData._max.createdAt!,
      end,
    );

    await redisClient.zAdd(key, { value: id, score: combinedScore });
  }
}

async function updateForSparkRate(
  key: string,
  start: Date,
  end: Date,
  minActionCount: number,
): Promise<void> {
  const ids = await prismaClient.user.findMany({
    select: {
      id: true,
    },
    where: {
      playSessions: {
        some: {
          endedAt: {
            gte: start,
            lte: end,
          },
        },
      },
    },
  });
  console.log(ids);
  for (const { id } of ids) {
    const lastPlaySession = await prismaClient.playSession.aggregate({
      where: {
        playerId: id,
        endedAt: {
          gte: start,
          lte: end,
        },
      },
      _max: {
        endedAt: true,
      },
    });
    await calcAndUpdateSparkRate(
      key,
      id,
      lastPlaySession._max.endedAt!,
      start,
      end,
      minActionCount,
    );
  }
}

// ranking_usecaseからコピー
async function calcAndUpdateSparkRate(
  key: string,
  userId: string,
  lastPlayDate: Date,
  start: Date,
  end: Date,
  minActionCount: number,
) {
  // Start - Endのプレイ数・Spark数を取得
  const aggregates = await prismaClient.$queryRaw<
    {
      play_count: BigInt;
      spark_count: BigInt;
    }[]
  >`
        select
            count(distinct play_sessions.id) as play_count,
            COALESCE(
                sum(
                  case
                      plays.result
                      when 'WIN' then 1
                      else 0
                  end
            ),0) as spark_count
        from
            play_sessions
                left outer join plays on plays.play_session_id = play_sessions.id
        where
            play_sessions.player_id = ${userId} :: uuid
          and play_sessions.ended_at >= ${start}
          and play_sessions.ended_at <= ${end}
    `;
  if (aggregates.length !== 1) {
    return;
  }
  const aggregate = aggregates[0];
  const playCount = Number(aggregate.play_count);
  const sparkCount = Number(aggregate.spark_count);
  if (playCount < minActionCount || playCount === 0) {
    // プレイ数が集計対象外
    return;
  }
  const sparkRate = Math.floor(((sparkCount * 100) / playCount) * 100) / 100;
  await redisClient.zAdd(key, {
    score: getCombinedRateScore(sparkRate, sparkCount, lastPlayDate, end),
    value: userId,
  });
}

if (require.main === module) {
  main();
}
