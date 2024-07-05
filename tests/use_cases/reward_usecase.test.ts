import { eraseDatabase } from "../test_helper";
import { createMockContext } from "../mock/context";
import dayjs from "dayjs";
import { TERM_TIME_ZONE } from "../../src/constants";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { RewardUseCaseImpl } from "../../src/use_cases/reward_usecase";
import { IllegalStateUseCaseError } from "../../src/use_cases/errors";
import { Prisma } from "@prisma/client";

dayjs.extend(timezone);
dayjs.extend(utc);

const useCase = new RewardUseCaseImpl();
describe("receive", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const expiredDate = dayjs().tz(TERM_TIME_ZONE).add(-1, "day").toDate();
    const afterDate = dayjs().tz(TERM_TIME_ZONE).add(1, "day").toDate();
    const ctx = await createMockContext();
    await ctx.prisma.junk.createMany({
      data: [
        {
          userId: ctx.userId!,
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          amount: 10,
        },
        {
          userId: ctx.userId!,
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: 10,
        },
        {
          userId: ctx.userId!,
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          amount: 10,
        },
        {
          userId: ctx.userId!,
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          amount: 10,
        },
      ],
    });
    await ctx.prisma.reward.createMany({
      data: [
        // Arcade Parts
        {
          userId: ctx.userId!,
          title: "expired arcade part",
          rewardItemType: "ARCADE_PART",
          availableUntil: expiredDate,
          acceptedAt: null,
          amount: 1,
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
        {
          userId: ctx.userId!,
          title: "received arcade part",
          rewardItemType: "ARCADE_PART",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          amount: 2,
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
        },
        {
          userId: ctx.userId!,
          title: "target arcade part",
          rewardItemType: "ARCADE_PART",
          availableUntil: afterDate,
          acceptedAt: null,
          amount: 3,
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
        },
        {
          userId: ctx.userId!,
          title: "target arcade part(due date null)",
          rewardItemType: "ARCADE_PART",
          availableUntil: null,
          acceptedAt: null,
          amount: 4,
          category: "ROM",
          subCategory: "STAR_GUARDIAN",
        },
        // Junk Parts
        {
          userId: ctx.userId!,
          title: "expired junk part",
          rewardItemType: "JUNK_PART",
          availableUntil: expiredDate,
          acceptedAt: null,
          amount: 2,
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
        },
        {
          userId: ctx.userId!,
          title: "received junk part",
          rewardItemType: "JUNK_PART",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          amount: 3,
          category: "ROM",
          subCategory: "YUMMY_JUMP",
        },
        {
          userId: ctx.userId!,
          title: "target junk part/update",
          rewardItemType: "JUNK_PART",
          availableUntil: afterDate,
          acceptedAt: null,
          amount: 4,
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
        },
        {
          userId: ctx.userId!,
          title: "target junk part/insert",
          rewardItemType: "JUNK_PART",
          availableUntil: afterDate,
          acceptedAt: null,
          amount: 5,
          category: "ROM",
          subCategory: "STAR_GUARDIAN",
        },
        // Teras
        {
          userId: ctx.userId!,
          title: "expired teras",
          rewardItemType: "TERAS",
          availableUntil: expiredDate,
          acceptedAt: null,
          category: "TERAS",
          amount: 1_000,
        },
        {
          userId: ctx.userId!,
          title: "received teras",
          rewardItemType: "TERAS",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          category: "TERAS",
          amount: 2_000,
        },
        {
          userId: ctx.userId!,
          title: "target teras",
          rewardItemType: "TERAS",
          availableUntil: afterDate,
          acceptedAt: null,
          category: "TERAS",
          amount: 3_000,
        },
        // COLLECTABLE_ITEM
        {
          userId: ctx.userId!,
          title: "expired icon",
          rewardItemType: "COLLECTIBLE_ITEM",
          availableUntil: expiredDate,
          acceptedAt: null,
          category: "TERAS",
          amount: 1,
        },
        {
          userId: ctx.userId!,
          title: "received icon",
          rewardItemType: "COLLECTIBLE_ITEM",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          category: "ICON",
          subCategory: "YUMMY_JUMP",
          amount: 1,
        },
        {
          userId: ctx.userId!,
          title: "target icon",
          rewardItemType: "COLLECTIBLE_ITEM",
          availableUntil: afterDate,
          acceptedAt: null,
          category: "ICON",
          subCategory: "YUMMY_JUMP",
          amount: 1,
        },
      ],
    });

    const ret = await useCase.acceptAll(ctx);
    expect(ret).toHaveLength(6);
    expect(ret).toMatchObject([
      {
        itemType: "ARCADE_PART",
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 3,
      },
      {
        itemType: "ARCADE_PART",
        category: "ROM",
        subCategory: "STAR_GUARDIAN",
        amount: 4,
      },
      {
        itemType: "JUNK_PART",
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        amount: 4,
      },
      {
        itemType: "JUNK_PART",
        category: "ROM",
        subCategory: "STAR_GUARDIAN",
        amount: 5,
      },
      {
        itemType: "TERAS",
        amount: 3000,
      },
      {
        itemType: "COLLECTIBLE_ITEM",
        category: "ICON",
        subCategory: "YUMMY_JUMP",
        amount: 1,
      },
    ]);
    const arcadeParts = await ctx.prisma.arcadePart.findMany({
      where: {
        userId: ctx.userId,
      },
    });
    expect(arcadeParts).toHaveLength(7);

    const junks = await ctx.prisma.junk.findMany({
      where: {
        userId: ctx.userId,
      },
    });
    expect(junks).toHaveLength(5);
    for (const junk of junks) {
      if (junk.category === "UPPER_CABINET" && junk.subCategory === "PLAIN") {
        expect(junk.amount).toEqual(14);
      } else if (
        junk.category === "ROM" &&
        junk.subCategory === "STAR_GUARDIAN"
      ) {
        expect(junk.amount).toEqual(5);
      } else {
        expect(junk.amount).toEqual(10);
      }
    }

    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(3000));

    const icons = await ctx.prisma.collectibleItem.findMany({
      where: {
        userId: ctx.userId,
        category: "ICON",
      },
    });

    expect(icons).toHaveLength(1);
  });
  test("no reward target", async () => {
    const expiredDate = dayjs().tz(TERM_TIME_ZONE).add(-1, "day").toDate();
    const ctx = await createMockContext();

    await ctx.prisma.reward.createMany({
      data: [
        // Arcade Parts
        {
          userId: ctx.userId!,
          title: "expired arcade part",
          rewardItemType: "ARCADE_PART",
          availableUntil: expiredDate,
          acceptedAt: null,
          amount: 1,
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
        {
          userId: ctx.userId!,
          title: "received arcade part",
          rewardItemType: "ARCADE_PART",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          amount: 2,
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
        },
        // Junk Parts
        {
          userId: ctx.userId!,
          title: "expired junk part",
          rewardItemType: "JUNK_PART",
          availableUntil: expiredDate,
          acceptedAt: null,
          amount: 2,
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
        },
        {
          userId: ctx.userId!,
          title: "received junk part",
          rewardItemType: "JUNK_PART",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          amount: 3,
          category: "ROM",
          subCategory: "YUMMY_JUMP",
        },
        // Teras
        {
          userId: ctx.userId!,
          title: "expired teras",
          rewardItemType: "TERAS",
          availableUntil: expiredDate,
          acceptedAt: null,
          category: "TERAS",
          amount: 1_000,
        },
        {
          userId: ctx.userId!,
          title: "received teras",
          rewardItemType: "TERAS",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          category: "TERAS",
          amount: 2_000,
        },
        // COLLECTABLE_ITEM
        {
          userId: ctx.userId!,
          title: "expired icon",
          rewardItemType: "COLLECTIBLE_ITEM",
          availableUntil: expiredDate,
          acceptedAt: null,
          category: "TERAS",
          amount: 1,
        },
        {
          userId: ctx.userId!,
          title: "received icon",
          rewardItemType: "COLLECTIBLE_ITEM",
          availableUntil: expiredDate,
          acceptedAt: expiredDate,
          category: "ICON",
          subCategory: "YUMMY_JUMP",
          amount: 1,
        },
      ],
    });
    await expect(useCase.acceptAll(ctx)).rejects.toThrow(
      IllegalStateUseCaseError,
    );
  });
  test("already has icon", async () => {
    const afterDate = dayjs().tz(TERM_TIME_ZONE).add(1, "day").toDate();
    const ctx = await createMockContext();
    const before = await ctx.prisma.collectibleItem.create({
      data: {
        userId: ctx.userId!,
        category: "ICON",
        subCategory: "YUMMY_JUMP",
      },
    });

    await ctx.prisma.reward.createMany({
      data: [
        // COLLECTABLE_ITEM
        {
          userId: ctx.userId!,
          title: "target icon",
          rewardItemType: "COLLECTIBLE_ITEM",
          availableUntil: afterDate,
          acceptedAt: null,
          category: "ICON",
          subCategory: "YUMMY_JUMP",
          amount: 1,
        },
      ],
    });
    const ret = await useCase.acceptAll(ctx);
    expect(ret).toHaveLength(1);
    expect(ret).toMatchObject([
      {
        itemType: "COLLECTIBLE_ITEM",
        category: "ICON",
        subCategory: "YUMMY_JUMP",
        amount: 1,
      },
    ]);
    const after = await ctx.prisma.collectibleItem.findUnique({
      where: {
        userId_category_subCategory: {
          userId: ctx.userId!,
          category: "ICON",
          subCategory: "YUMMY_JUMP",
        },
      },
    });
    expect(after).toMatchObject(before);
  });
});
