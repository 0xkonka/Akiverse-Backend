import { eraseDatabase } from "../test_helper";
import {
  ArcadeMachine,
  Play,
  PlayResult,
  PlaySession,
  PlaySessionState,
  User,
} from "@prisma/client";
import prisma from "../../src/prisma";
import { PlayManagerUseCaseImpl } from "../../src/use_cases/play_manager_usecase";
import {
  PLAY_SESSION_READY_TIMEOUT_SECONDS,
  PLAY_TIMEOUT_SECONDS,
} from "../../src/constants";
import { randomUUID } from "crypto";

async function createArcadeMachine(user: User): Promise<ArcadeMachine> {
  return await prisma.arcadeMachine.create({
    data: {
      game: "BUBBLE_ATTACK",
      userId: user.id!,
      accumulatorSubCategory: "HOKUTO_100_LX",
    },
  });
}

async function createUser(): Promise<User> {
  const rand = randomUUID();
  return await prisma.user.create({
    data: {
      email: rand,
      name: rand,
    },
  });
}

async function createPlaySession(
  user: User,
  am: ArcadeMachine,
  extra = {},
): Promise<PlaySession> {
  const rand = randomUUID();
  return await prisma.playSession.create({
    data: {
      arcadeMachineId: am.id,
      maxPlayCount: 5,
      playerId: user.id,
      state: "READY",
      arcadeMachineOwnerId: am.userId!,
      authToken: rand,
      ...extra,
    },
  });
}

const useCase = new PlayManagerUseCaseImpl();
describe("play manager", () => {
  type testData = {
    user: User;
    arcadeMachine: ArcadeMachine;
    playSession: PlaySession;
    plays: Play[];
  };

  // AfterFinished = MaxPlayCountまでPlaysを持っているデータを生成する
  // AfterReady = MaxPlayCount未満のPlaysを持っているデータを生成する
  // AfterNoUpdate = UpdatedAtが更新対象外のデータを生成する
  type createType = "AfterFinished" | "AfterReady" | "AfterNoUpdate";
  async function createTestData(t: createType): Promise<testData> {
    const u = await createUser();
    const am = await createArcadeMachine(u);
    const ps = await createPlaySession(u, am, { state: "PLAYING" });
    const plays = new Array<Play>();

    let loopCount: number;
    if (t === "AfterFinished") {
      loopCount = ps.maxPlayCount! - 1;
    } else {
      loopCount = ps.maxPlayCount! - 2;
    }
    for (let i = 0; i < loopCount; i++) {
      plays.push(
        await prisma.play.create({
          data: {
            playSessionId: ps.id,
            score: 1,
            endedAt: new Date(),
            result: "WIN",
          },
        }),
      );
    }

    let updatedAt: Date;
    if (t === "AfterNoUpdate") {
      updatedAt = new Date();
    } else {
      updatedAt = new Date();
      updatedAt.setSeconds(updatedAt.getSeconds() - PLAY_TIMEOUT_SECONDS - 1);
    }

    plays.push(
      await prisma.play.create({
        data: {
          playSessionId: ps.id,
          updatedAt: updatedAt,
        },
      }),
    );

    return {
      user: u,
      arcadeMachine: am,
      playSession: ps,
      plays: plays,
    };
  }

  beforeEach(async () => {
    await eraseDatabase();
  });
  test("処理実行", async () => {
    // maxPlayCount=plays.length
    const testDataMaxPlay = await createTestData("AfterFinished");

    // maxPlayCount > plays.length
    const testDataPlay = await createTestData("AfterReady");

    // 処理されないデータ
    const testDataAfterNoUpdate = await createTestData("AfterNoUpdate");

    // 処理実行
    await useCase.manageForPlays();

    // 更新後確認
    const afterMaxPlay = await prisma.playSession.findUniqueOrThrow({
      where: { id: testDataMaxPlay.playSession.id },
      include: { plays: true },
    });

    expect(afterMaxPlay.state).toEqual(PlaySessionState.FINISHED);
    expect(afterMaxPlay.updatedAt).not.toEqual(
      testDataMaxPlay.playSession.updatedAt,
    );
    const afterMaxPlayAggregateMap = aggregatePlay(afterMaxPlay.plays);
    expect(afterMaxPlayAggregateMap.get(PlayResult.WIN)).toEqual(4);
    expect(afterMaxPlayAggregateMap.get(PlayResult.DISCONNECTED)).toEqual(1);

    const afterPlay = await prisma.playSession.findUniqueOrThrow({
      where: { id: testDataPlay.playSession.id },
      include: { plays: true },
    });

    // MaxPlayCount未満でまだプレイすることはできるが、セッションは強制終了される
    expect(afterPlay.state).toEqual(PlaySessionState.FINISHED);
    expect(afterPlay.updatedAt).not.toEqual(testDataPlay.playSession.updatedAt);
    const afterPlayAggregateMap = aggregatePlay(afterPlay.plays);
    expect(afterPlayAggregateMap.get(PlayResult.WIN)).toEqual(3);
    expect(afterPlayAggregateMap.get(PlayResult.DISCONNECTED)).toEqual(1);

    const afterNoUpdate = await prisma.playSession.findUniqueOrThrow({
      where: { id: testDataAfterNoUpdate.playSession.id },
      include: { plays: true },
    });
    // PlayのUpdatedAtが処理対象にならないセッションは更新されない
    expect(afterNoUpdate.state).toEqual(PlaySessionState.PLAYING);
    expect(afterNoUpdate.updatedAt).toEqual(
      testDataAfterNoUpdate.playSession.updatedAt,
    );
    const afterNoUpdatePlayAggregateMap = aggregatePlay(afterNoUpdate.plays);
    expect(afterNoUpdatePlayAggregateMap.get(PlayResult.WIN)).toEqual(3);
    expect(afterNoUpdatePlayAggregateMap.get(null)).toEqual(1);
  });

  function aggregatePlay(plays: Play[]): Map<PlayResult | null, number> {
    const map = new Map<PlayResult | null, number>();
    for (const play of plays) {
      let count = 1;
      if (map.has(play.result)) {
        count = map.get(play.result)! + 1;
      }
      map.set(play.result, count);
    }
    return map;
  }
});

describe("play session manager", () => {
  type testData = {
    user: User;
    arcadeMachine: ArcadeMachine;
    playSession: PlaySession;
  };
  async function createTestData(target: boolean): Promise<testData> {
    const u = await createUser();
    const am = await createArcadeMachine(u);
    let extra = {};
    if (target) {
      const updatedAt = new Date();
      updatedAt.setSeconds(
        updatedAt.getSeconds() - PLAY_SESSION_READY_TIMEOUT_SECONDS - 1,
      );
      extra = {
        updatedAt: updatedAt,
      };
    }
    const ps = await createPlaySession(u, am, extra);
    return {
      user: u,
      arcadeMachine: am,
      playSession: ps,
    };
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("処理実行", async () => {
    const nonTarget = await createTestData(false);
    const target = await createTestData(true);

    await useCase.manageForPlaySessions();

    // target:falseは更新されていない
    const afterNonTarget = await prisma.playSession.findUniqueOrThrow({
      where: { id: nonTarget.playSession.id },
    });
    expect(afterNonTarget).toEqual(nonTarget.playSession);

    // target:trueはFINISHEDになっている
    const afterTarget = await prisma.playSession.findUniqueOrThrow({
      where: { id: target.playSession.id },
    });
    expect(afterTarget.state).toEqual(PlaySessionState.FINISHED);
    expect(afterTarget.endedAt).not.toBeNull();
  });
});
