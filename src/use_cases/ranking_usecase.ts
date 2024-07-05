import { Context } from "../context";
import { Craft, PaidTournamentType, Prisma } from "@prisma/client";
import {
  EventIdType,
  EventRankings,
  RankingRateType,
  RankingSparkType,
  RankingType,
} from "../models/external/ranking";
import {
  CountType,
  getCombinedCountScore,
  getCombinedRateScore,
  getEventRankingKey,
  getRanking,
  getRegularRankingKeyAndEndDate,
  getSeparatedCountScore,
  getTournamentRankingKey,
  Rankings,
  RateType,
} from "../helpers/ranking";
import {
  InternalServerUseCaseError,
  InvalidArgumentUseCaseError,
} from "./errors";
import { redisClient } from "../redis";
import { warn } from "../utils";

import { Service } from "typedi";
import { GameId, games } from "../metadata/games";

export type RankingId =
  | "SPARK_CURRENT"
  | "SPARK_PREVIOUS"
  | "MEGA_SPARK_CURRENT"
  | "MEGA_SPARK_PREVIOUS"
  | EventIdType;
export interface RankingUseCase {
  craft(ctx: Context, craft: Craft): Promise<void>;
  finishPlaySession(ctx: Context, playSessionId: string): Promise<void>;
  getRanking(ctx: Context, rankingId: RankingId, now: Date): Promise<Rankings>;
}

@Service("ranking.useCase")
export class RankingUseCaseImpl implements RankingUseCase {
  constructor(
    // UT用に引数で上書きできるようにする
    private readonly eventRankings: Record<string, RankingType> = EventRankings,
  ) {}

  async craft(ctx: Context, craft: Craft): Promise<void> {
    const now = craft.createdAt;
    const enabledRankings = this.enabledCraftRankings(now);

    const promises = [];
    for (const enabledRanking of enabledRankings) {
      const key = getEventRankingKey(enabledRanking);
      promises.push(this.sendCount(ctx, key, now, enabledRanking.endAt));
    }
    await Promise.allSettled(promises).then((value) => {
      for (const elm of value) {
        if (elm.status === "rejected") {
          warn(elm.reason);
        }
      }
    });
  }

  async finishPlaySession(ctx: Context, playSessionId: string): Promise<void> {
    const playSessionWithPlay = await ctx.prisma.playSession.findUniqueOrThrow({
      where: {
        id: playSessionId,
      },
      include: {
        plays: true,
        arcadeMachine: {
          select: {
            game: true,
          },
        },
      },
    });
    if (playSessionWithPlay.endedAt === null) {
      throw new InternalServerUseCaseError("playSession is not finished");
    }
    const now = playSessionWithPlay.endedAt;
    const sparkedPlay = playSessionWithPlay.plays.find((v) => {
      return v.result === "WIN";
    });
    let sparked = false;
    let megaSparked = false;
    let distributeTerasAmount: Prisma.Decimal = new Prisma.Decimal(0);
    if (sparkedPlay) {
      sparked = true;
      megaSparked = sparkedPlay.megaSpark;
      distributeTerasAmount = sparkedPlay.playerTerasReward
        ? sparkedPlay.playerTerasReward
        : new Prisma.Decimal(0);
    }
    const game = playSessionWithPlay.arcadeMachine.game;
    const sparkRankings = this.enabledPlayRankings("SPARK", now, game);
    const megaSparkRankings = this.enabledPlayRankings("MEGA_SPARK", now, game);
    const sparkRateRankings = this.enabledPlayRankings("SPARK_RATE", now, game);

    // GameSwapperが適用されている可能性があるため、現在有効なものを全て取得してからフィルタする
    const paidTournaments = await ctx.prisma.paidTournamentEntry.findMany({
      where: {
        userId: ctx.userId!,
        paidTournament: {
          startAt: {
            lte: now,
          },
          endAt: {
            gte: now,
          },
        },
      },
      include: {
        paidTournament: {
          include: {
            activeBoosterForTournaments: {
              where: {
                category: "GAME_SWAP",
                subCategory: game,
                endAt: {
                  gte: now,
                },
              },
            },
          },
        },
      },
    });
    const filteredPaidTournaments = paidTournaments.filter((v) => {
      // 全ゲーム対象 ないし トナメの対象ゲームと同じゲームをプレイ
      if (
        v.paidTournament.gameId === null ||
        v.paidTournament.gameId === game
      ) {
        return true;
      }
      // 有効なGameSwapperを持っていたら対象にする
      return v.paidTournament.activeBoosterForTournaments.length > 0;
    });

    const promise = [];
    for (const sparkRateRanking of sparkRateRankings) {
      // スパーク率は必ず再計算する
      promise.push(
        this.sendRate(
          ctx,
          getEventRankingKey(sparkRateRanking),
          now,
          sparkRateRanking as RankingRateType,
        ),
      );
    }
    if (sparked) {
      // スパーク数はPlaySessionにスパークしたPlayが含まれている場合のみ更新対象
      // 常設ランキング分は必ず行う
      const r = getRegularRankingKeyAndEndDate("SPARK", true, now);
      promise.push(this.sendCount(ctx, r.key, now, r.endDate));
      // イベント系は存在したら行う
      for (const sparkRanking of sparkRankings) {
        const key = getEventRankingKey(sparkRanking);
        promise.push(this.sendCount(ctx, key, now, sparkRanking.endAt));
      }
      // 有料トーナメントは参加していたら行う
      for (const paidTournament of filteredPaidTournaments) {
        const key = getTournamentRankingKey(paidTournament.paidTournamentId);
        if (
          paidTournament.paidTournament.paidTournamentType ===
          PaidTournamentType.SPARK_COUNT
        ) {
          promise.push(
            this.sendCount(ctx, key, now, paidTournament.paidTournament.endAt),
          );
        } else if (
          paidTournament.paidTournament.paidTournamentType ===
          PaidTournamentType.SPARK_TERAS
        ) {
          promise.push(
            this.sendCount(
              ctx,
              key,
              now,
              paidTournament.paidTournament.endAt,
              distributeTerasAmount.toNumber(),
            ),
          );
        }
      }
    }
    if (megaSparked) {
      // メガスパーク数はPlaySessionにメガスパークしたPlayが含まれている場合のみ更新対象
      // 常設ランキング分は必ず行う
      const r = getRegularRankingKeyAndEndDate("MEGA_SPARK", true, now);
      promise.push(this.sendCount(ctx, r.key, now, r.endDate));

      // イベント系は存在したら行う
      for (const megaSparkRanking of megaSparkRankings) {
        const key = getEventRankingKey(megaSparkRanking);
        promise.push(this.sendCount(ctx, key, now, megaSparkRanking.endAt));
      }
    }

    await Promise.allSettled(promise).then((value) => {
      for (const elm of value) {
        if (elm.status === "rejected") {
          warn(elm.reason);
        }
      }
    });
  }

