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
    $orderBy: NotificationOrderByWithRelationInput
    $take: Float
    $cursor: String
    $skip: Float
  ) {
    currentUserNotifications(
      where: $where
      orderBy: $orderBy
      take: $take
      cursor: $cursor
      skip: $skip
    ) {
      id
      createdAt
      userId
      notificationType
      tokenId
      nftType
      messageJson
      messageDetailJson
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
    const insertArr = [];
    // Information 10件
    for (let i = 1; i < 11; i++) {
      insertArr.push({
        userId: ctx.userId!,
        notificationType: NotificationType.INFORMATION,
        tokenId: i.toFixed().padStart(2, "0"),
        nftType: NftType.GAME_CENTER,
        messageJson: { test: "fuga" },
      });
    }

    // Activity 10件
    for (let i = 1; i < 11; i++) {
      insertArr.push({
        userId: ctx.userId!,
        notificationType: NotificationType.ACTIVITY,
        tokenId: i.toFixed().padStart(2, "0"),
        nftType: NftType.GAME_CENTER,
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
    expect(ret.data.currentUserNotifications).toHaveLength(20);
  });
  test("where", async () => {
    const ret = await send({
      where: {
        notificationType: {
          equals: "INFORMATION",
        },
        tokenId: {
          equals: "03",
        },
      },
    });
    expect(ret.data.currentUserNotifications).toHaveLength(1);
    expect(ret.data.currentUserNotifications[0]).toMatchObject({
      tokenId: "03",
      notificationType: NotificationType.INFORMATION,
      nftType: "GAME_CENTER",
      messageJson: {
        test: "fuga",
      },
    });
  });
  test("where and order by", async () => {
    const ret = await send({
      where: {
        notificationType: {
          equals: "INFORMATION",
        },
      },
      orderBy: {
        tokenId: {
          sort: "desc",
        },
      },
    });
    expect(ret.data.currentUserNotifications).toHaveLength(10);
    for (let i = 10; i > 0; i--) {
      const target = ret.data.currentUserNotifications.shift();
      expect(target).toMatchObject({
        tokenId: i.toFixed().padStart(2, "0"),
        notificationType: NotificationType.INFORMATION,
        nftType: "GAME_CENTER",
        messageJson: {
          test: "fuga",
        },
      });
    }
  });
  test("skip", async () => {
    const ret = await send({
      where: {
        notificationType: {
          equals: "INFORMATION",
        },
      },
      orderBy: {
        tokenId: {
          sort: "desc",
        },
      },
      skip: 3,
    });
    expect(ret.data.currentUserNotifications).toHaveLength(7);
    for (let i = 7; i > 0; i--) {
      const target = ret.data.currentUserNotifications.shift();
      expect(target).toMatchObject({
        tokenId: i.toFixed().padStart(2, "0"),
        notificationType: NotificationType.INFORMATION,
        nftType: "GAME_CENTER",
        messageJson: {
          test: "fuga",
        },
      });
    }
  });
  test("skip and take", async () => {
    const ret = await send({
      where: {
        notificationType: {
          equals: "INFORMATION",
        },
      },
      orderBy: {
        tokenId: {
          sort: "desc",
        },
      },
      skip: 3,
      take: 2,
    });
    expect(ret.data.currentUserNotifications).toHaveLength(2);
    for (let i = 7; i > 5; i--) {
      const target = ret.data.currentUserNotifications.shift();
      expect(target).toMatchObject({
        tokenId: i.toFixed().padStart(2, "0"),
        notificationType: NotificationType.INFORMATION,
        nftType: "GAME_CENTER",
        messageJson: {
          test: "fuga",
        },
      });
    }
  });
  test("cursor", async () => {
    const ret = await send({
      where: {
        notificationType: {
          equals: "INFORMATION",
        },
      },
      orderBy: {
        tokenId: {
          sort: "desc",
        },
      },
      take: 2,
    });
    expect(ret.data.currentUserNotifications).toHaveLength(2);
    let target;
    for (let i = 10; i > 8; i--) {
      target = ret.data.currentUserNotifications.shift();
      expect(target).toMatchObject({
        tokenId: i.toFixed().padStart(2, "0"),
        notificationType: NotificationType.INFORMATION,
        nftType: "GAME_CENTER",
        messageJson: {
          test: "fuga",
        },
      });
    }

    const ret2 = await send({
      where: {
        notificationType: {
          equals: "INFORMATION",
        },
      },
      orderBy: {
        tokenId: {
          sort: "desc",
        },
      },
      take: 2,
      cursor: target.id,
    });
    expect(ret2.data.currentUserNotifications).toHaveLength(2);
    for (let i = 9; i > 7; i--) {
      target = ret2.data.currentUserNotifications.shift();
      expect(target).toMatchObject({
        tokenId: i.toFixed().padStart(2, "0"),
        notificationType: NotificationType.INFORMATION,
        nftType: "GAME_CENTER",
        messageJson: {
          test: "fuga",
        },
      });
    }
  });
});
