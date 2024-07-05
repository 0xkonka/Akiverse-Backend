import {
  ArcadeMachine,
  NftState,
  Play,
  PlayResult,
  PlaySession,
  PlaySessionState,
  Prisma,
} from "@prisma/client";
import { Context } from "../context";
import { Inject, Service } from "typedi";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InternalServerUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
} from "./errors";
import { GameId, games, WinCondition } from "../metadata/games";
import { getUTCTimeAtReferenceRegion } from "../helpers/datetime";
import { hashSessionToken, randomSessionToken } from "../helpers/auth";
import {
  GAME_PLAY_SESSION_PREFIX,
  MEGA_SPARKED_REWARD,
  SPARKED_ENERGY,
  getAkiverseManagerUserId,
  SCORE_SIGN_KEY_1,
  SCORE_SIGN_KEY_2,
  FEVER_SPARK_MAX_COUNT,
} from "../constants";
import { calculateEmitReward } from "../helpers/fee";
import {
  distributionRewardSparkCount,
  distributionRewardPlayCount,
} from "../helpers/campaign";
import {
  notifyMegaSparkQuery,
  notifyMegaSparkUpcomingQuery,
} from "../helpers/event_notification";
import { sha256, warn } from "../utils";
import { isMegaSparkUpcoming } from "../helpers/mega_spark";
import { QuestProgressChecker } from "../helpers/quests";
import { PRISMA_NOT_FOUND_ERROR_CODE } from "../prisma";
import { RankingUseCase } from "./ranking_usecase";

export interface PlayGameUseCase {
  startPlaySession(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<StartPlaySessionResponse>;
  finishPlaySession(ctx: Context, authToken: string): Promise<PlaySession>;
  startPlay(ctx: Context, authToken: string): Promise<void>;
  finishPlay(
    ctx: Context,
    authToken: string,
    score: number,
    timeStamp?: Date,
    salt?: string,
    signature?: string,
  ): Promise<void>;
  inProgress(
    ctx: Context,
    authToken: string,
    score?: number,
    timeStamp?: Date,
    salt?: string,
    signature?: string,
  ): Promise<void>;
}

export type StartPlaySessionResponse = {
  playSessionToken: string;
  winCondition: WinCondition;
  session: PlaySession;
};

@Service("playGame.useCase")
export class PlayGameUseCaseImpl implements PlayGameUseCase {
  constructor(
    @Inject("questProgressChecker")
    private readonly questChecker: QuestProgressChecker,
    @Inject("ranking.useCase")
    private readonly rankingUseCase: RankingUseCase,
  ) {}
  async startPlaySession(
    ctx: Context,
    arcadeMachineId: string,
  ): Promise<StartPlaySessionResponse> {
    // 今日の始まりと終わりのDateを取得
    const { start, end } = getUTCTimeAtReferenceRegion();
    // ArcadeMachineから必要な情報を取得する
    const arcadeMachine = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: arcadeMachineId },
      include: {
        gameCenter: {
          include: {
            user: true,
          },
        },
        user: true,
        playSessions: {
          where: {
            playerId: ctx.userId,
            // 今日作成されたセッションを取得
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          include: {
            plays: true,
          },
        },
      },
    });

    if (!arcadeMachine) {
      throw new NotFoundUseCaseError(
        "arcade machine not found",
        "ArcadeMachine",
      );
    }

    if (!isPlayableArcadeMachine(ctx, arcadeMachine)) {
      throw new IllegalStateUseCaseError("this arcade machine is cannot play");
    }

    // Gameに紐づく情報を取得
    const metadata = games[arcadeMachine.game as GameId];

    if (!metadata.enabled) {
      throw new IllegalStateUseCaseError("this arcade machine is cannot play");
    }
    const winCondition = metadata.winCondition;
    const gameSetting = await ctx.prisma.gameSetting.findUnique({
      where: { game: arcadeMachine.game },
    });
    if (!gameSetting) {
      throw new NotFoundUseCaseError("game setting not found", "GameSetting");
    }

