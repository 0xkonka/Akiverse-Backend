import "reflect-metadata";

import { Container } from "typedi";
import { Context } from "../../../../../../src/context";
import { QuestUseCaseMock } from "../../../../../mock/use_cases/quest_usecase_mock";
import { expectGraphqlError, schemaInit } from "../helper";
import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../../../../../src/use_cases/errors";

const useCase = new QuestUseCaseMock();
Container.set("quest.useCase", useCase);

const schema = schemaInit();

describe("start quest chain", () => {
  beforeEach(() => {
    useCase.reset();
  });
  const request = `
  mutation StartQuestChain($input: StartQuestChainInput!) {
    startQuestChain(input: $input) {
      id
      createdAt
      userId
      questChainMasterId
      completed
      acceptedAt
      expiredAt
    }
  }
  `;

  async function send(ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          questMasterId: "test",
        },
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  test("success", async () => {
    const ctx = await createMockContext();
    useCase.returnValueForStartQuestChain = {
      id: "id1",
      userId: ctx.userId!,
      createdAt: new Date(),
      updatedAt: new Date(),
      acceptedAt: new Date(),
      expiredAt: null,
      completed: false,
      questChainMasterId: "test",
    };
    const ret = await send(ctx);
    expect(ret.data.startQuestChain).toMatchObject({
      id: "id1",
      userId: ctx.userId!,
      expiredAt: null,
      completed: false,
      questChainMasterId: "test",
    });
  });
  test("IllegalStateUseCaseError", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForStartQuestChain = new IllegalStateUseCaseError("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("InvalidArgumentUseCaseError", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForStartQuestChain = new InvalidArgumentUseCaseError(
      "test",
    );
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
});