  private enabledPlayRankings(
    t: CountType | RateType,
    now: Date,
    game: string,
  ): RankingType[] {
    return Object.values(this.eventRankings)
      .filter((value) => {
        return value.startAt <= now && value.endAt >= now;
      })
      .filter((value) => value.actionType === t)
      .filter((value) => {
        const v = value as RankingSparkType | RankingRateType;
        if (!v.targetGames) {
          return true;
        }
        return v.targetGames.includes(game as GameId);
      });
  }

  private enabledCraftRankings(now: Date): RankingType[] {
    return Object.values(this.eventRankings)
      .filter((value) => {
        return value.startAt <= now && value.endAt >= now;
      })
      .filter((value) => value.actionType === "CRAFT");
  }

  private async sendCount(
    ctx: Context,
    key: string,
    now: Date,
    endDate: Date,
    addValue: number = 1,
  ): Promise<void> {
    const combinedScore = await redisClient.zScore(key, ctx.userId!);
    let count = addValue;
    if (combinedScore) {
      const nowCount = getSeparatedCountScore(combinedScore);
      count = nowCount + addValue;
    }
    await redisClient.zAdd(key, {
      value: ctx.userId!,
      score: getCombinedCountScore(count, now, endDate),
    });
  }

  private async sendRate(
    ctx: Context,
    key: string,
    now: Date,
    rankingType: RankingRateType,
  ): Promise<void> {
    // 指定がない場合は全てのゲーム、指定がある場合は指定のゲームのみで算出する
    const targets = rankingType.targetGames
      ? rankingType.targetGames
      : Object.values(games).map((v) => v.id);
    // Start - Endのプレイ数・Spark数を取得
    const aggregates = await ctx.prisma.$queryRaw<
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
                inner join arcade_machines on play_sessions.arcade_machine_id = arcade_machines.id
        where
            play_sessions.player_id = ${ctx.userId!} :: uuid
          and play_sessions.ended_at >= ${rankingType.startAt}
          and play_sessions.ended_at <= ${rankingType.endAt}
          and arcade_machines.game in (${Prisma.join(targets)})
    `;
    if (aggregates.length !== 1) {
      return;
    }
    const aggregate = aggregates[0];
    const playCount = Number(aggregate.play_count);
    const sparkCount = Number(aggregate.spark_count);
    if (playCount < rankingType.minActionCount || playCount === 0) {
      // プレイ数が集計対象外
      return;
    }
    const sparkRate = Math.floor(((sparkCount * 100) / playCount) * 100) / 100;
    await redisClient.zAdd(key, {
      score: getCombinedRateScore(
        sparkRate,
        sparkCount,
        now,
        rankingType.endAt,
      ),
      value: ctx.userId!,
    });
  }

  async getRanking(
    ctx: Context,
    rankingId: RankingId,
    now: Date,
  ): Promise<Rankings> {
    let key;
    let keyAndDate;
    let isRateScore = false;
    switch (rankingId) {
      case "SPARK_CURRENT":
        keyAndDate = getRegularRankingKeyAndEndDate("SPARK", true, now);
        key = keyAndDate.key;
        break;
      case "SPARK_PREVIOUS":
        keyAndDate = getRegularRankingKeyAndEndDate("SPARK", false, now);
        key = keyAndDate.key;
        break;
      case "MEGA_SPARK_CURRENT":
        keyAndDate = getRegularRankingKeyAndEndDate("MEGA_SPARK", true, now);
        key = keyAndDate.key;
        break;
      case "MEGA_SPARK_PREVIOUS":
        keyAndDate = getRegularRankingKeyAndEndDate("MEGA_SPARK", false, now);
        key = keyAndDate.key;
        break;
      default:
        // Event
        // eslint-disable-next-line no-case-declarations
        const eventRanking = this.eventRankings[rankingId];
        if (!eventRanking) {
          throw new InvalidArgumentUseCaseError("unknown ranking id");
        }
        isRateScore = eventRanking.actionType === "SPARK_RATE";
        key = getEventRankingKey(eventRanking);
    }

    return getRanking(ctx, key, isRateScore);
  }
}
