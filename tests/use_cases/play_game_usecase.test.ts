import { createRandomUser, createUser, eraseDatabase } from "../test_helper";
import {
  ArcadeMachine,
  GameCenter,
  GameCenterArea,
  GameCenterSize,
  GameSetting,
  NftState,
  Play,
  PlayResult,
  PlaySession,
  Prisma,
} from "@prisma/client";
import { Context } from "../../src/context";
import prisma from "../../src/prisma";
import { createMockContext } from "../mock/context";
import { PlayGameUseCaseImpl } from "../../src/use_cases/play_game_usecase";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
} from "../../src/use_cases/errors";
import { hashSessionToken } from "../../src/helpers/auth";
import { GameId, games } from "../../src/metadata/games";
import {
  FEVER_SPARK_MAX_COUNT,
  FEVER_SPARKED_REWARD_TOTAL,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAkiverseManagerUserId,
  MEGA_SPARKED_REWARD,
  SCORE_SIGN_KEY_1,
  SCORE_SIGN_KEY_2,
} from "../../src/constants";
import { calculateEmitReward } from "../../src/helpers/fee";
import {
  distributionRewardSparkCount,
  distributionRewardPlayCount,
} from "../../src/helpers/campaign";
import { QuestProgressChecker } from "../../src/helpers/quests";
import { sha256 } from "../../src/utils";
import { RankingUseCaseImpl } from "../../src/use_cases/ranking_usecase";
import dayjs from "dayjs";

const useCase = new PlayGameUseCaseImpl(
  new QuestProgressChecker(),
  new RankingUseCaseImpl(),
);

async function createGameCenter(
  ctx: Context,
  extraData = {},
): Promise<GameCenter> {
  return await prisma.gameCenter.create({
    data: {
      id: "1",
      name: "test",
      size: GameCenterSize.SMALL,
      xCoordinate: 1,
      yCoordinate: 1,
      area: GameCenterArea.AKIHABARA,
      userId: ctx.userId,
      ...extraData,
    },
  });
}

async function createArcadeMachine(
  ctx: Context,
  extraData = {},
): Promise<ArcadeMachine> {
  return await prisma.arcadeMachine.create({
    data: {
      game: games.BUBBLE_ATTACK.id,
      userId: ctx.userId,
      maxEnergy: 1000,
      energy: 0,
      accumulatorSubCategory: "HOKUTO_100_LX",
      ...extraData,
    },
  });
}

type PlaySessionWithPlays = PlaySession & { plays: Play[] };
async function createPlayingSession(
  ctx: Context,
  am: ArcadeMachine,
  playedCount: number = 0,
  finished: boolean = true,
  extraData = {},
): Promise<PlaySessionWithPlays> {
  const plays = [] as any;
  if (playedCount > 0) {
    for (let i = 0; i < playedCount; i++) {
      plays.push({
        endedAt: new Date(),
        result: PlayResult.WIN,
      });
    }
    if (!finished) {
      const lastPlay = plays[plays.length - 1];
      lastPlay.endedAt = null;
      lastPlay.result = null;
    }
  }
  return await prisma.playSession.create({
    data: {
      state: "READY",
      authToken: hashSessionToken("dummy"),
      arcadeMachineId: am.id,
      arcadeMachineOwnerId: am.userId!,
      maxPlayCount: 1,
      targetScore: 100,
      difficulty: 1,
      playerId: ctx.userId!,
      plays: {
        createMany: {
          data: plays,
        },
      },
      ...extraData,
    },
    include: {
      plays: true,
    },
  });
}

async function createMegaSparkedSession(
  ctx: Context,
  am: ArcadeMachine,
  playedCount: number = 0,
  finished: boolean = true,
  extraData = {},
): Promise<PlaySessionWithPlays> {
  const plays = [] as any;
  for (let i = 0; i < playedCount; i++) {
    plays.push({
      endedAt: new Date(),
      result: PlayResult.WIN,
      megaSpark: true,
    });
  }
  if (!finished) {
    const lastPlay = plays[plays.length - 1];
    lastPlay.endedAt = null;
    lastPlay.result = null;
  }
  return await prisma.playSession.create({
    data: {
      state: "FINISHED",
      authToken: hashSessionToken("dummy spark"),
      arcadeMachineId: am.id,
      arcadeMachineOwnerId: am.userId!,
      maxPlayCount: 1,
      targetScore: 100,
      difficulty: 1,
      playerId: ctx.userId!,
      plays: {
        createMany: {
          data: plays,
        },
      },
      ...extraData,
    },
    include: {
      plays: true,
    },
  });
}

async function createGameSetting(
  name: string,
  extraData = {},
): Promise<GameSetting> {
  return await prisma.gameSetting.create({
    data: {
      game: games.BUBBLE_ATTACK.id,
      difficulty: 2,
      targetScore: 100,
      dailyMaxPlayCount: 5,
      easyDifficulty: 1,
      easyTargetScore: 80,
      ...extraData,
    },
  });
}