    // EASY_MODEブースターの有効状態チェック
    const easyModeCount = await ctx.prisma.activeBooster.count({
      where: {
        userId: ctx.userId!,
        category: "EASY_MODE",
        subCategory: "ALL",
        endAt: {
          gte: new Date(),
        },
      },
    });
    const isEasyMode = easyModeCount > 0;

    // 今日プレイした数を集計
    let canPlayCount: number | null = null;
    if (!ctx.currentUserOwns(arcadeMachine)) {
      const todayPlayedCount = arcadeMachine.playSessions.reduce((a, x) => {
        return a + x.plays.length;
      }, 0);

      canPlayCount = gameSetting.dailyMaxPlayCount - todayPlayedCount;
      if (canPlayCount <= 0) {
        throw new IllegalStateUseCaseError(
          "Already exceeded the number of times we can play today",
        );
      }
    } else {
      // FIXME SDK都合の部分 SDKでリトライ回数表示をする都合上、毎回dailyMaxPlayCountを設定している。
      canPlayCount = gameSetting.dailyMaxPlayCount;
    }

    // 自分がプレイしている別のPlaySessionがないこと
    const currentPlaySessionCount = await ctx.prisma.playSession.count({
      where: {
        playerId: ctx.userId,
        NOT: {
          state: "FINISHED",
        },
      },
    });

    if (currentPlaySessionCount > 0) {
      // 自分がプレイしているセッションが残っていた場合、既存のセッションを捨てる
      const queries = [];
      queries.push(
        ctx.prisma.play.updateMany({
          where: {
            playSession: {
              playerId: ctx.userId!,
            },
            result: null,
          },
          data: {
            result: "DISCONNECTED",
          },
        }),
      );
      queries.push(
        ctx.prisma.playSession.updateMany({
          where: {
            playerId: ctx.userId,
            NOT: {
              state: "FINISHED",
            },
          },
          data: {
            state: "FINISHED",
          },
        }),
      );
      await ctx.prisma.$transaction(queries);
    }

    // ゲームセッション認証用のトークン生成
    const sessionToken = randomSessionToken(GAME_PLAY_SESSION_PREFIX);
    const tokenHash = hashSessionToken(sessionToken);

