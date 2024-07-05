import "reflect-metadata";

import { Context } from "../../../../../../src/context";
import { eraseDatabase } from "../../../../../test_helper";
import { createMockContext } from "../../../../../mock/context";
import { graphql } from "graphql";
import { Container, Service } from "typedi";
import { buildSchemaSync } from "type-graphql";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("collectible items", () => {
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
  query CurrentUserCollectibleItems($where: CollectibleItemsWhereInput, $orderBy: CollectibleItemOrderByWithRelationInput, $cursor: String, $take: Float, $skip: Float) {
    currentUserCollectibleItems(where: $where, orderBy: $orderBy, cursor: $cursor, take: $take, skip: $skip) {
      id
      createdAt
      userId
      category
      subCategory
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
    await ctx.prisma.collectibleItem.createMany({
      data: [
        {
          userId: ctx.userId!,
          category: "ICON",
          subCategory: "test1",
        },
        {
          userId: ctx.userId!,
          category: "ICON",
          subCategory: "test2",
        },
        {
          userId: ctx.userId!,
          category: "ICON",
          subCategory: "test3",
        },
      ],
    });
  }

  test("all records", async () => {
    const ret = await send({});
    expect(ret.data.currentUserCollectibleItems).toHaveLength(3);
    expect(ret.data.currentUserCollectibleItems).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test1",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test2",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test3",
      },
    ]);
  });
  test("where", async () => {
    const ret = await send({
      where: {
        subCategory: {
          equals: "test2",
        },
      },
    });
    expect(ret.data.currentUserCollectibleItems).toHaveLength(1);
    expect(ret.data.currentUserCollectibleItems[0]).toMatchObject({
      userId: currentUserCtx.userId!,
      category: "ICON",
      subCategory: "test2",
    });
  });
  test("order by", async () => {
    const ret = await send({
      orderBy: { subCategory: "desc" },
    });
    expect(ret.data.currentUserCollectibleItems).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test3",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test2",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test1",
      },
    ]);
  });
  test("skip and take", async () => {
    const ret = await send({
      skip: 1,
      take: 2,
      orderBy: {
        subCategory: "asc",
      },
    });
    expect(ret.data.currentUserCollectibleItems).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test2",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test3",
      },
    ]);
  });
  test("cursor", async () => {
    const ret = await send({
      take: 2,
      orderBy: {
        subCategory: "asc",
      },
    });
    expect(ret.data.currentUserCollectibleItems).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test1",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test2",
      },
    ]);
    const ret2 = await send({
      cursor: ret.data.currentUserCollectibleItems[1].id,
      orderBy: {
        subCategory: "asc",
      },
    });
    expect(ret2.data.currentUserCollectibleItems).toMatchObject([
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test2",
      },
      {
        userId: currentUserCtx.userId!,
        category: "ICON",
        subCategory: "test3",
      },
    ]);
  });
});
