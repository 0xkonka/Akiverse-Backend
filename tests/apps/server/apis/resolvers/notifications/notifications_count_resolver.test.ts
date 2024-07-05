import "reflect-metadata";

import { Context } from "../../../../../../src/context";
import { createMockContext } from "../../../../../mock/context";
import { NftType, NotificationType } from "@prisma/client";
import { graphql } from "graphql";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { eraseDatabase } from "../../../../../test_helper";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("notifications", () => {
  const request = `
  query Notifications(
    $where: CurrentUserNotificationWhereInput
  ) {
    currentUserNotificationsCount(
      where: $where
    ) {
      count
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

  let currentUserCtx: Context;
  let otherUserCtx: Context;

  async function createData(ctx: Context): Promise<void> {
    const insertArr: Array<any> = [];
    // GameCenter Information 10件
    for (let i = 1; i <= 10; i++) {
      insertArr.push({
        userId: ctx.userId!,
        notificationType: NotificationType.INFORMATION,
        tokenId: i.toFixed().padStart(2, "0"),
        nftType: NftType.GAME_CENTER,
        messageJson: { test: "fuga" },
      });
    }

    // GameCenter Activity 11件
    for (let i = 1; i <= 11; i++) {
      insertArr.push({
        userId: ctx.userId!,
        notificationType: NotificationType.ACTIVITY,
        tokenId: i.toFixed().padStart(2, "0"),
        nftType: NftType.GAME_CENTER,
        messageJson: { test: "fuga" },
      });
    }

    // ArcadeMachine INFORMATION 12件
    for (let i = 1; i <= 12; i++) {
      insertArr.push({
        userId: ctx.userId!,
        notificationType: NotificationType.INFORMATION,
        tokenId: i.toFixed().padStart(2, "0"),
        nftType: NftType.ARCADE_MACHINE,
        messageJson: { test: "fuga" },
      });
    }

    // ArcadeMachine Activity 13件
    for (let i = 1; i <= 13; i++) {
      insertArr.push({
        userId: ctx.userId!,
        notificationType: NotificationType.ACTIVITY,
        tokenId: i.toFixed().padStart(2, "0"),
        nftType: NftType.ARCADE_MACHINE,
        messageJson: { test: "fuga" },
      });
    }

    await ctx.prisma.notification.createMany({
      data: insertArr,
    });
  }

  beforeAll(async () => {
    await eraseDatabase();
    currentUserCtx = await createMockContext();
    otherUserCtx = await createMockContext();

    // カレントユーザーのNotificationを作る
    await createData(currentUserCtx);

    // 他人のNotificationを作る
    await createData(otherUserCtx);
  });

  afterAll(async () => {
    await currentUserCtx.prisma.notification.deleteMany({});
  });

  test("all records", async () => {
    const ret = await send({});
    expect(ret.data.currentUserNotificationsCount.count).toEqual(46);
  });
  test("where INFORMATION GAME_CENTER", async () => {
    const ret = await send({
      where: {
        notificationType: { equals: "INFORMATION" },
        nftType: { equals: "GAME_CENTER" },
      },
    });
    expect(ret.data.currentUserNotificationsCount.count).toEqual(10);
  });
  test("where ACTIVITY GAME_CENTER", async () => {
    const ret = await send({
      where: {
        notificationType: { equals: "ACTIVITY" },
        nftType: { equals: "GAME_CENTER" },
      },
    });
    expect(ret.data.currentUserNotificationsCount.count).toEqual(11);
  });
  test("where INFORMATION ARCADE_MACHINE", async () => {
    const ret = await send({
      where: {
        notificationType: { equals: "INFORMATION" },
        nftType: { equals: "ARCADE_MACHINE" },
      },
    });
    expect(ret.data.currentUserNotificationsCount.count).toEqual(12);
  });
  test("where ACTIVITY ARCADE_MACHINE", async () => {
    const ret = await send({
      where: {
        notificationType: { equals: "ACTIVITY" },
        nftType: { equals: "ARCADE_MACHINE" },
      },
    });
    expect(ret.data.currentUserNotificationsCount.count).toEqual(13);
  });
});
