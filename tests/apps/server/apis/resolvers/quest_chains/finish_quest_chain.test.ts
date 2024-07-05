import "reflect-metadata";

import { Container } from "typedi";
import { QuestUseCaseMock } from "../../../../../mock/use_cases/quest_usecase_mock";
import { expectGraphqlError, schemaInit } from "../helper";
import { Context } from "../../../../../../src/context";
import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../../../../../src/use_cases/errors";

const useCase = new QuestUseCaseMock();
Container.set("quest.useCase", useCase);

const schema = schemaInit();

describe("finish quest chain", () => {
  beforeEach(() => {
    useCase.reset();
  });
  const request = `
  mutation FinishQuestChain($input: FinishQuestChainInput!) {
    finishQuestChain(input: $input) {
      rewards {
        itemType
        category
        subCategory
        name
        amount
      }
      questChain {
        id
        createdAt
        userId
        questChainMasterId
        completed
        acceptedAt
        expiredAt
      }
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
    useCase.returnValueForFinishQuestChain = {
      id: "id1",
      userId: ctx.userId!,
      questChainMasterId: "test",
      completed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiredAt: new Date(),
      acceptedAt: new Date(),
      rewards: [
        {
          itemType: "ARCADE_PART",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          amount: 1,
        },
      ],
    };
    const ret = await send(ctx);
    expect(ret.data.finishQuestChain).toMatchObject({
      questChain: {
        id: "id1",
        userId: ctx.userId!,
        questChainMasterId: "test",
        completed: true,
      },
      rewards: [
        {
          itemType: "ARCADE_PART",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          amount: 1,
        },
      ],
    });
  });
  test("IllegalStateUseCaseError", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForFinishQuestChain = new IllegalStateUseCaseError(
      "test",
    );
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("InvalidArgumentUseCaseError", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForFinishQuestChain = new InvalidArgumentUseCaseError(
      "test",
    );
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
});