describe("startPlaySession", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  describe("自保有のAM", () => {
    test("success/当日初ゲーム", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      const setting = await createGameSetting(am.game);
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      // SDK都合が解消されたら修正する
      // expect(ret.session.maxPlayCount).toBeNull();
      expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
      expect(ret.session.fever).toBeFalsy();
    });
    test("success/当日1回ゲームしている", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      const setting = await createGameSetting(am.game);
      await createPlayingSession(ctx, am, 1, true, {
        state: "FINISHED",
      });
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      // SDK都合が解消されたら修正する
      // expect(ret.session.maxPlayCount).toBeNull();
      expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
    });
    test("success/1日のプレイ上限までプレイ済みだがAMOだからプレイできる", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      const setting = await createGameSetting(am.game);
      await createPlayingSession(ctx, am, setting.dailyMaxPlayCount, true, {
        state: "FINISHED",
      });
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      // SDK都合が解消されたら修正する
      // expect(ret.session.maxPlayCount).toBeNull();
      expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
    });
  });
  describe("他者保有のAM", () => {
    test("success/当日初ゲーム", async () => {
      const gcOwner = await createUser();
      const ctx = await createMockContext();
      const gc = await createGameCenter(ctx, { userId: gcOwner.id });
      const am = await createArcadeMachine(ctx, {
        gameCenterId: gc.id,
        userId: gcOwner.id,
      });
      const setting = await createGameSetting(am.game);
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
    });
    test("success/当日2回ゲームしている", async () => {
      const gcOwner = await createUser();
      const ctx = await createMockContext();
      const gc = await createGameCenter(ctx, { userId: gcOwner.id });
      const am = await createArcadeMachine(ctx, {
        gameCenterId: gc.id,
        userId: gcOwner.id,
      });
      const setting = await createGameSetting(am.game);
      const played = await createPlayingSession(ctx, am, 2, true, {
        state: "FINISHED",
      });
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      expect(ret.session.maxPlayCount).toEqual(
        setting.dailyMaxPlayCount - played.plays.length,
      );
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
    });
    test("fail/1日のプレイ上限までプレイ済み", async () => {
      const gcOwner = await createUser();
      const ctx = await createMockContext();
      const gc = await createGameCenter(ctx, { userId: gcOwner.id });
      const am = await createArcadeMachine(ctx, {
        gameCenterId: gc.id,
        userId: gcOwner.id,
      });
      const setting = await createGameSetting(am.game);
      await createPlayingSession(ctx, am, setting.dailyMaxPlayCount, true, {
        state: "FINISHED",
      });
      await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
        IllegalStateUseCaseError,
      );
    });
  });
  // CBT2 特殊仕様 運営保有のAMは未設置で誰でもプレイできる
  describe("運営保有のAM", () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    afterAll(() => {
      jest.resetAllMocks();
    });
    test("success/当日初ゲーム/未設置", async () => {
      const akiverseManager = await createRandomUser();
      const ctx = await createMockContext();
      (getAkiverseManagerUserId as jest.Mock) = jest
        .fn()
        .mockReturnValue(akiverseManager.id);

      const am = await createArcadeMachine(ctx, {
        userId: akiverseManager.id,
      });
      const setting = await createGameSetting(am.game);
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
    });
    test("success/当日2回ゲームしている/GC設置済み", async () => {
      const gcOwner = await createRandomUser();
      const akiverseManager = await createRandomUser();
      const ctx = await createMockContext();
      (getAkiverseManagerUserId as jest.Mock) = jest
        .fn()
        .mockReturnValue(akiverseManager.id);
      const gc = await createGameCenter(ctx, { userId: gcOwner.id });
      const am = await createArcadeMachine(ctx, {
        gameCenterId: gc.id,
        userId: akiverseManager.id,
      });
      const setting = await createGameSetting(am.game);
      const played = await createPlayingSession(ctx, am, 2, true, {
        state: "FINISHED",
      });
      const ret = await useCase.startPlaySession(ctx, am.id);
      expect(ret.playSessionToken).not.toBeNull();
      expect(ret.session.difficulty).toEqual(setting.difficulty);
      expect(ret.session.maxPlayCount).toEqual(
        setting.dailyMaxPlayCount - played.plays.length,
      );
      expect(ret.session.targetScore).toEqual(setting.targetScore);
      expect(ret.winCondition).toEqual("BATTLE");
    });
    test("fail/1日のプレイ上限までプレイ済み", async () => {
      const gcOwner = await createRandomUser();
      const akiverseManager = await createRandomUser();
      const ctx = await createMockContext();
      (getAkiverseManagerUserId as jest.Mock) = jest
        .fn()
        .mockReturnValue(akiverseManager.id);
      const gc = await createGameCenter(ctx, { userId: gcOwner.id });
      const am = await createArcadeMachine(ctx, {
        gameCenterId: gc.id,
        userId: akiverseManager.id,
      });
      const setting = await createGameSetting(am.game);
      await createPlayingSession(ctx, am, setting.dailyMaxPlayCount, true, {
        state: "FINISHED",
      });
      await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
        IllegalStateUseCaseError,
      );
    });
  });
  test("fail/ArcadeMachineが存在しない", async () => {
    const ctx = await createMockContext();
    await expect(useCase.startPlaySession(ctx, "1")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("fail/GameSettingが存在しない", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("fail/別ユーザーにプレイされている", async () => {
    const otherUser = await createUser();
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createGameSetting(am.game);
    await createPlayingSession(ctx, am, 0, true, { playerId: otherUser.id });
    await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
      ConflictUseCaseError,
    );
  });
  test("success/自分がプレイ中", async () => {
    const akiverseManager = await createRandomUser();
    const ctx = await createMockContext();
    (getAkiverseManagerUserId as jest.Mock) = jest
      .fn()
      .mockReturnValue(akiverseManager.id);

    const am = await createArcadeMachine(ctx, {
      userId: akiverseManager.id,
    });
    const played = await createPlayingSession(ctx, am, 2, false);
    expect(played.state).toEqual("READY");
    const playingPlay = played.plays.find((value) => {
      if (value.result === null) {
        return true;
      }
      return false;
    })!;
    expect(playingPlay.result).toBeNull();
    const setting = await createGameSetting(am.game);
    const ret = await useCase.startPlaySession(ctx, am.id);
    expect(ret.playSessionToken).not.toBeNull();
    expect(ret.session.difficulty).toEqual(setting.difficulty);
    expect(ret.session.maxPlayCount).toEqual(
      setting.dailyMaxPlayCount - played.plays.length,
    );
    expect(ret.session.targetScore).toEqual(setting.targetScore);
    expect(ret.winCondition).toEqual("BATTLE");

    // 先にプレイされていたPlaySessionが終了されていること
    const playSessionWithPlay = await ctx.prisma.playSession.findUniqueOrThrow({
      where: {
        id: played.id,
      },
      include: {
        plays: {
          where: {
            id: playingPlay.id,
          },
        },
      },
    });
    expect(playSessionWithPlay.state).toEqual("FINISHED");
    expect(playSessionWithPlay.plays).toHaveLength(1);
    expect(playSessionWithPlay.plays[0].result).toEqual("DISCONNECTED");
  });
  test("success/別のPlaySessionがすでに存在している", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    const am2 = await createArcadeMachine(ctx);
    const setting = await createGameSetting(am.game);
    const played = await createPlayingSession(ctx, am2, 0);
    const ret = await useCase.startPlaySession(ctx, am.id);
    expect(ret.playSessionToken).not.toBeNull();
    expect(ret.session.difficulty).toEqual(setting.difficulty);
    expect(ret.session.maxPlayCount).toEqual(
      setting.dailyMaxPlayCount - played.plays.length,
    );
    expect(ret.session.targetScore).toEqual(setting.targetScore);
    expect(ret.winCondition).toEqual("BATTLE");
  });
  test("fail/同時にPlaySessionを同一ユーザーが作成する", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    const am2 = await createArcadeMachine(ctx);
    await createGameSetting(am.game);
    const orgMethod = ctx.prisma.playSession.create;
    (ctx.prisma.playSession.create as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        await orgMethod({
          data: {
            state: "READY",
            arcadeMachineId: am2.id,
            arcadeMachineOwnerId: am2.userId!,
            maxPlayCount: 1,
            targetScore: 100,
            difficulty: 1,
            playerId: ctx.userId!,
            authToken: "fuga",
          },
        });
        return orgMethod(args);
      });
    await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
      ConflictUseCaseError,
    );
    ctx.prisma.playSession.create = orgMethod;
  });
  test("disabled game can't play", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx, { game: "CURVE_BALL_3D" });
    await createGameSetting(am.game);
    await createPlayingSession(ctx, am, 0);
    await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("Non-deposited ArcadeMachines cannot play", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx, {
      game: "CURVE_BALL_3D",
      state: NftState.IN_WALLET,
    });
    await createGameSetting(am.game);
    await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("success/Fever残数があるうちはプレイできる", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx, {
      game: "BUBBLE_ATTACK",
      energy: 1000,
      maxEnergy: 1000,
      feverSparkRemain: 1,
    });
    const setting = await createGameSetting(am.game);
    const ret = await useCase.startPlaySession(ctx, am.id);
    expect(ret.playSessionToken).not.toBeNull();
    expect(ret.session.difficulty).toEqual(setting.difficulty);
    // SDK都合が解消されたら修正する
    // expect(ret.session.maxPlayCount).toBeNull();
    expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
    expect(ret.session.targetScore).toEqual(setting.targetScore);
    expect(ret.winCondition).toEqual("BATTLE");
    expect(ret.session.fever).toBeTruthy();
  });
  test("fail/Fever残数が0になったらプレイできない", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx, {
      game: "BUBBLE_ATTACK",
      energy: 1000,
      maxEnergy: 1000,
      feverSparkRemain: 0,
    });
    await createGameSetting(am.game);
    await createPlayingSession(ctx, am, 0);
    await expect(useCase.startPlaySession(ctx, am.id)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("easyMode有効期間内", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.activeBooster.create({
      data: {
        userId: ctx.userId!,
        category: "EASY_MODE",
        subCategory: "ALL",
        endAt: dayjs().add(1, "hour").toDate(),
      },
    });
    const am = await createArcadeMachine(ctx);
    const setting = await createGameSetting(am.game);
    const ret = await useCase.startPlaySession(ctx, am.id);
    expect(ret.playSessionToken).not.toBeNull();
    expect(ret.session.difficulty).toEqual(setting.easyDifficulty);
    // SDK都合が解消されたら修正する
    // expect(ret.session.maxPlayCount).toBeNull();
    expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
    expect(ret.session.targetScore).toEqual(setting.easyTargetScore);
    expect(ret.winCondition).toEqual("BATTLE");
    expect(ret.session.fever).toBeFalsy();
  });
  test("easyMode有効期間外", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.activeBooster.create({
      data: {
        userId: ctx.userId!,
        category: "EASY_MODE",
        subCategory: "ALL",
        endAt: dayjs().add(-1, "hour").toDate(),
      },
    });
    const am = await createArcadeMachine(ctx);
    const setting = await createGameSetting(am.game);
    const ret = await useCase.startPlaySession(ctx, am.id);
    expect(ret.playSessionToken).not.toBeNull();
    expect(ret.session.difficulty).toEqual(setting.difficulty);
    // SDK都合が解消されたら修正する
    // expect(ret.session.maxPlayCount).toBeNull();
    expect(ret.session.maxPlayCount).toEqual(setting.dailyMaxPlayCount);
    expect(ret.session.targetScore).toEqual(setting.targetScore);
    expect(ret.winCondition).toEqual("BATTLE");
    expect(ret.session.fever).toBeFalsy();
  });
});

