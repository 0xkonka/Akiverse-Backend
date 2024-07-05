import "reflect-metadata";

import { eraseDatabase } from "../../../../../test_helper";
import { baseCreateMockContext } from "../../../../../mock/context";
import { graphql } from "graphql";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { Context } from "../../../../../../src/context";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("paid tournament claimStatus field resolver", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  const request = `
  query PaidTournaments($orderBy: [PaidTournamentOrderByWithRelationInput!]) {
    paidTournaments(orderBy: $orderBy) {
      claimStatus
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

  test("success", async () => {
    const ctx = await baseCreateMockContext({
      extraData: {},
      accessTokenExtraData: {},
      country: undefined,
      tokenType: "magic",
    });

    await ctx.prisma.paidTournament.create({
      data: {
        title: "未エントリー",
        startAt: new Date(),
        endAt: new Date(),
        entryFeeTickets: 10,
      },
    });
    await ctx.prisma.paidTournament.create({
      data: {
        title: "エントリー済、未クレーム",
        startAt: new Date(),
        endAt: new Date(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
          },
        },
      },
    });
    await ctx.prisma.paidTournament.create({
      data: {
        title: "エントリー済、クレーム済",
        startAt: new Date(),
        endAt: new Date(),
        entryFeeTickets: 10,
        entries: {
          create: {
            userId: ctx.userId!,
            usedTickets: 10,
            prizeClaimed: true,
            walletAddress: "wallet_address",
          },
        },
      },
    });

    const ret = await send(ctx);
    expect(ret.data.paidTournaments).toMatchObject([
      {
        claimStatus: false,
      },
      {
        claimStatus: false,
      },
      {
        claimStatus: true,
      },
    ]);
  });
});