    try {
      const updated = await ctx.prisma.playSession.create({
        data: {
          state: PlaySessionState.READY,
          authToken: tokenHash,
          difficulty: isEasyMode
            ? gameSetting.easyDifficulty
            : gameSetting.difficulty,
          maxPlayCount: canPlayCount,
          targetScore: isEasyMode
            ? gameSetting.easyTargetScore
            : gameSetting.targetScore,
          playerId: ctx.userId!,
          gameCenterId: arcadeMachine.gameCenterId,
          gameCenterOwnerId: arcadeMachine.gameCenter?.userId,
          arcadeMachineId: arcadeMachine.id,
          // Nullチェックしていないが、上でGCにインストールされていることをチェックしているのでそのまま入れる
          arcadeMachineOwnerId: arcadeMachine.userId!,
          // FeverSparkRemainが設定されている＝Fever中なのでnullじゃなければFeverがtrueになる
          fever: arcadeMachine.feverSparkRemain !== null,
        },
      });
      return {
        session: updated,
        winCondition,
        playSessionToken: sessionToken,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === "P2002") {
          throw new ConflictUseCaseError(
            "Arcade machine is already playing other player. Or already playing session exists.",
          );
        }
      }
      throw e;
    }
  }
  async finishPlaySession(
    ctx: Context,
    playSessionToken: string,
  ): Promise<PlaySession> {
    const playSession = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken(playSessionToken) },
      include: { plays: true },
    });
    if (!playSession) {
      throw new NotFoundUseCaseError("play session not found", "PlaySession");
    }
    if (playSession.state === PlaySessionState.PLAYING) {
      throw new IllegalStateUseCaseError("play session state mismatch");
    }

    if (playSession.state === PlaySessionState.FINISHED) {
      return playSession;
    }
    // playSessionTokenでアクセスする場合、userIdが未設定なのでPlaySessionから取得して設定する
    ctx.userId = playSession.playerId;

    const ret = await ctx.prisma.playSession.update({
      where: { id: playSession.id },
      data: {
        state: PlaySessionState.FINISHED,
        endedAt: new Date(),
      },
      include: { plays: true },
    });

    await this.questChecker.checkAndUpdate(ctx);
    await this.rankingUseCase.finishPlaySession(ctx, playSession.id);

    return ret;
  }

  async startPlay(ctx: Context, playSessionToken: string): Promise<void> {
    const session = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken(playSessionToken) },
      include: { plays: true },
    });
    if (!session) {
      throw new NotFoundUseCaseError("play session not found", "PlaySession");
    }

    // READY以外ではプレイ開始できない
    if (session.state !== PlaySessionState.READY) {
      throw new IllegalStateUseCaseError("play session is already finished");
    }

    const nowPlayingCount = session.plays.reduce((sum, play) => {
      return sum + (!play.endedAt ? 1 : 0);
    }, 0);
    // 現在プレイ中のPlayレコードが存在している
    if (nowPlayingCount > 0) {
      throw new IllegalStateUseCaseError("playing session found");
    }

    // 挑戦可能回数を使い切った
    if (session.maxPlayCount && session.maxPlayCount <= session.plays.length) {
      throw new IllegalStateUseCaseError(
        "Already exceeded the number of times we can play today",
      );
    }

    try {
      await ctx.prisma.playSession.update({
        // PlayManagerの方で更新される可能性があるので、stateもwhereの条件に含める
        where: { id: session.id, state: PlaySessionState.READY },
        data: {
          state: PlaySessionState.PLAYING,
          plays: {
            create: {},
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // stateがREADYじゃなかった場合、updateの対象が０件＝NOTFOUNDのエラーがスローされるので、コンフリクトしたことになる
        if (e.code === PRISMA_NOT_FOUND_ERROR_CODE) {
          throw new ConflictUseCaseError("play is already started");
        }
      }
      throw e;
    }

    // プレイ回数によるTeras付与の確認
    distributionRewardPlayCount(ctx, session.playerId);
  }

  async inProgress(
    ctx: Context,
    playSessionToken: string,
    score?: number,
    timeStamp?: Date,
    salt?: string,
    signature?: string,
  ): Promise<void> {
    const currentSessionWithPlay = await getCurrentPlayWithSession(
      ctx,
      playSessionToken,
    );

    // inProgress時にScoreは必須ではないので判定する
    if (score) {
      // TODO キャッシュが消えるまでの間、すべての要素が存在した場合のみチェックする
      // inProgressの場合、Scoreがある場合はSignature必須なので外す時注意
      if (timeStamp && salt && signature) {
        if (
          !isValidScore({
            timeStamp: timeStamp,
            salt: salt,
            score: score,
            signature: signature,
            currentPlayWithSession: currentSessionWithPlay,
          })
        ) {
          throw new InvalidArgumentUseCaseError("invalid score");
        }
      }
    }

    const play = currentSessionWithPlay.plays[0];

    await ctx.prisma.play.updateMany({
      // updatedAtを見てfinishPlayなどほかの更新処理での更新がされていたらSkipする
      where: { id: play.id, updatedAt: play.updatedAt },
      data: {
        result: null, // これを入れておかないとScoreがなかった際にUpdate自体がスキップされてしまう
        score: score,
      },
    });
  }

  async finishPlay(
    ctx: Context,
    playSessionToken: string,
    score: number,
    timeStamp?: Date,
    salt?: string,
    signature?: string,
  ): Promise<void> {
    const currentPlaySession = await getCurrentPlayWithSession(
      ctx,
      playSessionToken,
    );

    // TODO キャッシュが消えるまでの間、すべての要素が存在した場合のみチェックする
    if (timeStamp && salt && signature) {
      if (
        !isValidScore({
          timeStamp: timeStamp,
          salt: salt,
          score: score,
          signature: signature,
          currentPlayWithSession: currentPlaySession,
        })
      ) {
        throw new InvalidArgumentUseCaseError("invalid score");
      }
    }

    const result = currentPlaySession.targetScore! <= score ? "WIN" : "LOSS";

    try {
      const transactUpdates = await createFinishPlayTransactUpdates(
        ctx,
        currentPlaySession,
        score,
        result,
      );
      await ctx.prisma.$transaction(transactUpdates);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === PRISMA_NOT_FOUND_ERROR_CODE
      ) {
        // 対象のレコードが存在せずにUpdateが空振った場合、同時にSparkがあったということなので、もう一回Update処理を行う
        warn({
          msg: `Not subject to update. playSessionToken:[${playSessionToken}]`,
        });
      } else {
        throw e;
      }
    }

    if (result === "WIN") {
      // スパーク回数によるAP付与の確認
      distributionRewardSparkCount(ctx, currentPlaySession.playerId);
    }
  }
}

