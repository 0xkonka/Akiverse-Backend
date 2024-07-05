import { eraseDatabase } from "../test_helper";
import { createMockContext } from "../mock/context";
import { QuestUseCaseImpl } from "../../src/use_cases/quest_usecase";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../src/use_cases/errors";
import dayjs from "dayjs";

import { Prisma } from "@prisma/client";
import prisma from "../../src/prisma";

const yesterday = dayjs().add(-1, "day").toDate();
const tomorrow = dayjs().add(1, "day").toDate();

const useCase = new QuestUseCaseImpl();

async function createTestQuestChainData(): Promise<void> {
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_1",
      title: "TEST_1",
      specifiedTitleImage: false,
      chainCategory: "ONWARD",
      terasRequiredForRelease: 3000,
      akvRequiredForRelease: 5,
      ticketRequiredForRelease: 100,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_1_1",
              title: "TEST_1_1_TITLE",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 1000,
            },
            {
              id: "TEST_1_2",
              title: "TEST_1_2_TITLE",
              seq: 2,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
      rewards: {
        createMany: {
          data: [
            {
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 1000,
            },
            {
              itemType: "ARCADE_PART",
              category: "ROM",
              subCategory: "BUBBLE_ATTACK",
              amount: 1,
            },
            {
              itemType: "ARCADE_PART_RANDOM",
              category: "RANDOM",
              subCategory: "",
              amount: 1,
            },
            {
              itemType: "JUNK_PART",
              category: "ROM",
              subCategory: "YUMMY_JUMP",
              amount: 1,
            },
            {
              itemType: "JUNK_PART_RANDOM",
              category: "RANDOM",
              subCategory: "",
              amount: 1,
            },
            {
              itemType: "COLLECTIBLE_ITEM",
              category: "ICON",
              subCategory: "ICON_1",
              amount: 1,
            },
            {
              itemType: "COLLECTIBLE_ITEM",
              category: "TITLE",
              subCategory: "TITLE_1",
              amount: 1,
            },
          ],
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_2",
      title: "TEST_2_TITLE",
      specifiedTitleImage: false,
      chainCategory: "ONWARD",
      terasRequiredForRelease: 3000,
      akvRequiredForRelease: 5,
      ticketRequiredForRelease: 100,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_2_1",
              title: "TEST_2_1_TITLE",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
      beforeQuestChainId: "TEST_1",
      startAt: yesterday,
      endAt: tomorrow,
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_1",
      title: "TEST_EVENT_1_TITLE",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      terasRequiredForRelease: 3000,
      akvRequiredForRelease: 5,
      ticketRequiredForRelease: 100,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_1_1",
              title: "TEST_EVENT_1_1_TITLE",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
      startAt: yesterday,
      endAt: tomorrow,
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_2",
      title: "TEST_EVENT_2_TITLE",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      terasRequiredForRelease: 3000,
      akvRequiredForRelease: 5,
      ticketRequiredForRelease: 100,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_2_1",
              title: "TEST_EVENT_2_1_TITLE",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
      startAt: tomorrow,
      endAt: tomorrow,
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_3",
      title: "TEST_EVENT_3_TITLE",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      terasRequiredForRelease: 3000,
      akvRequiredForRelease: 5,
      ticketRequiredForRelease: 100,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_3_1",
              title: "TEST_EVENT_3_1_TITLE",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
      startAt: yesterday,
      endAt: yesterday,
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_4",
      title: "TEST_EVENT_4",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_4_1",
              title: "TEST_EVENT_4_1",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
            {
              id: "TEST_EVENT_4_2",
              title: "TEST_EVENT_4_2",
              seq: 2,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              beforeQuestIds: "TEST_EVENT_4_1",
            },
            {
              id: "TEST_EVENT_4_3",
              title: "TEST_EVENT_4_3",
              seq: 3,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_NO_PAYMENT",
      title: "TEST_NO_PAYMENT",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_NO_PAYMENT_1",
              title: "TEST_NO_PAYMENT_1",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
            },
          ],
        },
      },
    },
  });
}