describe("finishPlaySession", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 0, true);
    const ret = await useCase.finishPlaySession(ctx, "dummy");
    expect(ret.state).toEqual("FINISHED");
  });
  test("play session not found", async () => {
    const ctx = await createMockContext();
    await expect(useCase.finishPlaySession(ctx, "dummy")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("play session state illegal", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 0, true, { state: "PLAYING" });
    await expect(useCase.finishPlaySession(ctx, "dummy")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("play session state is FINISHED", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 0, true, { state: "FINISHED" });
    const ret = await useCase.finishPlaySession(ctx, "dummy");
    expect(ret.state).toEqual("FINISHED");
  });
});

describe("startPlay", () => {
  beforeEach(async () => {
    await eraseDatabase();

    (distributionRewardPlayCount as jest.Mock) = jest
      .fn()
      .mockImplementation(async () => {});
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 0);
    await useCase.startPlay(ctx, "dummy");
    expect(distributionRewardPlayCount).toHaveBeenCalled();
  });
  test("success/maxPlayCount is null", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 0, true, { maxPlayCount: null });
    await useCase.startPlay(ctx, "dummy");
    expect(distributionRewardPlayCount).toHaveBeenCalled();
  });
  test("play session not found", async () => {
    const ctx = await createMockContext();
    await expect(useCase.startPlay(ctx, "dummy")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
    expect(distributionRewardPlayCount).not.toHaveBeenCalled();
  });
  test("play session already finished", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 0, true, { state: "FINISHED" });
    await expect(useCase.startPlay(ctx, "dummy")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
    expect(distributionRewardPlayCount).not.toHaveBeenCalled();
  });
  test("already daily max plays", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1);
    await expect(useCase.startPlay(ctx, "dummy")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
    expect(distributionRewardPlayCount).not.toHaveBeenCalled();
  });
  test("プレイ中のレコードが存在する", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 3,
    });
    await expect(useCase.startPlay(ctx, "dummy")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
    expect(distributionRewardPlayCount).not.toHaveBeenCalled();
  });
  test("startPlayがほぼ同時に操作された", async () => {
    const ctx = await createMockContext();
    const orgUpdateMethod = ctx.prisma.playSession.update;
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, true, {
      maxPlayCount: 3,
    });
    (ctx.prisma.playSession.update as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        // playSession.updateを同じ引数で2回呼ぶことで、疑似的に同時操作された状況を作り出している
        await orgUpdateMethod(args);
        return orgUpdateMethod(args);
      });
    await expect(useCase.startPlay(ctx, "dummy")).rejects.toThrowError(
      ConflictUseCaseError,
    );
    // restore
    ctx.prisma.playSession.update = orgUpdateMethod;
    expect(distributionRewardPlayCount).not.toHaveBeenCalled();
  });
});