// エナジーは固定値
const addEnergy = SPARKED_ENERGY;

async function createFinishPlayTransactUpdates(
  ctx: Context,
  currentPlaySession: CurrentPlayWithSession,
  score: number,
  result: PlayResult,
) {
  const id = currentPlaySession.plays[0].id;

  const play = await ctx.prisma.play.findUniqueOrThrow({ where: { id } });
  if (play.result !== null) {
    throw new IllegalStateUseCaseError("play already finished");
  }

  const playCount = await ctx.prisma.play.count({
    where: { playSessionId: currentPlaySession.id },
  });

  const canRetry =
    currentPlaySession.maxPlayCount === null ||
    currentPlaySession.maxPlayCount > playCount;

  // PlaySessionは最大プレイ回数まで到達したらFINISHEDになる
  // そうじゃない場合は次プレイが開始できるようにREADYにする
  const [afterState, endedAt] = canRetry
    ? [PlaySessionState.READY, null]
    : [PlaySessionState.FINISHED, new Date()];

  const transactUpdates = [];

  // LOSE時にnullで更新するので事前定義
  let emitPlayerTerasReward: Prisma.Decimal | null = null;
  let emitOwnerTerasReward: Prisma.Decimal | null = null;

  let state: "UPCOMING" | "MEGA_SPARK" | "FEVER_TIME" | "NONE" = "NONE";
  let isLastFever = false;

  const { playerId, arcadeMachineOwnerId, arcadeMachineId } =
    currentPlaySession;
  const arcadeMachine = currentPlaySession.arcadeMachine;

  // アイテムによって獲得TerasがBoostされた場合に値が入る
  let ratio;
  // Teras排出処理
  if (result === "WIN") {
    const resultEnergy = arcadeMachine.energy + addEnergy;

    // state判定
    if (arcadeMachine.maxEnergy !== arcadeMachine.energy) {
      if (resultEnergy >= arcadeMachine.maxEnergy) {
        // 加算するとMAXを超える場合、MegaSpark
        state = "MEGA_SPARK";
      } else if (isMegaSparkUpcoming(resultEnergy, arcadeMachine.maxEnergy)) {
        // 次回加算される際にMAXを超える場合、MegaSparkリーチ
        state = "UPCOMING";
      }
    } else {
      // すでにMegaSparkしている
      if (arcadeMachine.feverSparkRemain === null) {
        // ここに入ったらデータ不整合
        throw new InternalServerUseCaseError(
          `Data Mismatch. arcadeMachineId:[${arcadeMachineId}]`,
        );
      } else {
        state = "FEVER_TIME";
        isLastFever = arcadeMachine.feverSparkRemain === 1;
      }
    }

    //////////////////////////
    //  Reward計算
    //////////////////////////
    // 自分のAMでSparkしたか
    const isSelfArcadeMachine = playerId === arcadeMachineOwnerId;

    const calculated = calculateEmitReward(
      isSelfArcadeMachine,
      arcadeMachine.game,
      state === "FEVER_TIME",
    );
    emitPlayerTerasReward = calculated.emitPlayerReward;
    emitOwnerTerasReward = calculated.emitOwnerReward;

    // Booster判定
    // Spark時のTeras量アップブースターが有効かチェック
    const activeBooster = await ctx.prisma.activeBooster.findMany({
      where: {
        userId: ctx.userId!,
        category: "SPARK_TERAS_UP",
        endAt: {
          gte: new Date(),
        },
      },
    });

    if (activeBooster.length > 0) {
      const activeSubCategory = activeBooster[0].subCategory;
      // Xnの形でsubCategoryを定義しているので頭一桁捨ててNumberにパースする
      ratio = parseFloat(activeSubCategory.substring(1));
      if (isNaN(ratio)) {
        // NaNだったらエラーにならないように1倍として計算しつつエラーログを出す
        ratio = 1;
        ctx.log.warn(
          "SPARK_TERAS_UP booster sub-category contains an incorrect value.",
        );
      }
      emitPlayerTerasReward = emitPlayerTerasReward.mul(ratio);
    }

    if (state === "MEGA_SPARK") {
      emitPlayerTerasReward = MEGA_SPARKED_REWARD;
    }

    // player
    transactUpdates.push(
      ctx.prisma.user.update({
        where: { id: playerId },
        data: {
          terasBalance: {
            increment: emitPlayerTerasReward,
          },
        },
      }),
    );

    // owner
    transactUpdates.push(
      ctx.prisma.user.update({
        where: { id: arcadeMachineOwnerId },
        data: {
          terasBalance: {
            increment: emitOwnerTerasReward,
          },
        },
      }),
    );

    //////////////////////////
    //  AM状態設定
    //////////////////////////
    switch (state) {
      case "UPCOMING":
      case "NONE":
        // Energyだけ加算
        transactUpdates.push(
          ctx.prisma.arcadeMachine.update({
            // 更新条件にenergyを入れることで、同タイミングでSparkされた場合に更新対象なしエラーになる
            where: { id: arcadeMachineId, energy: arcadeMachine.energy },
            data: {
              energy: {
                increment: addEnergy,
              },
            },
          }),
        );
        break;
      case "FEVER_TIME":
        // decrement + lastFever時のみGCから外す
        // eslint-disable-next-line no-case-declarations
        const gcSetting = isLastFever
          ? {
              gameCenterId: null,
              position: null,
              installedAt: null,
            }
          : {};
        transactUpdates.push(
          ctx.prisma.arcadeMachine.update({
            // 更新条件にenergyを入れることで、同タイミングでSparkされた場合に更新対象なしエラーになる
            where: { id: arcadeMachineId, energy: arcadeMachine.energy },
            data: {
              feverSparkRemain: {
                decrement: 1,
              },
              ...gcSetting,
            },
          }),
        );
        break;
      case "MEGA_SPARK":
        // Energy(MaxEnergy) + feverRemain
        transactUpdates.push(
          ctx.prisma.arcadeMachine.update({
            where: { id: arcadeMachineId, energy: arcadeMachine.energy },
            data: {
              feverSparkRemain: FEVER_SPARK_MAX_COUNT,
              energy: arcadeMachine.maxEnergy,
            },
          }),
        );
    }

    //////////////////////////
    //  通知送信
    //////////////////////////
    if (state === "MEGA_SPARK") {
      const totalMegaSpark = await ctx.prisma.play.count({
        where: { playSession: { playerId }, megaSpark: true },
      });
      // MegaSpark通知
      transactUpdates.push(
        ctx.prisma.notification.createMany({
          data: notifyMegaSparkQuery(
            arcadeMachineId,
            playerId,
            arcadeMachineOwnerId,
            totalMegaSpark + 1,
          ),
        }),
      );
    } else if (state === "UPCOMING") {
      // MegaSparkリーチ通知
      transactUpdates.push(
        ctx.prisma.notification.createMany({
          data: notifyMegaSparkUpcomingQuery(
            arcadeMachineId,
            playerId,
            arcadeMachineOwnerId,
          ),
        }),
      );
    } else if (isLastFever) {
      // 最終FeverSpark
      // TODO 通知の内容が決まったら実装する
    }
  }
  // Playの更新
  transactUpdates.push(
    ctx.prisma.play.update({
      where: { id: id, result: null },
      data: {
        score: score,
        endedAt: new Date(),
        result,
        ownerTerasReward: emitOwnerTerasReward,
        playerTerasReward: emitPlayerTerasReward,
        playSession: {
          update: {
            state: afterState,
            endedAt: endedAt,
          },
        },
        megaSpark: state === "MEGA_SPARK",
        terasBoosterRatio: ratio,
      },
    }),
  );
  return transactUpdates;
}

