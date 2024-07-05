import "reflect-metadata";

import { eraseDatabase } from "../../../../../test_helper";
import {
  createMockContext,
  createMockContextNonAuth,
} from "../../../../../mock/context";
import { buildSchemaSync } from "type-graphql";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { graphql } from "graphql";
import { Context } from "../../../../../../src/context";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
describe("list interstitial banners", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });

  const request = `
  query ListInterstitialBanners($where: InterstitialBannerWhereInput, $orderBy: [InterstitialBannerOrderByWithRelationInput!], $cursor: InterstitialBannerWhereUniqueInput, $take: Int, $skip: Int, $distinct: [InterstitialBannerScalarFieldEnum!]) {
    listInterstitialBanners(where: $where, orderBy: $orderBy, cursor: $cursor, take: $take, skip: $skip, distinct: $distinct) {
      id
      imageUrl
      externalLink
      display
      startAt
      endAt
    }
  }
  `;

  async function send(ctx: Context, args: object): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        ...args,
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  test("国指定なし", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.interstitialBanner.createMany({
      data: [
        {
          id: 1,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
        },
      ],
    });
    const ret = await send(ctx, {});
    expect(ret.data.listInterstitialBanners).toHaveLength(1);
  });
  test("WAFで国が特定されなかった", async () => {
    const ctx = await createMockContextNonAuth();
    await ctx.prisma.interstitialBanner.createMany({
      data: [
        {
          id: 1,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
        },
        {
          id: 2,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
          targetArea: "US",
        },
      ],
    });
    const ret = await send(ctx, {});
    expect(ret.data.listInterstitialBanners).toHaveLength(1);
  });
  test("対象外の国は取得できない", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.interstitialBanner.createMany({
      data: [
        {
          id: 1,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
        },
        {
          id: 2,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
          targetArea: "US,UK",
        },
      ],
    });
    const ret = await send(ctx, {});
    expect(ret.data.listInterstitialBanners).toHaveLength(1);
  });
  test("対象の国は取得できる", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.interstitialBanner.createMany({
      data: [
        {
          id: 1,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
        },
        {
          id: 2,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
          targetArea: "JP,US,UK",
        },
      ],
    });
    const ret = await send(ctx, {});
    expect(ret.data.listInterstitialBanners).toHaveLength(2);
  });
  test("除外指定", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.interstitialBanner.createMany({
      data: [
        {
          id: 1,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
        },
        {
          id: 2,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
          targetArea: "JP,US,UK",
        },
        {
          id: 3,
          display: true,
          imageUrl: "hoge",
          startAt: new Date(),
          externalLink: "piyo",
          targetArea: "NON-JP,US,UK",
        },
      ],
    });
    const ret = await send(ctx, {});
    expect(ret.data.listInterstitialBanners).toHaveLength(2);
  });
});
