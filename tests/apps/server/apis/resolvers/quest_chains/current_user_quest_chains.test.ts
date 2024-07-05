import "reflect-metadata";

import { buildSchemaSync } from "type-graphql";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { Context } from "../../../../../../src/context";
import { eraseDatabase } from "../../../../../test_helper";
import { createMockContext } from "../../../../../mock/context";
import { graphql } from "graphql";
import { QuestProgressChecker } from "../../../../../../src/helpers/quests";

Container.set("questProgressChecker", new QuestProgressChecker());

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("current user quest chains", () => {
  let currentUserCtx: Context;
  let otherUserCtx: Context;

  beforeAll(async () => {
    await eraseDatabase();
    currentUserCtx = await createMockContext();
    otherUserCtx = await createMockContext();

    await createData(currentUserCtx);
    await createData(otherUserCtx);
  });

  afterAll(async () => {
    await eraseDatabase();
  });

  const request = `
  query CurrentUserQuestChains($where: CurrentUserQuestChainWhereInput, $orderBy: QuestChainOrderByWithRelationInput, $cursor: String, $take: Float, $skip: Float) {
    currentUserQuestChains(where: $where, orderBy: $orderBy, cursor: $cursor, take: $take, skip: $skip) {
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

  async function send(args: object): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        ...args,
      },
      contextValue: currentUserCtx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  async function createData(ctx: Context): Promise<void> {
    await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
        completed: false,
        quests: {
          createMany: {
            data: [
              {
                questMasterId: "TEST_1_1",
                startAt: new Date(),
                completedAt: new Date(),
              },
              {
                questMasterId: "TEST_1_2",
                startAt: new Date(),
              },
            ],
          },
        },
      },
    });
    await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_2",
        acceptedAt: new Date(),
        completed: true,
        quests: {
          createMany: {
            data: [
              {
                questMasterId: "TEST_2_1",
                startAt: new Date(),
                completedAt: new Date(),
              },
              {
                questMasterId: "TEST_2_2",
                startAt: new Date(),
                completedAt: new Date(),
              },
            ],
          },
        },
      },
    });
    await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_3",
        acceptedAt: new Date(),
        completed: false,
        quests: {
          createMany: {
            data: [
              {
                questMasterId: "TEST_3_1",
                startAt: new Date(),
                completedAt: new Date(),
              },
              {
                questMasterId: "TEST_3_2",
                startAt: new Date(),
              },
            ],
          },
        },
      },
    });
  }
  test("all records", async () => {
    const ret = await send({});
    const currentUserQuestChains = ret.data.currentUserQuestChains;
    expect(currentUserQuestChains).toHaveLength(3);
    expect(currentUserQuestChains).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_1",
        completed: false,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_2",
        completed: true,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_3",
        completed: false,
      },
    ]);
  });
  test("where", async () => {
    const ret = await send({
      where: {
        questChainMasterId: {
          equals: "TEST_2",
        },
      },
    });
    const currentUserQuestChains = ret.data.currentUserQuestChains;
    expect(currentUserQuestChains).toHaveLength(1);
    expect(currentUserQuestChains).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_2",
        completed: true,
      },
    ]);
  });
  test("order by", async () => {
    const ret = await send({
      orderBy: { questChainMasterId: "desc" },
    });
    const currentUserQuestChains = ret.data.currentUserQuestChains;
    expect(currentUserQuestChains).toHaveLength(3);
    expect(currentUserQuestChains).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_3",
        completed: false,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_2",
        completed: true,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_1",
        completed: false,
      },
    ]);
  });
  test("skip and take", async () => {
    const ret = await send({
      skip: 1,
      take: 2,
      orderBy: { questChainMasterId: "desc" },
    });
    const currentUserQuestChains = ret.data.currentUserQuestChains;
    expect(currentUserQuestChains).toHaveLength(2);
    expect(currentUserQuestChains).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_2",
        completed: true,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_1",
        completed: false,
      },
    ]);
  });
  test("cursor", async () => {
    const ret = await send({
      take: 2,
      orderBy: { questChainMasterId: "desc" },
    });
    const currentUserQuestChains = ret.data.currentUserQuestChains;
    expect(currentUserQuestChains).toHaveLength(2);
    expect(currentUserQuestChains).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_3",
        completed: false,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_2",
        completed: true,
      },
    ]);

    const ret2 = await send({
      cursor: currentUserQuestChains[1].id,
      orderBy: { questChainMasterId: "desc" },
    });
    const currentUserQuestChains2 = ret2.data.currentUserQuestChains;
    expect(currentUserQuestChains2).toHaveLength(2);
    expect(currentUserQuestChains2).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_2",
        completed: true,
      },
      {
        userId: currentUserCtx.userId!,
        questChainMasterId: "TEST_1",
        completed: false,
      },
    ]);
  });
});
