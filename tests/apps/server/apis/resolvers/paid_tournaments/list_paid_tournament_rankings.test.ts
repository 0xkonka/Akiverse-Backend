import "reflect-metadata";

import { Container, Service } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { eraseDatabase } from "../../../../../test_helper";
import { Context } from "../../../../../../src/context";
import { ExecutionResult, graphql } from "graphql";
import {
  baseCreateMockContext,
  createMockContext,
} from "../../../../../mock/context";
import { Rankings } from "../../../../../../src/helpers/ranking";
import { PaidTournamentUseCaseMock } from "../../../../../mock/use_cases/paid_tournament_usecase_mock";
import { InvalidArgumentUseCaseError } from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";
import dayjs from "dayjs";
import { Prisma } from "@prisma/client";

const useCase = new PaidTournamentUseCaseMock();
Container.set("paidTournament.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("list paid tournament rankings", () => {
  beforeEach(async () => {
    useCase.reset();
    await eraseDatabase();
  });
  const request = `
  query ListPaidTournamentRankings($tournamentId: String!) {
    listPaidTournamentRankings(tournamentId: $tournamentId) {
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
        tournamentId: "tournamentId",
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
        rank: 2,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    };
    const endAt = dayjs().add(-1, "hour").toDate();
    useCase.returnValueForGetRanking = {
      rankings: mockRet,
      endAt: endAt,
    };
    const ret = await send(ctx);
    expect(ret.data.listPaidTournamentRankings).toMatchObject({
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
        rank: 2,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    });
  });
  test("success/賞金交換対象", async () => {
    const ctx = await baseCreateMockContext({
      extraData: {},
      accessTokenExtraData: {},
      country: "local",
      tokenType: "magic",
    });
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
        rank: 2,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    };
    const endAt = dayjs().add(-1, "hour").toDate();
    useCase.returnValueForGetRanking = {
      rankings: mockRet,
      endAt: endAt,
      prizes: {
        teras: new Prisma.Decimal("1000"),
        localCurrency: 10,
        crypt: 11,
      },
    };
    const ret = await send(ctx);
    expect(ret.data.listPaidTournamentRankings).toMatchObject({
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
        rank: 2,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    });
  });
  test("success/賞金交換対象国だがランク外", async () => {
    const ctx = await baseCreateMockContext({
      extraData: {},
      accessTokenExtraData: {},
      country: "local",
      tokenType: "magic",
    });
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
        rank: 10,
        score: 1000,
        iconType: user.iconType,
        iconSubCategory: user.iconSubCategory,
        frameSubCategory: user.frameSubCategory,
        titleSubCategory: user.titleSubCategory,
      },
    };
    const endAt = dayjs().add(-1, "hour").toDate();
    useCase.returnValueForGetRanking = {
      rankings: mockRet,
      endAt: endAt,
      prizes: {
        teras: new Prisma.Decimal("1000"),
        localCurrency: 10,
        crypt: 11,
      },
    };
    const ret = await send(ctx);
    expect(ret.data.listPaidTournamentRankings).toMatchObject({
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
        rank: 10,
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
