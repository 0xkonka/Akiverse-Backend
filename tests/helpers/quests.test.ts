import { createArcadeMachine, eraseDatabase } from "../test_helper";
import { createMockContext } from "../mock/context";
import { QuestProgressChecker } from "../../src/helpers/quests";
import { Context } from "../../src/context";
import dayjs from "dayjs";
import prisma from "../../src/prisma";
import {
  PlayResult,
  QuestRewardCategory,
  QuestRewardType,
} from "@prisma/client";

const oneMonthBefore = dayjs().add(-1, "month").toDate();
const yesterday = dayjs().add(-1, "day").toDate();
const today = new Date();
const oneMonthAfter = dayjs().add(1, "month").toDate();

const checker = new QuestProgressChecker();

async function createTestQuestMasterData(): Promise<void> {
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_1",
      title: "TEST_1",
      specifiedTitleImage: false,
      terasRequiredForRelease: 1000,
      chainCategory: "ONWARD",
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_1_1",
              title: "TEST_1_1",
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
              title: "TEST_1_2",
              seq: 2,
              progressGoal: 10,
              progressType: "SPARK_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 1000,
              beforeQuestIds: "TEST_1_1",
            },
          ],
        },
      },
      rewards: {
        create: {
          itemType: "TERAS",
          amount: 2000,
          category: "TERAS",
          subCategory: "",
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_2",
      title: "TEST_2",
      specifiedTitleImage: false,
      terasRequiredForRelease: 1000,
      chainCategory: "ONWARD",
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_2_1",
              title: "TEST_2_1",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 1000,
            },
          ],
        },
      },
      rewards: {
        create: {
          itemType: "TERAS",
          category: "TERAS",
          subCategory: "",
          amount: 2000,
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_3",
      title: "TEST_3",
      specifiedTitleImage: false,
      terasRequiredForRelease: 1000,
      chainCategory: "ONWARD",
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_3_1",
              title: "TEST_3_1",
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              seq: 1,
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 301,
            },
            {
              id: "TEST_3_2",
              title: "TEST_3_2",
              progressGoal: 1,
              progressType: "CONNECT_WALLET",
              seq: 2,
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 302,
              beforeQuestIds: "TEST_3_1",
            },
            {
              id: "TEST_3_3",
              title: "TEST_3_3",
              progressGoal: 1,
              seq: 3,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 303,
              beforeQuestIds: "TEST_3_2",
            },
          ],
        },
      },
      rewards: {
        create: {
          itemType: "TERAS",
          category: "TERAS",
          subCategory: "",
          amount: 3000,
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_1",
      title: "TEST_EVENT_1",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      startAt: today,
      endAt: oneMonthAfter,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_1_1",
              title: "TEST_EVENT_1_1",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 101,
            },
            {
              id: "TEST_EVENT_1_2",
              title: "TEST_EVENT_1_2",
              seq: 2,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 102,
              beforeQuestIds: "TEST_EVENT_1_1",
            },
          ],
        },
      },
      rewards: {
        create: {
          itemType: "TERAS",
          category: "TERAS",
          subCategory: "",
          amount: 1000,
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_2",
      title: "TEST_EVENT_2",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      startAt: yesterday,
      endAt: yesterday,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_2_1",
              title: "TEST_EVENT_2_1",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 201,
            },
            {
              id: "TEST_EVENT_2_2",
              title: "TEST_EVENT_2_2",
              seq: 2,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 202,
              beforeQuestIds: "TEST_EVENT_2_1",
            },
          ],
        },
      },
      rewards: {
        create: {
          itemType: "TERAS",
          category: "TERAS",
          subCategory: "",
          amount: 1000,
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_3",
      title: "TEST_EVENT_3",
      specifiedTitleImage: false,
      chainCategory: "EVENT",
      startAt: oneMonthBefore,
      endAt: oneMonthBefore,
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_3_1",
              title: "TEST_EVENT_3_1",
              seq: 1,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 301,
            },
            {
              id: "TEST_EVENT_3_2",
              title: "TEST_EVENT_3_2",
              seq: 2,
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 302,
              beforeQuestIds: "TEST_EVENT_3_1",
            },
          ],
        },
      },
      rewards: {
        create: {
          itemType: "TERAS",
          category: "TERAS",
          subCategory: "",
          amount: 1000,
        },
      },
    },
  });
  await prisma.questChainMaster.create({
    data: {
      id: "TEST_EVENT_4",
      title: "TEST_EVENT_4",
      chainCategory: "EVENT",
      quests: {
        createMany: {
          data: [
            {
              id: "TEST_EVENT_4_1_1",
              title: "TEST_EVENT_4_1_1",
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              seq: 1,
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 411,
            },
            {
              id: "TEST_EVENT_4_1_2",
              title: "TEST_EVENT_4_1_2",
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              seq: 2,
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 412,
            },
            {
              id: "TEST_EVENT_4_1_3",
              title: "TEST_EVENT_4_1_3",
              progressGoal: 1,
              progressType: "SPARK_COUNT",
              seq: 3,
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 413,
            },
            {
              id: "TEST_EVENT_4_2",
              title: "TEST_EVENT_4_2",
              progressGoal: 1,
              progressType: "PLAY_COUNT",
              seq: 4,
              beforeQuestIds:
                "TEST_EVENT_4_1_1,TEST_EVENT_4_1_2,TEST_EVENT_4_1_3",
              itemType: "TERAS",
              category: "TERAS",
              subCategory: "",
              amount: 420,
            },
          ],
        },
      },
      specifiedTitleImage: false,
    },
  });
}