describe("inProgress", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/score include/not signature", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, false, { state: "PLAYING" });
    const before = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(before!.plays[0].score).toBeNull();
    await useCase.inProgress(ctx, "dummy", 1);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(after!.plays[0].score).toBe(1);
    expect(after!.plays[0].updatedAt.getTime()).toBeGreaterThan(
      before!.plays[0].updatedAt.getTime(),
    );
  });
  test("success/score not include/not signature", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, false, { state: "PLAYING" });
    const before = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(before!.plays[0].score).toBeNull();
    await useCase.inProgress(ctx, "dummy");
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(after!.plays[0].score).toBeNull();
    expect(after!.plays[0].updatedAt.getTime()).toBeGreaterThan(
      before!.plays[0].updatedAt.getTime(),
    );
  });
  test("success/score include/signature include", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, false, { state: "PLAYING" });
    const before = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(before!.plays[0].score).toBeNull();
    const { timeStamp, signature } = createSignature(before!.id, 1);
    await useCase.inProgress(ctx, "dummy", 1, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(after!.plays[0].score).toBe(1);
    expect(after!.plays[0].updatedAt.getTime()).toBeGreaterThan(
      before!.plays[0].updatedAt.getTime(),
    );
  });
  test("play session not found", async () => {
    const ctx = await createMockContext();
    await expect(useCase.inProgress(ctx, "dummy")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("playing state play record not found", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, true);
    const before = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(before!.plays.length).toBe(1);
    expect(before!.plays[0].endedAt).not.toBeNull();
    await expect(useCase.inProgress(ctx, "dummy")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("invalid signature", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    await createPlayingSession(ctx, am, 1, false, { state: "PLAYING" });
    const before = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    expect(before!.plays[0].score).toBeNull();
    const { timeStamp, signature } = createSignature(before!.id, 1);
    await expect(
      useCase.inProgress(ctx, "dummy", 2, timeStamp, "salt", signature),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
});

type CreateSignatureResponse = {
  signature: string;
  timeStamp: Date;
};
function createSignature(
  playSessionId: string,
  score: number,
): CreateSignatureResponse {
  const timeStamp = new Date();
  const signature = sha256(
    [
      SCORE_SIGN_KEY_1,
      sha256(
        [
          SCORE_SIGN_KEY_2,
          "salt",
          playSessionId,
          timeStamp.toISOString(),
          score.toString(),
        ].join(","),
      ),
    ].join(","),
  );
  return {
    signature,
    timeStamp,
  };
}

describe("finishPlay", () => {
  beforeEach(async () => {
    await eraseDatabase();

    (distributionRewardSparkCount as jest.Mock) = jest
      .fn()
      .mockImplementation(async () => {});
  });
  describe("success", () => {
    test("score is equal to target score", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 100);
      await useCase.finishPlay(ctx, "dummy", 100, timeStamp, "salt", signature);
      const calculated = calculateEmitReward(true, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(after.arcadeMachine.feverSparkRemain).toBeNull();
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("score is equal to target score - 他保有AM", async () => {
      const ctx = await createMockContext();
      const dummyUser = await ctx.prisma.user.create({
        data: {
          name: "dummy owner",
          email: "dummy.owner@test",
        },
      });
      const am = await createArcadeMachine(ctx, { userId: dummyUser.id });
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 100);
      await useCase.finishPlay(ctx, "dummy", 100, timeStamp, "salt", signature);
      const calculated = calculateEmitReward(false, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("Score is lower than target score", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 99);
      await useCase.finishPlay(ctx, "dummy", 99, timeStamp, "salt", signature);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("LOSS");
        expect(after.state).toBe("READY");
        expect(after.plays[0].playerTerasReward).toBeNull();
        expect(after.plays[0].ownerTerasReward).toBeNull();
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(0);
        expect(distributionRewardSparkCount).not.toHaveBeenCalled();
      }
    });
    test("Score is higher than target score", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 101);
      await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
      const calculated = calculateEmitReward(true, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("Score is higher than target score - 他保有AM", async () => {
      const ctx = await createMockContext();
      const dummyUser = await ctx.prisma.user.create({
        data: {
          name: "dummy owner",
          email: "dummy.owner@test",
        },
      });
      const am = await createArcadeMachine(ctx, { userId: dummyUser.id });
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 101);
      await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
      const calculated = calculateEmitReward(false, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("Maximum energy charged the arcade machine", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx, {
        energy: 1000,
        feverSparkRemain: 3,
      });
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 101);
      await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).not.toBeNull();
        expect(after.plays[0].ownerTerasReward).not.toBeNull();
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(1000);
        expect(after.arcadeMachine.feverSparkRemain).toEqual(2);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("played up to the limit.", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 101);
      await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.state).toBe("FINISHED");
        expect(after.endedAt).not.toBeNull();
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
  });
  // TODO no signatureは後に削除する
  describe("success/no signature", () => {
    test("score is equal to target score", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 100);
      const calculated = calculateEmitReward(true, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("score is equal to target score - 他保有AM", async () => {
      const ctx = await createMockContext();
      const dummyUser = await ctx.prisma.user.create({
        data: {
          name: "dummy owner",
          email: "dummy.owner@test",
        },
      });
      const am = await createArcadeMachine(ctx, { userId: dummyUser.id });
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 100);
      const calculated = calculateEmitReward(false, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("Score is lower than target score", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 99);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("LOSS");
        expect(after.state).toBe("READY");
        expect(after.plays[0].playerTerasReward).toBeNull();
        expect(after.plays[0].ownerTerasReward).toBeNull();
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(0);
        expect(distributionRewardSparkCount).not.toHaveBeenCalled();
      }
    });
    test("Score is higher than target score", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 101);
      const calculated = calculateEmitReward(true, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("Score is higher than target score - 他保有AM", async () => {
      const ctx = await createMockContext();
      const dummyUser = await ctx.prisma.user.create({
        data: {
          name: "dummy owner",
          email: "dummy.owner@test",
        },
      });
      const am = await createArcadeMachine(ctx, { userId: dummyUser.id });
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 101);
      const calculated = calculateEmitReward(false, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(
          calculated.emitPlayerReward,
        );
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("Maximum energy charged the arcade machine", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx, {
        energy: 1000,
        feverSparkRemain: 3,
      });
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 101);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).not.toBeNull();
        expect(after.plays[0].ownerTerasReward).not.toBeNull();
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(1000);
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("played up to the limit.", async () => {
      const ctx = await createMockContext();
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      await useCase.finishPlay(ctx, "dummy", 101);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.state).toBe("FINISHED");
        expect(after.endedAt).not.toBeNull();
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
  });
  test("play session not found", async () => {
    const ctx = await createMockContext();
    const { signature, timeStamp } = createSignature("dummyId", 100);
    await expect(
      useCase.finishPlay(ctx, "dummy", 1, timeStamp, "salt", signature),
    ).rejects.toThrowError(NotFoundUseCaseError);
    expect(distributionRewardSparkCount).not.toHaveBeenCalled();
  });
  test("play session is finished", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    const before = await createPlayingSession(ctx, am, 1, true, {
      state: "FINISHED",
    });
    const { signature, timeStamp } = createSignature(before!.id, 1);
    await expect(
      useCase.finishPlay(ctx, "dummy", 1, timeStamp, "salt", signature),
    ).rejects.toThrowError(NotFoundUseCaseError);
    expect(distributionRewardSparkCount).not.toHaveBeenCalled();
  });
  test("playing play record not found", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    const before = await createPlayingSession(ctx, am, 1, true);
    const { signature, timeStamp } = createSignature(before!.id, 1);
    await expect(
      useCase.finishPlay(ctx, "dummy", 1, timeStamp, "salt", signature),
    ).rejects.toThrowError(NotFoundUseCaseError);
    expect(distributionRewardSparkCount).not.toHaveBeenCalled();
  });
  test("AM owners can play as many times", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine(ctx);
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: null,
      state: "PLAYING",
    });
    const { signature, timeStamp } = createSignature(before!.id, 1);
    await useCase.finishPlay(ctx, "dummy", 1, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("LOSS");
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(distributionRewardSparkCount).not.toHaveBeenCalled();
    }
  });

  test("MegaSpark - 通常パターン", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const am = await createArcadeMachine(ctx, {
      energy: 900,
      userId: dummyUser.id,
    });
    const game = games[am.game as GameId];
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 2,
      state: "PLAYING",
    });
    const { signature, timeStamp } = createSignature(before!.id, 101);
    await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
        arcadeMachine: true,
      },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("WIN");
      expect(after.plays[0].megaSpark).toBe(true);
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(after.arcadeMachine.energy).toBe(after.arcadeMachine.maxEnergy);
      expect(after.arcadeMachine.feverSparkRemain).toEqual(30);

      const afterPlayer = await ctx.prisma.user.findUnique({
        where: { id: after?.playerId },
      });
      expect(afterPlayer?.terasBalance).toEqual(MEGA_SPARKED_REWARD);

      const afterOwner = await ctx.prisma.user.findUnique({
        where: { id: after?.arcadeMachineOwnerId },
      });
      expect(afterOwner?.terasBalance).toEqual(
        game.sparkedEmitTerasOther.div(2),
      );

      const notificationCount = await ctx.prisma.notification.count();
      expect(notificationCount).toBe(5);

      const playerActivity = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.playerId,
          notificationType: "ACTIVITY",
        },
      });
      expect(playerActivity?.messageJson).toMatchObject({
        messageId: "A00002",
        totalMegaSpark: 1,
      });

      const ownerActivity = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.arcadeMachineOwnerId,
          notificationType: "ACTIVITY",
        },
      });
      expect(ownerActivity?.messageJson).toMatchObject({
        messageId: "A00003",
      });

      const playerNotification = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.playerId,
          notificationType: "INFORMATION",
        },
      });
      expect(playerNotification?.messageJson).toMatchObject({
        messageId: "I00027",
        arcadeMachineId: after.arcadeMachineId,
      });

      const ownerNotifications = await ctx.prisma.notification.findMany({
        where: {
          userId: after.arcadeMachineOwnerId,
          notificationType: "INFORMATION",
        },
      });
      expect(ownerNotifications.length).toBe(2);
      const messages = [
        ownerNotifications[0].messageJson,
        ownerNotifications[1].messageJson,
      ];
      expect(messages).toContainEqual({
        messageId: "I00028",
        arcadeMachineId: after.arcadeMachineId,
      });
      expect(messages).toContainEqual({
        messageId: "I00030",
        arcadeMachineId: after.arcadeMachineId,
      });
    }
  });

  test("MegaSpark - N回目の確認", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const am = await createArcadeMachine(ctx, {
      energy: 900,
      userId: dummyUser.id,
    });
    const game = games[am.game as GameId];
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 2,
      state: "PLAYING",
    });
    const dummyAm = await createArcadeMachine(ctx, {
      energy: 1000,
      userId: dummyUser.id,
    });

    // MegaSpark履歴を作る（Playerと他ユーザー）
    const dummySparkUser = await ctx.prisma.user.create({
      data: {
        name: "dummy spark user",
        email: "dummy.spark@test",
      },
    });
    await createMegaSparkedSession(ctx, dummyAm, 1, false, {
      playerId: dummySparkUser.id,
      authToken: hashSessionToken("dummy spark"),
    });
    await createMegaSparkedSession(ctx, dummyAm, 1, false, {
      authToken: hashSessionToken("dummy spark2"),
    });

    const { signature, timeStamp } = createSignature(before!.id, 101);
    await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    const afterAM = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: am.id },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("WIN");
      expect(after.plays[0].megaSpark).toBe(true);
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(afterAM?.energy).toBe(afterAM?.maxEnergy);

      const afterPlayer = await ctx.prisma.user.findUnique({
        where: { id: after?.playerId },
      });
      expect(afterPlayer?.terasBalance).toEqual(MEGA_SPARKED_REWARD);

      const afterOwner = await ctx.prisma.user.findUnique({
        where: { id: after?.arcadeMachineOwnerId },
      });
      expect(afterOwner?.terasBalance).toEqual(
        game.sparkedEmitTerasOther.div(2),
      );

      const notificationCount = await ctx.prisma.notification.count();
      expect(notificationCount).toBe(5);

      // 2回目のMegaSparkであることを確認する
      const playerActivity = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.playerId,
          notificationType: "ACTIVITY",
        },
      });
      expect(playerActivity?.messageJson).toMatchObject({
        messageId: "A00002",
        totalMegaSpark: 2,
      });

      const ownerActivity = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.arcadeMachineOwnerId,
          notificationType: "ACTIVITY",
        },
      });
      expect(ownerActivity?.messageJson).toMatchObject({
        messageId: "A00003",
      });

      const playerNotification = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.playerId,
          notificationType: "INFORMATION",
        },
      });
      expect(playerNotification?.messageJson).toMatchObject({
        messageId: "I00027",
        arcadeMachineId: after.arcadeMachineId,
      });

      const ownerNotifications = await ctx.prisma.notification.findMany({
        where: {
          userId: after.arcadeMachineOwnerId,
          notificationType: "INFORMATION",
        },
      });
      expect(ownerNotifications.length).toBe(2);
      const messages = [
        ownerNotifications[0].messageJson,
        ownerNotifications[1].messageJson,
      ];
      expect(messages).toContainEqual({
        messageId: "I00028",
        arcadeMachineId: after.arcadeMachineId,
      });
      expect(messages).toContainEqual({
        messageId: "I00030",
        arcadeMachineId: after.arcadeMachineId,
      });
    }
  });

  test("MegaSpark - リーチ通知", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const am = await createArcadeMachine(ctx, {
      energy: 800,
      userId: dummyUser.id,
    });
    const game = games[am.game as GameId];
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 2,
      state: "PLAYING",
    });
    const { signature, timeStamp } = createSignature(before!.id, 101);
    await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
      },
    });
    const afterAM = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: am.id },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("WIN");
      expect(after.plays[0].megaSpark).toBe(false);
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(afterAM?.energy).not.toBe(afterAM?.maxEnergy);

      const afterPlayer = await ctx.prisma.user.findUnique({
        where: { id: after?.playerId },
      });
      expect(afterPlayer?.terasBalance).toEqual(
        game.sparkedEmitTerasOther.div(2),
      );

      const afterOwner = await ctx.prisma.user.findUnique({
        where: { id: after?.arcadeMachineOwnerId },
      });
      expect(afterOwner?.terasBalance).toEqual(
        game.sparkedEmitTerasOther.div(2),
      );

      const notificationCount = await ctx.prisma.notification.count();
      expect(notificationCount).toBe(2);

      const playerNotification = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.playerId,
          notificationType: "INFORMATION",
        },
      });
      expect(playerNotification?.messageJson).toMatchObject({
        messageId: "I00024",
        arcadeMachineId: after.arcadeMachineId,
      });

      const ownerNotification = await ctx.prisma.notification.findFirst({
        where: {
          userId: after.arcadeMachineOwnerId,
          notificationType: "INFORMATION",
        },
      });
      expect(ownerNotification?.messageJson).toMatchObject({
        messageId: "I00025",
        arcadeMachineId: after.arcadeMachineId,
      });
    }
  });

  test("MegaSpark - MegaSpark済みAMでSpark", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const am = await createArcadeMachine(ctx, {
      energy: 1000,
      userId: dummyUser.id,
      feverSparkRemain: 30,
    });
    const gameMetadata = games[am.game as GameId];
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 2,
      state: "PLAYING",
    });
    const { signature, timeStamp } = createSignature(before!.id, 101);
    await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
        arcadeMachine: true,
      },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("WIN");
      // MegaSparkしていない
      expect(after.plays[0].megaSpark).toBe(false);
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(after.arcadeMachine.energy).toBe(after.arcadeMachine.maxEnergy);
      expect(after.arcadeMachine.feverSparkRemain).toEqual(29);

      // プレイヤーの報酬確認
      const afterPlayer = await ctx.prisma.user.findUnique({
        where: { id: after?.playerId },
      });
      expect(afterPlayer?.terasBalance).toEqual(
        gameMetadata.sparkedEmitTerasOther
          .div(2)
          .add(FEVER_SPARKED_REWARD_TOTAL.div(2)),
      );

      // オーナーの報酬確認
      const afterOwner = await ctx.prisma.user.findUnique({
        where: { id: after?.arcadeMachineOwnerId },
      });
      expect(afterOwner?.terasBalance).toEqual(
        gameMetadata.sparkedEmitTerasOther
          .div(2)
          .add(FEVER_SPARKED_REWARD_TOTAL.div(2)),
      );

      // 通知なし
      const notificationCount = await ctx.prisma.notification.count();
      expect(notificationCount).toBe(0);
    }
  });

  test("MegaSpark - MegaSpark済みAMでNoSpark", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const am = await createArcadeMachine(ctx, {
      energy: 1000,
      userId: dummyUser.id,
      feverSparkRemain: FEVER_SPARK_MAX_COUNT,
    });
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 2,
      state: "PLAYING",
    });
    const { signature, timeStamp } = createSignature(before!.id, 0);
    await useCase.finishPlay(ctx, "dummy", 0, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
        arcadeMachine: true,
      },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("LOSS");
      // MegaSparkしていない
      expect(after.plays[0].megaSpark).toBe(false);
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(after.arcadeMachine.energy).toBe(after.arcadeMachine.maxEnergy);
      expect(after.arcadeMachine.feverSparkRemain).toEqual(
        FEVER_SPARK_MAX_COUNT,
      );

      // プレイヤーの報酬確認
      const afterPlayer = await ctx.prisma.user.findUnique({
        where: { id: after?.playerId },
      });
      expect(afterPlayer?.terasBalance).toEqual(new Prisma.Decimal(0));

      // オーナーの報酬確認
      const afterOwner = await ctx.prisma.user.findUnique({
        where: { id: after?.arcadeMachineOwnerId },
      });
      expect(afterOwner?.terasBalance).toEqual(new Prisma.Decimal(0));

      // 通知なし
      const notificationCount = await ctx.prisma.notification.count();
      expect(notificationCount).toBe(0);
    }
  });
  test("FeverTime ended", async () => {
    const ctx = await createMockContext();
    const dummyUser = await ctx.prisma.user.create({
      data: {
        name: "dummy owner",
        email: "dummy.owner@test",
      },
    });
    const gc = await createGameCenter(ctx, {
      userId: dummyUser.id,
    });
    const am = await createArcadeMachine(ctx, {
      energy: 1000,
      userId: dummyUser.id,
      feverSparkRemain: 1,
      gameCenterId: gc.id,
      position: 1,
    });
    const gameMetadata = games[am.game as GameId];
    const before = await createPlayingSession(ctx, am, 1, false, {
      maxPlayCount: 2,
      state: "PLAYING",
    });
    const { signature, timeStamp } = createSignature(before!.id, 101);
    await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
    const after = await ctx.prisma.playSession.findUnique({
      where: { authToken: hashSessionToken("dummy") },
      include: {
        plays: true,
        arcadeMachine: true,
      },
    });

    expect(after).not.toBeNull();
    if (after) {
      expect(after.plays[0].endedAt).not.toBeNull();
      expect(after.plays[0].result).toBe("WIN");
      // MegaSparkしていない
      expect(after.plays[0].megaSpark).toBe(false);
      expect(after.state).toBe("READY");
      expect(after.endedAt).toBeNull();
      expect(after.arcadeMachine.energy).toBe(after.arcadeMachine.maxEnergy);
      expect(after.arcadeMachine.feverSparkRemain).toEqual(0);
      // 撤去されている
      expect(after.arcadeMachine.gameCenterId).toBeNull();
      expect(after.arcadeMachine.position).toBeNull();
      expect(after.arcadeMachine.installedAt).toBeNull();

      // プレイヤーの報酬確認
      const afterPlayer = await ctx.prisma.user.findUnique({
        where: { id: after?.playerId },
      });
      expect(afterPlayer?.terasBalance).toEqual(
        gameMetadata.sparkedEmitTerasOther
          .div(2)
          .add(FEVER_SPARKED_REWARD_TOTAL.div(2)),
      );

      // オーナーの報酬確認
      const afterOwner = await ctx.prisma.user.findUnique({
        where: { id: after?.arcadeMachineOwnerId },
      });
      expect(afterOwner?.terasBalance).toEqual(
        gameMetadata.sparkedEmitTerasOther
          .div(2)
          .add(FEVER_SPARKED_REWARD_TOTAL.div(2)),
      );

      // TODO GCOに撤去通知、AMOにFever終了通知が必要
      // 通知なし
      const notificationCount = await ctx.prisma.notification.count();
      expect(notificationCount).toBe(0);
    }
  });
  describe("booster", () => {
    async function createBoosterRecord(ctx: Context) {
      await ctx.prisma.activeBooster.create({
        data: {
          category: "SPARK_TERAS_UP",
          subCategory: "x2.5",
          endAt: dayjs().add(1, "hour").toDate(),
          userId: ctx.userId!,
        },
      });
    }
    test("normal finish", async () => {
      const ctx = await createMockContext();
      await createBoosterRecord(ctx);
      const am = await createArcadeMachine(ctx);
      await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const before = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
        },
      });
      expect(before!.plays.length).toBe(1);
      expect(before!.plays[0].endedAt).toBeNull();
      expect(before!.plays[0].result).toBeNull();
      const { signature, timeStamp } = createSignature(before!.id, 100);
      await useCase.finishPlay(ctx, "dummy", 100, timeStamp, "salt", signature);
      const calculated = calculateEmitReward(true, am.game, false);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });
      expect(after).not.toBeNull();
      if (after) {
        const playerReward = calculated.emitPlayerReward.mul(2.5);
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].playerTerasReward).toEqual(playerReward);
        expect(after.plays[0].ownerTerasReward).toEqual(
          calculated.emitOwnerReward,
        );
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toEqual(100);
        expect(after.arcadeMachine.feverSparkRemain).toBeNull();
        expect(distributionRewardSparkCount).toHaveBeenCalled();
      }
    });
    test("mega sparking finish", async () => {
      const ctx = await createMockContext();
      await createBoosterRecord(ctx);
      const dummyUser = await ctx.prisma.user.create({
        data: {
          name: "dummy owner",
          email: "dummy.owner@test",
        },
      });
      const am = await createArcadeMachine(ctx, {
        energy: 1000,
        userId: dummyUser.id,
        feverSparkRemain: 30,
      });
      const gameMetadata = games[am.game as GameId];
      const before = await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const { signature, timeStamp } = createSignature(before!.id, 101);
      await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });

      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        // MegaSparkしていない
        expect(after.plays[0].megaSpark).toBe(false);
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toBe(after.arcadeMachine.maxEnergy);
        expect(after.arcadeMachine.feverSparkRemain).toEqual(29);

        // プレイヤーの報酬確認
        const afterPlayer = await ctx.prisma.user.findUnique({
          where: { id: after?.playerId },
        });
        expect(afterPlayer?.terasBalance).toEqual(
          gameMetadata.sparkedEmitTerasOther
            .div(2)
            .add(FEVER_SPARKED_REWARD_TOTAL.div(2))
            .mul(2.5), // Booster分加算する
        );

        // オーナーの報酬確認
        const afterOwner = await ctx.prisma.user.findUnique({
          where: { id: after?.arcadeMachineOwnerId },
        });
        expect(afterOwner?.terasBalance).toEqual(
          gameMetadata.sparkedEmitTerasOther
            .div(2)
            .add(FEVER_SPARKED_REWARD_TOTAL.div(2)),
        );
      }
    });
    test("mega spark finish", async () => {
      const ctx = await createMockContext();
      await createBoosterRecord(ctx);
      const dummyUser = await ctx.prisma.user.create({
        data: {
          name: "dummy owner",
          email: "dummy.owner@test",
        },
      });
      const am = await createArcadeMachine(ctx, {
        energy: 900,
        userId: dummyUser.id,
      });
      const game = games[am.game as GameId];
      const before = await createPlayingSession(ctx, am, 1, false, {
        maxPlayCount: 2,
        state: "PLAYING",
      });
      const { signature, timeStamp } = createSignature(before!.id, 101);
      await useCase.finishPlay(ctx, "dummy", 101, timeStamp, "salt", signature);
      const after = await ctx.prisma.playSession.findUnique({
        where: { authToken: hashSessionToken("dummy") },
        include: {
          plays: true,
          arcadeMachine: true,
        },
      });

      expect(after).not.toBeNull();
      if (after) {
        expect(after.plays[0].endedAt).not.toBeNull();
        expect(after.plays[0].result).toBe("WIN");
        expect(after.plays[0].megaSpark).toBe(true);
        expect(after.state).toBe("READY");
        expect(after.endedAt).toBeNull();
        expect(after.arcadeMachine.energy).toBe(after.arcadeMachine.maxEnergy);
        expect(after.arcadeMachine.feverSparkRemain).toEqual(30);

        const afterPlayer = await ctx.prisma.user.findUnique({
          where: { id: after?.playerId },
        });
        // Boosterの効果はない
        expect(afterPlayer?.terasBalance).toEqual(MEGA_SPARKED_REWARD);

        const afterOwner = await ctx.prisma.user.findUnique({
          where: { id: after?.arcadeMachineOwnerId },
        });
        expect(afterOwner?.terasBalance).toEqual(
          game.sparkedEmitTerasOther.div(2),
        );
      }
    });
  });
});