type CurrentPlayWithSession = PlaySession & {
  plays: Play[];
  arcadeMachine: {
    game: string;
    feverSparkRemain: number | null;
    energy: number;
    maxEnergy: number;
  };
};

async function getCurrentPlayWithSession(
  ctx: Context,
  playSessionToken: string,
): Promise<CurrentPlayWithSession> {
  const tokenHash = hashSessionToken(playSessionToken);
  const currentPlayWithSession = await ctx.prisma.playSession.findUnique({
    where: { authToken: tokenHash },
    include: {
      plays: {
        where: {
          endedAt: null,
        },
      },
      arcadeMachine: {
        select: {
          game: true,
          feverSparkRemain: true,
          energy: true,
          maxEnergy: true,
        },
      },
    },
  });
  if (!currentPlayWithSession || currentPlayWithSession.plays.length === 0) {
    throw new NotFoundUseCaseError("play session not found", "PlaySession");
  }
  if (currentPlayWithSession.state !== PlaySessionState.PLAYING) {
    throw new IllegalStateUseCaseError("illegal play session state");
  }
  return currentPlayWithSession;
}

// AMがプレイ可能か判定
function isPlayableArcadeMachine(
  ctx: Context,
  arcadeMachine: ArcadeMachine,
): boolean {
  // DepositされてないAMはプレイ不可
  if (arcadeMachine.state !== NftState.IN_AKIVERSE) {
    return false;
  }

  // FeverRemainが0になったAMはプレイができない
  if (
    arcadeMachine.feverSparkRemain !== null &&
    arcadeMachine.feverSparkRemain <= 0
  ) {
    return false;
  }

  // 自分の保有しているAMはGC設置状況に関係なくプレイOK
  if (ctx.currentUserOwns(arcadeMachine)) {
    return true;
  }

  // CBT2 特殊仕様
  // 運営が保有しているAMはGC設置状況に関係なくプレイOK
  if (arcadeMachine.userId === getAkiverseManagerUserId()) {
    return true;
  }

  // 設置されているAMはプレイOK
  if (arcadeMachine.gameCenterId !== null) {
    return true;
  }
  return false;
}

export type ValidScoreParams = {
  timeStamp: Date;
  score: number;
  salt: string;
  currentPlayWithSession: CurrentPlayWithSession;
  signature: string;
};
export function isValidScore({
  timeStamp,
  score,
  salt,
  currentPlayWithSession,
  signature,
}: ValidScoreParams): boolean {
  const timeStampString = timeStamp.toISOString();
  const targetPlay = currentPlayWithSession.plays[0];
  if (targetPlay.createdAt > timeStamp) {
    return false;
  }

  const calcSignature = sha256(
    [
      SCORE_SIGN_KEY_1,
      sha256(
        [
          SCORE_SIGN_KEY_2,
          salt,
          currentPlayWithSession.id,
          timeStampString,
          score.toString(),
        ].join(","),
      ),
    ].join(","),
  );
  return calcSignature === signature;
}
