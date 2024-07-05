import { BatchContext } from "../batch_context";
import dayjs from "dayjs";

export interface RoviTournamentManagerUseCase {
  updateTournaments(ctx: BatchContext): Promise<void>;
  exportFinishedTournamentInfo(ctx: BatchContext): Promise<void>;
}

export const LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY =
  "ROVI_LAST_EXECUTE_NEWER_TOURNAMENT_ID";

/*
1. コンテストリスト
https://be.khelo-91.com/contests?pageIndex&limit&status=ALL&startTime=1708001834000&endTime=1708005434000

2. コンテスト詳細
https://be.khelo-91.com/contests/psuiv6etrn2aej861p8u2p3d2k

3. 参加者リスト
https://be.khelo-91.com/contests/pq442dolmtf9apsimqo9v5qj62/players?pageIndex=0&limit=10

4. 勝者リスト
勝者リストに内容される
 */

const ACTIVITIES_SUFFIX = "/activities";

export class RoviTournamentManagerUseCaseImpl
  implements RoviTournamentManagerUseCase
{
  constructor(
    private readonly apiToken: string,
    private readonly contestsUrl: string,
  ) {}
  /**
   * Roviのトーナメント一覧を更新する.
   * Roviの/contestsは必ず作成された順の降順で返却され、statusとしてとりうる値はLIVE,COMPLETEDしかない.
   * そのため、前回実行時に最初に取れたIDを保存しておき、次の実行時は前回最初に取れたIDが出現するまで値を取得する.
   * @param ctx
   */
  async updateTournaments(ctx: BatchContext): Promise<void> {
    ctx.log.info("updateTournaments start");
    // 必ず存在している必要がある
    const lastExecuteInfo = await ctx.prisma.batchControl.findUniqueOrThrow({
      where: {
        code: LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY,
      },
    });

    const lastExecuteNewerTournamentId = lastExecuteInfo.value;
    ctx.log.info(
      `last execute newer tournamentId:[${lastExecuteNewerTournamentId}]`,
    );
    let failed = false;
    let tournamentCount = 0;
    let currentNewerTournamentId = lastExecuteNewerTournamentId;
    try {
      let offset = 0;
      let isBreak = false;
      // Limit分しか取れないのでなくなるまでループする
      while (!isBreak) {
        ctx.log.info(`offset=${offset}`);
        const url = `${this.contestsUrl}?status=LIVE,COMPLETED&limit=10&pageIndex=${offset}`;
        const res = await fetch(url, {
          method: "GET",
          headers: this.createCommonHeader(),
        });
        if (!res.ok) {
          ctx.log.error(
            { response_body: await res.text(), response_status: res.status },
            "rovi tournaments api failed",
          );
          return;
        }
        const parsed = JSON.parse(await res.text());

        if (!parsed.contests) {
          ctx.log.error("contests not include");
          return;
        }
        const typedContests = parsed.contests as Contest[];
        if (typedContests.length === 0) {
          // もうないので離脱
          break;
        }

        for (const contest of typedContests) {
          ctx.log.info(
            `contest ${contest.referenceId}, start:[${contest.startTime}], end:[${contest.endTime}]`,
          );
          // currentNewerTournamentIdの初期値はlastExecuteNewerTournamentIdなので、ここはバッチ実行後最初にきた場合のみ中に入る
          if (currentNewerTournamentId === lastExecuteNewerTournamentId) {
            // 取得できた最新のもので更新
            currentNewerTournamentId = contest.referenceId;
          }
          if (contest.referenceId === lastExecuteNewerTournamentId) {
            // 前回実行時に最初に取れた=その時点で最新のトーナメントが取れたらすでに保存済みなので離脱する
            isBreak = true;
            // typedContestsのforループ離脱のbreak
            break;
          }
          tournamentCount++;
          try {
            await ctx.prisma.roviTournament.upsert({
              where: {
                tournamentId: contest.referenceId,
              },
              update: {
                updatedAt: new Date(),
              },
              create: {
                tournamentId: contest.referenceId,
                winnerChecked: false,
                // APIからはUnixMillsで返ってくるのでDateに変換する
                startAt: dayjs(contest.startTime).toDate(),
                endAt: dayjs(contest.endTime).toDate(),
                entryFee: contest.entryFee,
                entryFeeType: contest.entryFeeType,
                entryFeeAssetId: contest.entryFeeAssetId,
                tournamentType: contest.type,
                minPlayerCount: contest.minPlayers,
              },
            });
          } catch (e) {
            ctx.log.warn(e, `contest id [${contest.referenceId}] failed`);
            failed = true;
          }
        }
        offset++;
      }
    } catch (e) {
      ctx.log.error(e);
      return;
    }
    if (failed) {
      // トーナメントごとのレコード更新に失敗した場合はこっちにくる.
      // batchControlを更新しないため、次回実行時に正常になることを期待している
      ctx.log.error("There is a record that failed to update.");
    } else {
      // エラーの行がなければバッチコントロールのレコードを更新
      await ctx.prisma.batchControl.update({
        where: {
          code: LAST_EXECUTE_NEWER_TOURNAMENT_ID_KEY,
          value: lastExecuteInfo.value,
        },
        data: {
          // 今回実行時に最初に取得できたトーナメントIDを保存
          value: currentNewerTournamentId,
        },
      });
    }
    ctx.log.info(`updateTournaments end. count: ${tournamentCount}`);
  }

  /**
   * Winnerチェックを行っていないトーナメントの結果を更新する
   * @param ctx
   */
  async exportFinishedTournamentInfo(ctx: BatchContext): Promise<void> {
    ctx.log.info("exportFinishedTournamentInfo start");
    // Rovi側の集計待ちを考慮し、1時間前に終わっているトーナメントを対象に抽出する
    const nowMinus1Hour = dayjs().add(-1, "hour").toDate();
    const targetTournaments = await ctx.prisma.roviTournament.findMany({
      where: {
        winnerChecked: false,
        endAt: {
          lt: nowMinus1Hour,
        },
      },
    });
    ctx.log.info(
      `Finished but did not check tournament winners:${targetTournaments.length}`,
    );
    for (const targetTournament of targetTournaments) {
      try {
        const url = `${this.contestsUrl}/${targetTournament.tournamentId}`;
        const res = await fetch(url, {
          method: "GET",
          headers: this.createCommonHeader(),
        });
        if (!res.ok) {
          ctx.log.error(
            { response_body: await res.text(), response_status: res.status },
            "rovi tournament api failed",
          );
          return;
        }
        const contest = JSON.parse(await res.text()) as Contest;

        ctx.log.info(contest);
        if (contest.status !== "COMPLETED") {
          // 終了時刻を過ぎてもFinishedになってないので、何かがおかしい状態
          ctx.log.warn(
            `Tournaments not terminated after endAt:[${targetTournament.tournamentId}]`,
          );
          continue;
        }
        // 参加者リストを取得する
        let playerCount = 0;
        let winnerCount = 0;
        // prizeTypeが混在する場合、ここでサマリしても意味がないものが出来上がる
        let prizeSummary = 0;
        let prizeType = "";
        let offset = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const activitiesRes = await fetch(
            `${url}${ACTIVITIES_SUFFIX}?limit=100&pageIndex=${offset}`,
            {
              method: "GET",
              headers: this.createCommonHeader(),
            },
          );
          const activities = JSON.parse(
            await activitiesRes.text(),
          ) as Activities;
          ctx.log.info(activities);
          if (!activities || activities.contestUserActivities.length === 0) {
            break;
          }

          for (const act of activities.contestUserActivities) {
            if (act.prize && act.prize > 0) {
              winnerCount++;
              prizeSummary += act.prize;
              prizeType = act.prizeType;
              const winner: Winner = {
                userId: `${act.userData.source}:${act.userData.sourceId}`,
                tournamentId: targetTournament.tournamentId,
                rank: act.rank,
                prize: act.prize,
                prizeType: act.prizeType,
                bestScore: act.bestScore,
              };
              ctx.log.info(winner, LOG_MESSAGE_WINNER);
            }
            playerCount++;
          }
          offset++;
        }

        // プレーヤー数不足で無効になったトーナメントはtrueにする
        let invalid = false;
        if (playerCount < contest.minPlayers) {
          // 参加者不足
          invalid = true;
        }

        // チェック済みにする
        await ctx.prisma.roviTournament.update({
          where: { id: targetTournament.id },
          data: {
            winnerChecked: true,
            playerCount: playerCount,
            winnerCount: winnerCount,
            prizeSummary: prizeSummary,
            prizeType: prizeType,
            invalid: invalid,
          },
        });
      } catch (e) {
        ctx.log.warn(
          e,
          `tournament detail check failed:[${targetTournament.tournamentId}]`,
        );
      }
    }
    ctx.log.info("exportFinishedTournamentInfo end");
  }

  createCommonHeader(): Headers {
    const headers = new Headers();
    headers.append("x-api-key", this.apiToken);
    return headers;
  }
}

export type Contest = {
  referenceId: string;
  startTime: number;
  endTime: number;
  status: string;
  entryFee: number;
  entryFeeType: string;
  entryFeeAssetId: number;
  type: string;
  rangeType: string;
  ranges: Range[];
  durationInMinutes: number;
  minPlayers: number;
  playersLimit: number;
  dayScheduleLimit: number;
  // 現在プレイ中のプレーヤー数っぽい
  currentPlayers: number;
};

export type Range = {
  min: number;
  max: number;
  prize: number;
  prizeType: string;
  chainAssetId: number;
};

export type Activity = {
  bestScore: number;
  userData: {
    source: string;
    sourceId: string;
    name: string;
  };
  rank: number;
  prize: number | null;
  playCount: number;
  totalScore: number;
  prizeType: string;
  assetId: number;
};
export type Activities = {
  contestUserActivities: Activity[];
};

const LOG_MESSAGE_WINNER = "ROVI_WINNER";
type Winner = {
  userId: string;
  tournamentId: string;
  prizeType: string;
  prize: number;
  bestScore: number;
  rank: number;
};
