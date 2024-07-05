import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { RankingUseCaseMock } from "../../../../../mock/use_cases/ranking_usecase_mock";
import { Context } from "../../../../../../src/context";
import { ExecutionResult, graphql } from "graphql";
import { eraseDatabase } from "../../../../../test_helper";
import { createMockContext } from "../../../../../mock/context";
import { InvalidArgumentUseCaseError } from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";
import { Rankings } from "../../../../../../src/helpers/ranking";

const useCase = new RankingUseCaseMock();
Container.set("ranking.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("list rankings", () => {
  beforeEach(async () => {
    useCase.reset();
    await eraseDatabase();
  });
  const request = `
  query ListRankings($rankingId: String!) {
    listRankings(rankingId: $rankingId) {
      topList {
        rank
        score
        userId
        name
        iconType
        iconSubCategory
        titleSubCategory
        frameSubCategory
      }
      myself {
        rank
        score
        userId
        name
        iconType
        iconSubCategory
        titleSubCategory
        frameSubCategory
      }
    }
  }
  `;
  async function send(ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        rankingId: "SPARK_CURRENT",
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  test("success", async () => {
    const ctx = await createMockContext();
    const user = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.userId!,
      },
    });
    const otherCtx = await createMockContext();
    const otherUser = await ctx.prisma.user.findUniqueOrThrow({
      where: {
        id: otherCtx.userId!,
      },
    });
    const mockRet: Rankings = {
      topList: [
        {
          userId: otherUser.id,
          name: otherUser.name,
          rank: 1,
          score: 99999,
          iconType: otherUser.iconType,
          iconSubCategory: otherUser.iconSubCategory,
          frameSubCategory: otherUser.frameSubCategory,
          titleSubCategory: otherUser.titleSubCategory,
        },
      ],
      myself: {
        userId: user.id,
        name: user.name,
        rank: 9999,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    };
    useCase.returnValueForGetRanking = mockRet;
    const ret = await send(ctx);
    expect(ret.data.listRankings).toMatchObject({
      topList: [
        {
          userId: otherUser.id,
          name: otherUser.name,
          rank: 1,
          score: 99999,
          iconType: otherUser.iconType,
          iconSubCategory: otherUser.iconSubCategory,
          frameSubCategory: otherUser.frameSubCategory,
          titleSubCategory: otherUser.titleSubCategory,
        },
      ],
      myself: {
        userId: user.id,
        name: user.name,
        rank: 9999,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    });
  });
  test("invalid argument", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForGetRanking = new InvalidArgumentUseCaseError("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("unknown error ", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForGetRanking = new Error("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
