import "reflect-metadata";

import { eraseDatabase } from "../../../../../test_helper";
import prisma from "../../../../../../src/prisma";
import { baseCreateMockContext } from "../../../../../mock/context";
import { graphql } from "graphql";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import dayjs from "dayjs";
import { Context } from "../../../../../../src/context";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("paid tournament badge field resolver", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  const request = `
  query PaidTournaments($orderBy: [PaidTournamentOrderByWithRelationInput!]) {
    paidTournaments(orderBy: $orderBy) {
      badge
    }
  }
  `;
  async function send(ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        orderBy: [
          {
            endAt: "asc",
          },
        ],
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  async function createTestData() {
    const now = dayjs().toDate();
    const beforeFinish = dayjs(now).add(1, "day").toDate();
    const nowSub12hour = dayjs(now).add(-12, "hour").toDate();
    const nowSub25hour = dayjs(now).add(-25, "hour").toDate();
    const startAt = dayjs(now).add(-10, "day").toDate();
    await prisma.paidTournament.createMany({
      data: [
        {
          title: "まだ実施中",
          startAt: startAt,
          endAt: beforeFinish,
          entryFeeTickets: 1,
        },
        {
          title: "終了後12時間",
          startAt: startAt,
          endAt: nowSub12hour,
          entryFeeTickets: 1,
        },
        {
          title: "終了後25時間",
          startAt: startAt,
          endAt: nowSub25hour,
          entryFeeTickets: 1,
        },
        {
          title: "対象だがTerasオンリー",
          startAt: startAt,
          endAt: nowSub12hour,
          entryFeeTickets: 1,
          prizeTerasOnly: true,
        },
      ],
    });
  }
  test("badge", async () => {
    const ctx = await baseCreateMockContext({
      extraData: {},
      accessTokenExtraData: {},
      country: "local",
      tokenType: "magic",
    });
    await createTestData();
    const ret = await send(ctx);
    expect(ret.data.paidTournaments).toMatchObject([
      {
        badge: false,
      },
      {
        badge: true,
      },
      {
        badge: false,
      },
      {
        badge: false,
      },
    ]);
  });
});
