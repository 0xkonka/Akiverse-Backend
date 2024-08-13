import { loginDate, loginYYYYMMDD } from "../../../helpers/datetime";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../../../constants";
import { GameId } from "../../../metadata/games";
import { Context } from "../../../context";
import { QuestMaster } from "@prisma/client";
import { QuestProgressFunc } from "../../external/types";

/**
 * playCount.
 * playSession作成日時を起点にプレイ数を数える
 * @param ctx
 * @param startAt
 */
export const playCount: QuestProgressFunc = (ctx, startAt) => {
  return ctx.prisma.play.count({
    where: {
      playSession: {
        playerId: ctx.userId!,
        createdAt: {
          gte: startAt,
        },
        state: "FINISHED",
      },
    },
  });
};

/**
 * sparkCount.
 * playSession作成日時を起点にSpark数を数える
 * @param ctx
 * @param startAt
 */
export const sparkCount: QuestProgressFunc = (ctx, startAt) => {
  return ctx.prisma.play.count({
    where: {
      playSession: {
        playerId: ctx.userId!,
        createdAt: {
          gte: startAt,
        },
        state: "FINISHED",
      },
      result: "WIN",
    },
  });
};

/**
 * consecutiveSparkCount,
 * 直近の連続したPlaySessionでSparkが続いた数を返す
 * @param ctx
 * @param startAt
 */
