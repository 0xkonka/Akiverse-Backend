import "reflect-metadata";

import { RewardUseCaseMock } from "../../../../../mock/use_cases/reward_usecase_mock";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { Context } from "../../../../../../src/context";
import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import { RewardDetail } from "../../../../../../src/use_cases/reward_usecase";
import { IllegalStateUseCaseError } from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new RewardUseCaseMock();
Container.set("reward.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});
describe("accept reward", () => {
  const request = `
  mutation AcceptRewardAll {
    acceptRewardAll {
      rewards {
        itemType
        category
        subCategory
        name
        amount
      }
    }
  }`;
  async function send(ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {},
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    useCase.reset();
  });

  test("success", async () => {
    const ctx = await createMockContext();
    const mockData: RewardDetail[] = [];
    mockData.push(
      {
        itemType: "ARCADE_PART",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        amount: 1,
      },
      {
        itemType: "JUNK_PART",
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 2,
      },
      {
        itemType: "TERAS",
        amount: 3000,
      },
      {
        itemType: "COLLECTIBLE_ITEM",
        category: "ICON",
        subCategory: "YUMMY_JUMP",
        amount: 1,
      },
    );
    useCase.returnValue = mockData;
    const ret = await send(ctx);
    expect(ret.data.acceptRewardAll.rewards).toMatchObject([
      {
        itemType: "ARCADE_PART",
        name: "Bubble Attack ROM",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        amount: 1,
      },
      {
        itemType: "JUNK_PART",
        name: "junk Hokuto100LX Accumulator",
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 2,
      },
      {
        itemType: "TERAS",
        name: "Teras",
        amount: 3000,
      },
      {
        itemType: "COLLECTIBLE_ITEM",
        name: "Yummy Jump",
        category: "ICON",
        subCategory: "YUMMY_JUMP",
        amount: 1,
      },
    ]);
  });
  test("illegal state", async () => {
    useCase.throwError = new IllegalStateUseCaseError("test");
    const ret = await send(await createMockContext());
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
});