describe("quest progress checker", () => {
  async function createPlayRecord(
    ctx: Context,
    date: Date,
    result: PlayResult = "WIN",
  ): Promise<void> {
    const am = await createArcadeMachine({
      userId: ctx.userId,
    });
    const createdAt = dayjs(date).add(1, "second").toDate();
    await ctx.prisma.playSession.create({
      data: {
        playerId: ctx.userId!,
        authToken: "dummy",
        createdAt: createdAt,
        state: "FINISHED",
        targetScore: 1,
        difficulty: 1,
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
        fever: false,
        maxPlayCount: 1,
        endedAt: new Date(),
        plays: {
          create: {
            result: result,
            endedAt: new Date(),
          },
        },
      },
    });
  }
  beforeEach(async () => {
    await eraseDatabase();
    await createTestQuestMasterData();
  });
  test("no accepted quest", async () => {
    const ctx = await createMockContext();
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();
  });
  test("quest complete/has next quest", async () => {
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_1_1",
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt);

    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();

    // 配布チェック
    expect(
      await ctx.prisma.reward.findMany({
        where: {
          userId: ctx.userId!,
        },
      }),
    ).toMatchObject([
      {
        title: "TEST_1_1",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 1000,
      },
    ]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        completedAt: "asc",
      },
    });
    expect(afterQuests).toHaveLength(2);
    const firstQuest = afterQuests[0];
    expect(firstQuest.questMasterId).toEqual("TEST_1_1");
    expect(firstQuest.completedAt).not.toBeNull();

    const secondQuest = afterQuests[1];
    expect(secondQuest.questMasterId).toEqual("TEST_1_2");
    expect(secondQuest.completedAt).toBeNull();
  });
  test("quest not complete", async () => {
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_1",
        completed: false,
        quests: {
          createMany: {
            data: [
              {
                questMasterId: "TEST_1_1",
                completedAt: new Date(),
              },
              {
                questMasterId: "TEST_1_2",
              },
            ],
          },
        },
      },
    });
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();

    // 未配布チェック
    expect(
      await ctx.prisma.reward.findMany({
        where: {
          userId: ctx.userId!,
        },
      }),
    ).toMatchObject([]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        completedAt: "asc",
      },
    });
    expect(afterQuests).toHaveLength(2);
    const firstQuest = afterQuests[0];
    expect(firstQuest.questMasterId).toEqual("TEST_1_1");
    expect(firstQuest.completedAt).not.toBeNull();

    const secondQuest = afterQuests[1];
    expect(secondQuest.questMasterId).toEqual("TEST_1_2");
    expect(secondQuest.completedAt).toBeNull();
  });
  test("quest complete/hasn't next quest", async () => {
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_2",
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_2_1",
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt);
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();

    // 配布チェック
    expect(
      await ctx.prisma.reward.findMany({
        where: {
          userId: ctx.userId!,
        },
      }),
    ).toMatchObject([
      {
        title: "TEST_2_1",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 1000,
      },
    ]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        completedAt: "asc",
      },
    });
    expect(afterQuests).toHaveLength(1);
    const firstQuest = afterQuests[0];
    expect(firstQuest.questMasterId).toEqual("TEST_2_1");
    expect(firstQuest.completedAt).not.toBeNull();
  });
  test("force re check", async () => {
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_3",
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_3_1",
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt);
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();

    // 配布チェック
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId!,
      },
      orderBy: {
        title: "asc",
      },
    });
    expect(rewards).toMatchObject([
      {
        title: "TEST_3_1",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 301,
      },
      {
        title: "TEST_3_2",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 302,
      },
    ]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        questMasterId: "asc",
      },
    });
    expect(afterQuests).toHaveLength(3);
    const firstQuest = afterQuests[0];
    expect(firstQuest.questMasterId).toEqual("TEST_3_1");
    expect(firstQuest.completedAt).not.toBeNull();
    const secondQuest = afterQuests[1];
    expect(secondQuest.questMasterId).toEqual("TEST_3_2");
    expect(secondQuest.completedAt).not.toBeNull();
    const thirdQuest = afterQuests[2];
    expect(thirdQuest.questMasterId).toEqual("TEST_3_3");
    expect(thirdQuest.completedAt).toBeNull();
  });
  test("Event schedule within the period", async () => {
    // スケジュール内なので
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_1",
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_EVENT_1_1",
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt);
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();
    // 配布チェック
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId!,
      },
      orderBy: {
        title: "asc",
      },
    });
    expect(rewards).toMatchObject([
      {
        title: "TEST_EVENT_1_1",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 101,
      },
    ]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        questMasterId: "asc",
      },
    });
    expect(afterQuests).toHaveLength(2);
    const firstQuest = afterQuests[0];
    expect(firstQuest.questMasterId).toEqual("TEST_EVENT_1_1");
    expect(firstQuest.completedAt).not.toBeNull();
    const secondQuest = afterQuests[1];
    expect(secondQuest.questMasterId).toEqual("TEST_EVENT_1_2");
    expect(secondQuest.completedAt).toBeNull();
  });
  test("Event schedule outside the period", async () => {
    // スケジュール外なので達成
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_2",
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_EVENT_2_1",
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt);
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();
    // 配布チェック
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId!,
      },
      orderBy: {
        title: "asc",
      },
    });
    expect(rewards).toMatchObject([]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        questMasterId: "asc",
      },
    });
    expect(afterQuests).toHaveLength(1);
    const firstQuest = afterQuests[0];
    expect(firstQuest.questMasterId).toEqual("TEST_EVENT_2_1");
    expect(firstQuest.completedAt).toBeNull();
  });
  test("One month has passed since the end of the event schedule", async () => {
    // スケジュール期間終了後１ヶ月経過しているのでレコードが消されている
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_3",
        completed: false,
        quests: {
          create: {
            questMasterId: "TEST_EVENT_3_1",
          },
        },
      },
    });
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();
    // 配布チェック
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId!,
      },
      orderBy: {
        title: "asc",
      },
    });
    expect(rewards).toMatchObject([]);

    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        questMasterId: "asc",
      },
    });
    expect(afterQuests).toHaveLength(0);
  });
  test("parallel 同時達成", async () => {
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_4",
        completed: false,
        quests: {
          createMany: {
            data: [
              {
                questMasterId: "TEST_EVENT_4_1_1",
              },
              {
                questMasterId: "TEST_EVENT_4_1_2",
              },
              {
                questMasterId: "TEST_EVENT_4_1_3",
              },
            ],
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt);
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();
    // 配布チェック
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId!,
      },
      orderBy: {
        title: "asc",
      },
    });
    expect(rewards).toMatchObject([
      {
        title: "TEST_EVENT_4_1_1",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 411,
      },
      {
        title: "TEST_EVENT_4_1_2",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 412,
      },
      {
        title: "TEST_EVENT_4_1_3",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 413,
      },
    ]);
    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        questMasterId: "asc",
      },
    });
    expect(afterQuests).toHaveLength(4);
    // 3行はCompleted
    // 最後の1行はNot complete
    for (let i = 0; i < afterQuests.length; i++) {
      if (i === 3) {
        expect(afterQuests[i].completedAt).toBeNull();
      } else {
        expect(afterQuests[i].completedAt).not.toBeNull();
      }
    }
  });
  test("parallel 一部達成", async () => {
    const ctx = await createMockContext();
    const questChain = await ctx.prisma.questChain.create({
      data: {
        userId: ctx.userId!,
        questChainMasterId: "TEST_EVENT_4",
        completed: false,
        quests: {
          createMany: {
            data: [
              {
                questMasterId: "TEST_EVENT_4_1_1",
              },
              {
                questMasterId: "TEST_EVENT_4_1_2",
              },
              {
                questMasterId: "TEST_EVENT_4_1_3",
              },
            ],
          },
        },
      },
    });
    await createPlayRecord(ctx, questChain.createdAt, "LOSS");
    await expect(checker.checkAndUpdate(ctx)).resolves.toBeUndefined();
    // 配布チェック
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        userId: ctx.userId!,
      },
      orderBy: {
        title: "asc",
      },
    });
    expect(rewards).toMatchObject([
      {
        title: "TEST_EVENT_4_1_1",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 411,
      },
      {
        title: "TEST_EVENT_4_1_2",
        rewardItemType: "TERAS",
        category: "TERAS",
        subCategory: null,
        amount: 412,
      },
    ]);
    // questのレコード状態チェック
    const afterQuests = await ctx.prisma.quest.findMany({
      where: {
        questChainId: questChain.id,
      },
      orderBy: {
        questMasterId: "asc",
      },
    });
    expect(afterQuests).toHaveLength(3);
    // 3行はCompleted
    // 最後の1行はNot complete
    for (let i = 0; i < afterQuests.length; i++) {
      if (i === 2) {
        expect(afterQuests[i].completedAt).toBeNull();
      } else {
        expect(afterQuests[i].completedAt).not.toBeNull();
      }
    }
  });
});

