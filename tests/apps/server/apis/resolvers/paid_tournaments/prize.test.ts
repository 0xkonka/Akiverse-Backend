import "reflect-metadata";

import { eraseDatabase } from "../../../../../test_helper";
import prisma from "../../../../../../src/prisma";
import { createMockContext } from "../../../../../mock/context";
import { graphql } from "graphql";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("paid tournament prize field resolver", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  const request = `
  query PaidTournaments {
    paidTournaments {
      prizeInfo {
        totalPrizePoolTeras
        winnerPrizeTeras
        prizeByRank {
          order
          title
          prizes {
            itemType
            name
            category
            subCategory
            percentage
            amount
          }
        }
      }
    }
  }
  `;

  async function send(): Promise<any> {
    const ctx = await createMockContext();
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          tournamentId: "dummy",
        },
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  async function createEntries(num: number): Promise<void> {
    const paidTournament = await prisma.paidTournament.create({
      data: {
        title: "test",
        startAt: new Date(),
        endAt: new Date(),
        entryFeeTickets: 10,
      },
    });
    for (let i = 0; i < num; i++) {
      const u = await prisma.user.create({
        data: {
          name: `user${i}`,
          email: `user${i}@unit.test`,
        },
      });
      await prisma.paidTournamentEntry.create({
        data: {
          paidTournamentId: paidTournament.id,
          usedTickets: paidTournament.entryFeeTickets,
          userId: u.id,
        },
      });
    }
    return;
  }
  test("no entries", async () => {
    await createEntries(0);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "0",
      winnerPrizeTeras: "0",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 0,
              percentage: 50,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 0,
              percentage: 36,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 0,
              percentage: 14,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("1 entries", async () => {
    await createEntries(1);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "800", // 1000Teras x1 80%
      winnerPrizeTeras: "400",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 400,
              percentage: 50,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 280,
              percentage: 36,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 110,
              percentage: 14,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("30 entries", async () => {
    await createEntries(30);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "24000", // 1000Teras x30 80%
      winnerPrizeTeras: "12000",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 12000,
              percentage: 50,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 8640,
              percentage: 36,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 3360,
              percentage: 14,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("31 entries", async () => {
    await createEntries(31);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "21700", // 1000Teras x31 70%
      winnerPrizeTeras: "8680",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 8680,
              percentage: 40,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 6510,
              percentage: 30,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 3030,
              percentage: 14,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 4,
          title: "4th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1730,
              percentage: 8,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 5,
          title: "5th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1080,
              percentage: 5,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 6,
          title: "6th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 650,
              percentage: 3,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("50 entries", async () => {
    await createEntries(50);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "35000", // 1000Teras x50 70%
      winnerPrizeTeras: "14000",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 14000,
              percentage: 40,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 10500,
              percentage: 30,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 4900,
              percentage: 14,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 4,
          title: "4th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 2800,
              percentage: 8,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 5,
          title: "5th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1750,
              percentage: 5,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 6,
          title: "6th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1050,
              percentage: 3,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("51 entries", async () => {
    await createEntries(51);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "30600", // 1000Teras x51 60%
      winnerPrizeTeras: "12240",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 12240,
              percentage: 40,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 5500,
              percentage: 18,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 3060,
              percentage: 10,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 4,
          title: "4th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1830,
              percentage: 6,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 5,
          title: "5th to 8th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1220,
              percentage: 4,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 6,
          title: "9th to 11th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 610,
              percentage: 2,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 7,
          title: "12th to 15th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 300,
              percentage: 1,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("200 entries", async () => {
    await createEntries(200);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "120000", // 1000Teras x200 60%
      winnerPrizeTeras: "48000",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 48000,
              percentage: 40,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 21600,
              percentage: 18,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 12000,
              percentage: 10,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 4,
          title: "4th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 7200,
              percentage: 6,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 5,
          title: "5th to 8th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 4800,
              percentage: 4,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 6,
          title: "9th to 11th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 2400,
              percentage: 2,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 7,
          title: "12th to 15th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1200,
              percentage: 1,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
  test("201 entries", async () => {
    await createEntries(201);
    const ret = await send();
    expect(ret.data.paidTournaments[0].prizeInfo).toMatchObject({
      totalPrizePoolTeras: "100500", // 1000Teras x201 50%
      winnerPrizeTeras: "40200",
      prizeByRank: [
        {
          order: 1,
          title: "1st place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 40200,
              percentage: 40,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 2,
          title: "2nd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 14070,
              percentage: 14,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 3,
          title: "3rd place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 8040,
              percentage: 8,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 4,
          title: "4th to 5th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 6030,
              percentage: 6,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 5,
          title: "6th to 8th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 4020,
              percentage: 4,
              category: null,
              subCategory: null,
            },
          ],
        },

        {
          order: 6,
          title: "9th to 11th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 2010,
              percentage: 2,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 7,
          title: "12th to 13th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1400,
              percentage: 1.4,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 8,
          title: "14th to 17th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 1000,
              percentage: 1,
              category: null,
              subCategory: null,
            },
          ],
        },
        {
          order: 9,
          title: "18th to 20th place",
          prizes: [
            {
              itemType: "TERAS",
              name: "Teras",
              amount: 400,
              percentage: 0.4,
              category: null,
              subCategory: null,
            },
          ],
        },
      ],
    });
  });
});
