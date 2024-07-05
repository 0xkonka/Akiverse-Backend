import "reflect-metadata";

import { PlayGameUseCaseMock } from "../../../../mock/use_cases/play_game_usecase_mock";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../src/apps/server/apis/resolvers";
import { resolvers } from "@generated/type-graphql";
import { authChecker } from "../../../../mock/auth_checker";
import { ExecutionResult, graphql } from "graphql";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  NotFoundUseCaseError,
} from "../../../../../src/use_cases/errors";
import { expectGraphqlError } from "./helper";
import { PlaySessionState } from "@prisma/client";
import { createMockContextNonAuth } from "../../../../mock/context";

const mockUseCase = new PlayGameUseCaseMock();
Container.set("playGame.useCase", mockUseCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("startPlaySession", () => {
  const request = `
  mutation StartPlaySession($input: StartPlaySessionInput!) {
    startPlaySession(input: $input) {
      playSessionToken
      session {
        difficulty
        maxPlayCount
        targetScore
      }
      winCondition
    }
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          arcadeMachineId: "1",
          ...extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    mockUseCase.reset();
  });
  test("success", async () => {
    mockUseCase.returnValueForStartPlaySession = {
      playSessionToken: "dummy",
      session: {
        id: "dummy",
        createdAt: new Date(),
        updatedAt: new Date(),
        endedAt: null,
        state: "READY",
        targetScore: 1,
        difficulty: 2,
        maxPlayCount: 3,
        authToken: "dummyToken",
        arcadeMachineId: "1",
        arcadeMachineOwnerId: "amowner",
        gameCenterId: null,
        gameCenterOwnerId: null,
        playerId: "player",
        fever: false,
      },
      winCondition: "CHALLENGE",
    };
    const ret = await send();
    const startPlaySession = ret.data.startPlaySession;
    expect(startPlaySession.sessionToken).not.toBeNull();
  });
  test("no parameter(arcade machine id)", async () => {
    const ret = await send({ arcadeMachineId: null });
    // パラメータの不正はGraphQLレイヤーで吸収しているためここだけ特殊なテストになっている
    expect(ret.errors.length).toBe(1);
  });
  test("not found", async () => {
    mockUseCase.throwErrorForStartPlaySession = new NotFoundUseCaseError(
      "test",
      "ArcadeMachine",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForStartPlaySession = new IllegalStateUseCaseError(
      "test",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("conflict", async () => {
    mockUseCase.throwErrorForStartPlaySession = new ConflictUseCaseError(
      "test",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForStartPlaySession = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});

describe("finishPlaySession", () => {
  const request = `
  mutation FinishPlaySession($input: FinishPlaySessionInput!) {
    finishPlaySession(input: $input) {
      session {
        state
      }
    }
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          playSessionToken: "dummy",
          ...extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    mockUseCase.reset();
  });

  test("success", async () => {
    mockUseCase.returnValueForFinishPlaySession = {
      id: "dummy",
      createdAt: new Date(),
      updatedAt: new Date(),
      endedAt: null,
      authToken: "dummy",
      playerId: "player",
      arcadeMachineId: "1",
      arcadeMachineOwnerId: "amowner",
      gameCenterId: "2",
      gameCenterOwnerId: "gcowner",
      maxPlayCount: 3,
      targetScore: 4,
      difficulty: 5,
      state: PlaySessionState.FINISHED,
      fever: false,
    };
    const ret = await send();
    const finishPlaySession = ret.data.finishPlaySession;
    expect(finishPlaySession.session.state).toBe("FINISHED");
  });
  test("playSessionToken empty", async () => {
    const ret = await send({ playSessionToken: "" });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForFinishPlaySession = new NotFoundUseCaseError(
      "test",
      "PlaySession",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForFinishPlaySession = new IllegalStateUseCaseError(
      "test",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForFinishPlaySession = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});

describe("startPlay", () => {
  const request = `
  mutation StartPlay($input: StartPlayInput!) {
    startPlay(input: $input) {
      success
    }
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          playSessionToken: "dummy",
          ...extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    mockUseCase.reset();
  });

  test("success", async () => {
    const ret = await send();
    const startPlay = ret.data.startPlay;
    expect(startPlay.success).toBeTruthy();
  });
  test("authToken empty", async () => {
    const ret = await send({ playSessionToken: "" });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForStartPlay = new NotFoundUseCaseError(
      "test",
      "PlaySession",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForStartPlay = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForStartPlay = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});

describe("inProgress", () => {
  const request = `
  mutation InProgress($input: InProgressInput!) {
    inProgress(input: $input) {
      success
    }
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          playSessionToken: "dummy",
          ...extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    mockUseCase.reset();
  });

  test("success", async () => {
    const ret = await send();
    const inProgress = ret.data.inProgress;
    expect(inProgress.success).toBeTruthy();
  });
  test("not found", async () => {
    mockUseCase.throwErrorForInProgress = new NotFoundUseCaseError(
      "test",
      "PlaySession",
    );
    const ret = await send();
    const inProgress = ret.data.inProgress;
    expect(inProgress.success).toBeTruthy();
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForInProgress = new IllegalStateUseCaseError("test");
    const ret = await send();
    const inProgress = ret.data.inProgress;
    expect(inProgress.success).toBeTruthy();
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForInProgress = new Error("test");
    const ret = await send();
    const inProgress = ret.data.inProgress;
    expect(inProgress.success).toBeTruthy();
  });
});

describe("finishPlay", () => {
  const request = `
  mutation FinishPlay($input: FinishPlayInput!) {
    finishPlay(input: $input) {
      success
    }
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          playSessionToken: "dummy",
          ...extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    mockUseCase.reset();
  });

  test("success", async () => {
    const ret = await send();
    const finishPlay = ret.data.finishPlay;
    expect(finishPlay.success).toBeTruthy();
  });
  test("not found", async () => {
    mockUseCase.throwErrorForFinishPlay = new NotFoundUseCaseError(
      "test",
      "PlaySession",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForFinishPlay = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForFinishPlay = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