export const consecutiveSparkCount: QuestProgressFunc = async (
  ctx,
  startAt,
) => {
  // 最後にSparkしていないPlaySessionのCreatedAtより後のPlaySessionが対象
  const lastUnSparkPlaySession = await ctx.prisma.playSession.findFirst({
    where: {
      playerId: ctx.userId!,
      createdAt: {
        gte: startAt,
      },
      state: "FINISHED",
      plays: {
        every: {
          result: {
            not: "WIN",
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  let targetCreatedAt: Date;
  if (lastUnSparkPlaySession) {
    // 存在していたら、そのPlaySessionより後
    targetCreatedAt = lastUnSparkPlaySession.createdAt;
  } else {
    // 存在していなかったら、startAtより後
    targetCreatedAt = startAt;
  }

  return ctx.prisma.play.count({
    where: {
      playSession: {
        playerId: ctx.userId!,
        createdAt: {
          gte: targetCreatedAt,
        },
        state: "FINISHED",
        plays: {
          some: {
            result: "WIN",
          },
        },
      },
    },
  });
};

/**
 * uniqueGamePlayCount.
 * プレイしたゲームの数を返す
 * @param ctx
 * @param startAt
 */
export const uniqueGamePlayCount: QuestProgressFunc = async (ctx, startAt) => {
  const playedGames = await ctx.prisma.arcadeMachine.findMany({
    where: {
      playSessions: {
        some: {
          playerId: ctx.userId!,
          createdAt: {
            gte: startAt,
          },
          state: "FINISHED",
        },
      },
    },
    select: {
      game: true,
    },
    distinct: "game",
  });

  return playedGames.length;
};

/**
 * uniqueGameSparkCount.
 * Sparkしたことがあるゲームの数を返す
 * @param ctx
 * @param startAt
 */
export const uniqueGameSparkCount: QuestProgressFunc = async (ctx, startAt) => {
  const playedGames = await ctx.prisma.arcadeMachine.findMany({
    where: {
      playSessions: {
        some: {
          playerId: ctx.userId!,
          createdAt: { gte: startAt },
          state: "FINISHED",
          plays: {
            some: {
              result: "WIN",
            },
          },
        },
      },
    },
    select: {
      game: true,
    },
    distinct: "game",
  });
  return playedGames.length;
};

/**
 * consecutiveSparkDays.
 * 直近のSparkした日から過去何日連続してSparkしたを返す
 * @param ctx
 * @param startAt
 */
export const consecutiveSparkDays: QuestProgressFunc = async (ctx, startAt) => {
  // SparkしたPlaySessionの持つCreatedAtを取得
  const sparkedPlaySessions = await ctx.prisma.playSession.findMany({
    where: {
      playerId: ctx.userId!,
      createdAt: {
        gte: startAt,
      },
      state: "FINISHED",
      plays: {
        // SparkしたPlayを含む
        some: {
          result: "WIN",
        },
      },
    },
    select: {
      createdAt: true,
    },
  });

  // sparkした日を一覧にする
  const sparkedDateSet = new Set(
    sparkedPlaySessions.map((value) => loginYYYYMMDD(value.createdAt)),
  );

  // 現在日付（ログイン基準）
  let date = loginDate(dayjs().tz(TERM_TIME_ZONE).toDate());

  // 連続した日数をカウントする
  // 当日
  let count = Number(sparkedDateSet.has(date.format("YYYYMMDD")));
  // 前日〜
  while (sparkedDateSet.has((date = date.add(-1, "day")).format("YYYYMMDD"))) {
    count++;
  }
  return count;
};

/**
 * connectWallet.
 * Userにウォレットアドレスが設定されていたら1を返す。未設定の場合は0を返す。
 * @param ctx
 */
export const connectWallet: QuestProgressFunc = async (ctx) => {
  // ctxにも設定されているが、アクセストークンをリフレッシュするまで反映されないので、usersから取得する
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId },
  });
  if (!user || !user.walletAddress) {
    return 0;
  }
  return 1;
};

type PlayInfoType = {
  loginDate: string;
  playGame: Set<string>;
};

/**
 * consecutivePlayDaysInDifferentGame.
 * 引数のgameCount以上の種類のゲームをプレイした連続した日数を返す
 * @param gameCount 1日にプレイすべきゲームの数
 */
export function consecutivePlayDaysInDifferentGame(
  gameCount: number,
): QuestProgressFunc {
  return async (ctx, startAt) => {
    const gameWithPlaySessionCreateDate = await ctx.prisma.playSession.findMany(
      {
        where: {
          playerId: ctx.userId!,
          createdAt: {
            gte: startAt,
          },
          state: "FINISHED",
        },
        select: {
          createdAt: true,
          arcadeMachine: {
            select: {
              game: true,
            },
          },
        },
      },
    );
    // key:loginYYYYMMDD
    const playInfo = new Map<string, PlayInfoType>();
    for (const play of gameWithPlaySessionCreateDate) {
      const loginDate = loginYYYYMMDD(play.createdAt);
      let playInfoType = playInfo.get(loginDate);
      if (!playInfoType) {
        playInfoType = {
          loginDate: loginDate,
          playGame: new Set<string>(),
        };
      }
      playInfoType.playGame.add(play.arcadeMachine.game);
      playInfo.set(loginDate, playInfoType);
    }

    // gameCount未満のレコードを配列から削除する
    const filteredPlayInfo = [...playInfo.values()].filter(
      (value) => value.playGame.size >= gameCount,
    );

    // gameCount以上playした日を一覧にする
    const playedDateSet = new Set(
      filteredPlayInfo.map((value) => value.loginDate),
    );

    // 現在日付（ログイン基準）
    let date = loginDate(dayjs().tz(TERM_TIME_ZONE).toDate());

    // 連続した日数をカウントする
    // 当日
    let count = Number(playedDateSet.has(date.format("YYYYMMDD")));
    // 前日〜
    while (playedDateSet.has((date = date.add(-1, "day")).format("YYYYMMDD"))) {
      count++;
    }
    return count;
  };
}

export function specificGamePlayCount(game: GameId): QuestProgressFunc {
  return async (ctx, startAt) => {
    return ctx.prisma.play.count({
      where: {
        playSession: {
          playerId: ctx.userId!,
          createdAt: {
            gte: startAt,
          },
          state: "FINISHED",
          arcadeMachine: {
            game: game,
          },
        },
      },
    });
  };
}

export function specificGameSparkCount(game: GameId): QuestProgressFunc {
  return async (ctx, startAt) => {
    return ctx.prisma.play.count({
      where: {
        playSession: {
          playerId: ctx.userId!,
          createdAt: {
            gte: startAt,
          },
          state: "FINISHED",
          arcadeMachine: {
            game: game,
          },
        },
        result: "WIN",
      },
    });
  };
}

/**
 * 基準日ベースで何日プレイしたログがあるか返す
 * @param ctx
 * @param startAt
 */
export const uniquePlayDays: QuestProgressFunc = async (ctx, startAt) => {
  const playSessions = await ctx.prisma.playSession.findMany({
    where: {
      playerId: ctx.userId!,
      createdAt: { gte: startAt },
      state: "FINISHED",
    },
    select: {
      createdAt: true,
    },
  });

  const playedDaySet = new Set<string>(
    playSessions.map((v) => loginYYYYMMDD(v.createdAt)),
  );
  return playedDaySet.size;
};

/**
 * Count the number of tournament wins.
 * @param ctx
 * @param startAt
 */
export const tournamentWinsCount: QuestProgressFunc = (ctx, startAt) => {
  return ctx.prisma.paidTournamentResult.count({
    where: {
      userId: ctx.userId!,
      createdAt: {
        gte: startAt,
      },
      rank: 1,
    },
  });
};

/**
 * Count the number of tournament placements.
 * @param ctx
 * @param startAt
 */
export const tournamentPlacementsCount: QuestProgressFunc = (ctx, startAt) => {
  return ctx.prisma.paidTournamentEntry.count({
    where: {
      userId: ctx.userId!,
      createdAt: {
        gte: startAt,
      },
      prizeClaimed: true,
    },
  });
};

/**
 * Count the number of tournament participations.
 * @param ctx
 * @param startAt
 */
export const tournamentParticipationCount: QuestProgressFunc = (
  ctx,
  startAt,
) => {
  return ctx.prisma.paidTournamentEntry.count({
    where: {
      userId: ctx.userId!,
      createdAt: {
        gte: startAt,
      },
    },
  });
};

export function getNowProgress(
  ctx: Context,
  startAt: Date,
  master: QuestMaster,
): Promise<number> {
  switch (master.progressType) {
    case "CONNECT_WALLET":
      return connectWallet(ctx, startAt);
    case "PLAY_COUNT":
      if (master.progressParams) {
        return specificGamePlayCount(master.progressParams as GameId)(
          ctx,
          startAt,
        );
      }
      return playCount(ctx, startAt);
    case "SPARK_COUNT":
      if (master.progressParams) {
        return specificGameSparkCount(master.progressParams as GameId)(
          ctx,
          startAt,
        );
      }
      return sparkCount(ctx, startAt);
    case "CONSECUTIVE_SPARK_COUNT":
      return consecutiveSparkCount(ctx, startAt);
    case "UNIQUE_GAME_PLAY_COUNT":
      return uniqueGamePlayCount(ctx, startAt);
    case "UNIQUE_GAME_SPARK_COUNT":
      return uniqueGameSparkCount(ctx, startAt);
    case "CONSECUTIVE_SPARK_DAYS":
      return consecutiveSparkDays(ctx, startAt);
    case "CONSECUTIVE_PLAY_DAYS_IN_DIFFERENT_GAME":
      return consecutivePlayDaysInDifferentGame(
        Number.parseInt(master.progressParams!),
      )(ctx, startAt);
    case "UNIQUE_PLAY_DAYS":
      return uniquePlayDays(ctx, startAt);
    case "TOURNAMENT_WINS":
      return tournamentWinsCount(ctx, startAt);
    case "TOURNAMENT_PLACEMENTS":
      return tournamentPlacementsCount(ctx, startAt);
    case "TOURNAMENT_PARTICIPATION":
      return tournamentParticipationCount(ctx, startAt);
  }
}