describe("finish quest chain", () => {
  beforeEach(async () => {
    await eraseDatabase();
    await createTestQuestChainData();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
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
                completedAt: new Date(),
              },
            ],
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    const ret = await useCase.finishQuestChain(ctx, "TEST_1");
    expect(ret.completed).toBeTruthy();
    const acceptedRewards = ret.rewards;

    let bubbleAttackRomCount = 0;
    let arcadePartCount = 0;
    let junkYummyJumpRomCount = 0;
    let junkPartCount = 0;
    let terasBalance = 0;
    let iconCount = 0;
    let titleCount = 0;
    for (const acceptedReward of acceptedRewards) {
      switch (acceptedReward.itemType) {
        case "TERAS":
          terasBalance += acceptedReward.amount;
          break;
        case "ARCADE_PART":
          arcadePartCount += acceptedReward.amount;
          if (
            acceptedReward.category === "ROM" &&
            acceptedReward.subCategory === "BUBBLE_ATTACK"
          ) {
            bubbleAttackRomCount += acceptedReward.amount;
          }
          break;
        case "JUNK_PART":
          junkPartCount += acceptedReward.amount;
          if (
            acceptedReward.category === "ROM" &&
            acceptedReward.subCategory === "YUMMY_JUMP"
          ) {
            junkYummyJumpRomCount += acceptedReward.amount;
          }
          break;
        case "COLLECTIBLE_ITEM":
          if (acceptedReward.category === "TITLE") {
            titleCount += acceptedReward.amount;
          } else if (acceptedReward.category === "ICON") {
            iconCount += acceptedReward.amount;
          }
          break;
      }
    }
    // 戻り値確認
    expect(bubbleAttackRomCount).toBeGreaterThanOrEqual(1);
    expect(arcadePartCount).toEqual(2);
    expect(junkYummyJumpRomCount).toBeGreaterThanOrEqual(1);
    expect(junkPartCount).toEqual(2);
    expect(terasBalance).toEqual(1000);
    expect(iconCount).toEqual(1);
    expect(titleCount).toEqual(1);

    // DBの状態確認
    expect(
      await ctx.prisma.arcadePart.count({
        where: {
          userId: ctx.userId!,
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
      }),
    ).toEqual(bubbleAttackRomCount);
    expect(
      await ctx.prisma.arcadePart.count({
        where: {
          userId: ctx.userId!,
        },
      }),
    ).toEqual(arcadePartCount);
    expect(
      await ctx.prisma.junk
        .findUniqueOrThrow({
          where: {
            userId_category_subCategory: {
              userId: ctx.userId!,
              category: "ROM",
              subCategory: "YUMMY_JUMP",
            },
          },
        })
        .then((value) => {
          return value.amount;
        }),
    ).toEqual(junkYummyJumpRomCount);
    expect(
      await ctx.prisma.junk
        .aggregate({
          where: {
            userId: ctx.userId!,
          },
          _sum: {
            amount: true,
          },
        })
        .then((value) => {
          return value._sum.amount;
        }),
    ).toEqual(junkPartCount);
    expect(
      await ctx.prisma.collectibleItem.findMany({
        where: {
          userId: ctx.userId!,
        },
      }),
    ).toMatchObject([
      {
        category: "ICON",
        subCategory: "ICON_1",
      },
      {
        category: "TITLE",
        subCategory: "TITLE_1",
      },
    ]);
    expect(
      await ctx.prisma.user
        .findUniqueOrThrow({
          where: {
            id: ctx.userId,
          },
        })
        .then((value) => {
          return value.terasBalance;
        }),
    ).toEqual(new Prisma.Decimal(1000));
  });
  test("success/set expired at", async () => {
    const ctx = await createMockContext();
    const tomorrow = dayjs().add(1, "day").toDate();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
        expiredAt: tomorrow,
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
                completedAt: new Date(),
              },
            ],
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    const ret = await useCase.finishQuestChain(ctx, "TEST_1");
    expect(ret.completed).toBeTruthy();
  });
  test("quest uncompleted", async () => {
    const ctx = await createMockContext();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
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
                completedAt: null,
              },
            ],
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    await expect(useCase.finishQuestChain(ctx, "TEST_1")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("quest chain expired", async () => {
    const ctx = await createMockContext();
    const yesterday = dayjs().add(-1, "day").toDate();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
        expiredAt: yesterday,
        quests: {
          create: {
            questMasterId: "TEST_1_1",
            startAt: new Date(),
            completedAt: new Date(),
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    await expect(useCase.finishQuestChain(ctx, "TEST_1")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("already completed", async () => {
    const ctx = await createMockContext();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
        completed: true,
        quests: {
          create: {
            questMasterId: "TEST_1_1",
            startAt: new Date(),
            completedAt: new Date(),
          },
        },
      },
    });
    expect(before.completed).toBeTruthy();
    await expect(useCase.finishQuestChain(ctx, "TEST_1")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("unknown quest chain id", async () => {
    const ctx = await createMockContext();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
        quests: {
          create: {
            questMasterId: "TEST_1_1",
            startAt: new Date(),
            completedAt: new Date(),
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    await expect(useCase.finishQuestChain(ctx, "UNKNOWN")).rejects.toThrowError(
      InvalidArgumentUseCaseError,
    );
  });
  test("quest chain not start date", async () => {
    const ctx = await createMockContext();
    const yesterday = dayjs().add(-1, "day").toDate();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_2",
        acceptedAt: new Date(),
        expiredAt: yesterday,
        quests: {
          create: {
            questMasterId: "TEST_EVENT_2",
            startAt: new Date(),
            completedAt: new Date(),
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    await expect(
      useCase.finishQuestChain(ctx, "TEST_EVENT_2"),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("quest chain expired", async () => {
    const ctx = await createMockContext();
    const yesterday = dayjs().add(-1, "day").toDate();
    const before = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_3",
        acceptedAt: new Date(),
        expiredAt: yesterday,
        quests: {
          create: {
            questMasterId: "TEST_EVENT_3",
            startAt: new Date(),
            completedAt: new Date(),
          },
        },
      },
    });
    expect(before.completed).toBeFalsy();
    await expect(
      useCase.finishQuestChain(ctx, "TEST_EVENT_3"),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
});

describe("start quest chain", () => {
  beforeEach(async () => {
    await eraseDatabase();
    await createTestQuestChainData();
  });
  test("success - teras", async () => {
    const ctx = await createMockContext({
      terasBalance: 3000,
      akvBalance: 5,
      tickets: 100,
    });
    const ret = await useCase.startQuestChain(ctx, "TEST_1", "TERAS");
    expect(ret).toMatchObject({
      completed: false,
      expiredAt: null,
      questChainMasterId: "TEST_1",
      userId: ctx.userId,
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(0));
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(5));
    expect(afterUser.tickets).toEqual(100);
  });
  test("success - akv", async () => {
    const ctx = await createMockContext({
      terasBalance: 3000,
      akvBalance: 5,
      tickets: 100,
    });
    const ret = await useCase.startQuestChain(ctx, "TEST_1", "AKV");
    expect(ret).toMatchObject({
      completed: false,
      expiredAt: null,
      questChainMasterId: "TEST_1",
      userId: ctx.userId,
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(3000));
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(0));
    expect(afterUser.tickets).toEqual(100);
  });
  test("success - ticket", async () => {
    const ctx = await createMockContext({
      terasBalance: 3000,
      akvBalance: 5,
      tickets: 100,
    });
    const ret = await useCase.startQuestChain(ctx, "TEST_1", "TICKET");
    expect(ret).toMatchObject({
      completed: false,
      expiredAt: null,
      questChainMasterId: "TEST_1",
      userId: ctx.userId,
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(3000));
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(5));
    expect(afterUser.tickets).toEqual(0);

    const transactions = await ctx.prisma.ticketTransaction.findMany({});
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      userId: ctx.userId,
      transactionType: "OPEN_QUEST",
      changeAmount: -100,
      balance: 0,
      transactionDetail: JSON.stringify({
        questChainId: "TEST_1",
      }),
    });
  });
  test("teras insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: 2999,
      akvBalance: 5,
      tickets: 100,
    });
    await expect(
      useCase.startQuestChain(ctx, "TEST_1", "TERAS"),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("akv insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: 3000,
      akvBalance: 4,
      tickets: 100,
    });
    await expect(
      useCase.startQuestChain(ctx, "TEST_1", "AKV"),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("ticket insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: 3000,
      akvBalance: 5,
      tickets: 99,
    });
    await expect(
      useCase.startQuestChain(ctx, "TEST_1", "TICKET"),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("no payment - teras", async () => {
    const ctx = await createMockContext({
      terasBalance: 3000,
      akvBalance: 5,
      tickets: 100,
    });
    const ret = await useCase.startQuestChain(ctx, "TEST_NO_PAYMENT", "TERAS");
    expect(ret).toMatchObject({
      completed: false,
      expiredAt: null,
      questChainMasterId: "TEST_NO_PAYMENT",
      userId: ctx.userId,
    });
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId! },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(3000));
    expect(afterUser.akvBalance).toEqual(new Prisma.Decimal(5));
    expect(afterUser.tickets).toEqual(100);
  });
  test("before quest chain uncompleted/no record", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.startQuestChain(ctx, "TEST_2", "TERAS"),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("before quest chain uncompleted/has record", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        acceptedAt: new Date(),
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_1_1",
            startAt: new Date(),
          },
        },
      },
    });
    await expect(
      useCase.startQuestChain(ctx, "TEST_2", "TERAS"),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("quest chain not start date", async () => {
    const ctx = await createMockContext({ terasBalance: 3000 });
    await expect(
      useCase.startQuestChain(ctx, "TEST_EVENT_2", "TERAS"),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("quest chain expired", async () => {
    const ctx = await createMockContext({ terasBalance: 3000 });
    await expect(
      useCase.startQuestChain(ctx, "TEST_EVENT_3", "TERAS"),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("parallel quests", async () => {
    const ctx = await createMockContext();
    const ret = await useCase.startQuestChain(ctx, "TEST_EVENT_4", "TERAS");
    expect(ret).toMatchObject({
      completed: false,
      expiredAt: null,
      questChainMasterId: "TEST_EVENT_4",
      userId: ctx.userId,
    });
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChain: {
          userId: ctx.userId,
          questChainMasterId: "TEST_EVENT_4",
        },
      },
    });
    expect(afterQuests).toHaveLength(2);
  });
});

describe("progress", () => {
  beforeEach(async () => {
    await eraseDatabase();
    await createTestQuestChainData();
  });
  describe("success", () => {
    test("completed", async () => {
      const ctx = await createMockContext();
      const before = await ctx.prisma.questChain.create({
        data: {
          userId: ctx.userId!,
          questChainMasterId: "TEST_1",
          acceptedAt: new Date(),
          completed: false,
          quests: {
            create: {
              questMasterId: "TEST_1_1",
              startAt: new Date(),
              completedAt: new Date(),
            },
          },
        },
        include: {
          quests: true,
        },
      });
      const quest = before.quests[0];
      const ret = await useCase.progress(
        ctx,
        quest.questMasterId,
        quest.completedAt,
        quest.startAt,
      );
      expect(ret).toEqual(1);
    });
    test("inProgress", async () => {
      const ctx = await createMockContext();
      const before = await ctx.prisma.questChain.create({
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
        include: {
          quests: true,
        },
      });
      const quest = before.quests[1];
      const ret = await useCase.progress(
        ctx,
        quest.questMasterId,
        quest.completedAt,
        quest.startAt,
      );
      expect(ret).toEqual(0);
    });
  });
});