describe("distributeReward", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  class TestExtendsQuestProgressChecker extends QuestProgressChecker {
    override distributeReward(
      ctx: Context,
      title: string,
      itemType: QuestRewardType,
      category: QuestRewardCategory,
      subCategory: string | null,
      amount: number,
    ) {
      return super.distributeReward(
        ctx,
        title,
        itemType,
        category,
        subCategory,
        amount,
      );
    }
  }

  const testChecker = new TestExtendsQuestProgressChecker();
  test("arcade part", async () => {
    const ctx = await createMockContext();
    const query = testChecker.distributeReward(
      ctx,
      "arcade part",
      "ARCADE_PART",
      "ROM",
      "BUBBLE_ATTACK",
      2,
    );
    await ctx.prisma.$transaction(query);

    // check
    const rewards = await ctx.prisma.reward.findMany({});
    expect(rewards).toHaveLength(1);
    const reward = rewards[0];
    expect(reward).toMatchObject({
      title: "arcade part",
      rewardItemType: "ARCADE_PART",
      category: "ROM",
      subCategory: "BUBBLE_ATTACK",
      amount: 2,
    });
  });
  test("arcade part random", async () => {
    const ctx = await createMockContext();
    const query = testChecker.distributeReward(
      ctx,
      "arcade part random",
      "ARCADE_PART_RANDOM",
      "RANDOM",
      "",
      10,
    );
    await ctx.prisma.$transaction(query);

    // check
    let partCount = 0;
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        rewardItemType: "ARCADE_PART",
      },
    });
    partCount = rewards.map((v) => v.amount).reduce((x, y) => x + y, 0);
    expect(partCount).toEqual(10);
    rewards.forEach((value) => {
      expect(value.title).toEqual("arcade part random");
      expect(value.subCategory).not.toBeNull();
    });
  });
  test("junk part", async () => {
    const ctx = await createMockContext();
    const query = testChecker.distributeReward(
      ctx,
      "junk part",
      "JUNK_PART",
      "ACCUMULATOR",
      "HOKUTO_100_LX",
      30,
    );
    await ctx.prisma.$transaction(query);

    // check
    const rewards = await ctx.prisma.reward.findMany({});
    expect(rewards).toHaveLength(1);
    const reward = rewards[0];
    expect(reward).toMatchObject({
      title: "junk part",
      rewardItemType: "JUNK_PART",
      category: "ACCUMULATOR",
      subCategory: "HOKUTO_100_LX",
      amount: 30,
    });
  });
  test("junk part random", async () => {
    const ctx = await createMockContext();
    const query = testChecker.distributeReward(
      ctx,
      "junk part random",
      "JUNK_PART_RANDOM",
      "RANDOM",
      null,
      30,
    );
    await ctx.prisma.$transaction(query);

    // check
    let partCount = 0;
    const rewards = await ctx.prisma.reward.findMany({
      where: {
        rewardItemType: "JUNK_PART",
      },
    });
    partCount = rewards.map((v) => v.amount).reduce((x, y) => x + y, 0);
    expect(partCount).toEqual(30);
    rewards.forEach((value) => {
      expect(value.title).toEqual("junk part random");
      expect(value.subCategory).not.toBeNull();
    });
  });
  test("icon", async () => {
    const ctx = await createMockContext();
    const query = testChecker.distributeReward(
      ctx,
      "icon",
      "COLLECTIBLE_ITEM",
      "ICON",
      "ICON_1",
      1,
    );
    await ctx.prisma.$transaction(query);

    // check
    const rewards = await ctx.prisma.reward.findMany({});
    expect(rewards).toHaveLength(1);
    const reward = rewards[0];
    expect(reward).toMatchObject({
      title: "icon",
      rewardItemType: "COLLECTIBLE_ITEM",
      category: "ICON",
      subCategory: "ICON_1",
      amount: 1,
    });
  });
  test("title", async () => {
    const ctx = await createMockContext();
    const query = testChecker.distributeReward(
      ctx,
      "title",
      "COLLECTIBLE_ITEM",
      "TITLE",
      "TITLE_1",
      1,
    );
    await ctx.prisma.$transaction(query);

    // check
    const rewards = await ctx.prisma.reward.findMany({});
    expect(rewards).toHaveLength(1);
    const reward = rewards[0];
    expect(reward).toMatchObject({
      title: "title",
      rewardItemType: "COLLECTIBLE_ITEM",
      category: "TITLE",
      subCategory: "TITLE_1",
      amount: 1,
    });
  });
});
