import { createArcadeMachine, createUser, eraseDatabase } from "../test_helper";
import { ExtractUseCaseImpl } from "../../src/use_cases/extract_usecase";
import { createMockContext, createMockContextNonAuth } from "../mock/context";
import {
  ConflictUseCaseError,
  ExtractItemInsufficientUseCaseError,
  IllegalStateUseCaseError,
  InternalServerUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
  StateChangeUseCaseError,
} from "../../src/use_cases/errors";
import { ArcadePart, ExtractableItemType, Junk, Prisma } from "@prisma/client";
import prisma from "../../src/prisma";
import { getExtractPriority } from "../../src/models/extract_table";
import { EXTRACT_FEES } from "../../src/constants";
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { getRandomInt } from "../../src/utils";

const useCase = new ExtractUseCaseImpl();
describe("minNumberOfExtractItems", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.season.create({
      data: {
        startAt: new Date(),
        baseExtractItemCount: 8,
      },
    });
    const ret = await useCase.minNumberOfExtractItems(
      ctx,
      "HOKUTO_100_LX",
      20000,
      0,
    );
    expect(ret).toMatchObject({
      count: 1,
      extractCode: 2,
    });
  });
  test("success/season endAt", async () => {
    const ctx = await createMockContext();
    const nowPlus1Week = new Date();
    nowPlus1Week.setDate(nowPlus1Week.getDate() + 7);
    await ctx.prisma.season.create({
      data: {
        startAt: new Date(),
        endAt: nowPlus1Week,
        baseExtractItemCount: 8,
      },
    });
    const ret = await useCase.minNumberOfExtractItems(
      ctx,
      "HOKUTO_100_LX",
      20000,
      0,
    );
    expect(ret).toMatchObject({
      count: 1,
      extractCode: 2,
    });
  });
  test("season not found", async () => {
    const ctx = await createMockContext();
    const date = new Date();
    date.setHours(date.getHours() - 24);
    await ctx.prisma.season.create({
      data: {
        startAt: date,
        endAt: date,
        baseExtractItemCount: 8,
      },
    });
    await expect(
      useCase.minNumberOfExtractItems(ctx, "HOKUTO_100_LX", 20000, 0),
    ).rejects.toThrowError(InternalServerUseCaseError);
  });
  test("unknown acc", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.season.create({
      data: {
        startAt: new Date(),
        baseExtractItemCount: 8,
      },
    });
    await expect(
      useCase.minNumberOfExtractItems(ctx, "xHOKUTO_100_LX", 20000, 0),
    ).rejects.toThrowError(InternalServerUseCaseError);
  });
  test("energy insufficient", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.season.create({
      data: {
        startAt: new Date(),
        baseExtractItemCount: 8,
      },
    });
    const ret = await useCase.minNumberOfExtractItems(
      ctx,
      "HOKUTO_100_LX",
      19999,
      0,
    );
    expect(ret).toMatchObject({
      count: 0,
    });
  });
});

describe("get default extract code", () => {
  const anyUseCase = useCase as any; // privateメソッドにアクセスするため
  test("unknown acc", () => {
    expect(() => {
      return anyUseCase.getDefaultExtractCode("acc", 0, 0);
    }).toThrowError(InternalServerUseCaseError);
  });
  test("energy insufficient/ extractableEnergy > energy", () => {
    expect(() => {
      return anyUseCase.getDefaultExtractCode("HOKUTO_100_LX", 19999, 0);
    }).toThrowError(IllegalStateUseCaseError);
  });
  test("energy insufficient/ extractableEnergy > (energy - extractedEnergy)", () => {
    expect(() => {
      return anyUseCase.getDefaultExtractCode("HOKUTO_100_LX", 40000, 20001);
    }).toThrowError(IllegalStateUseCaseError);
  });
  test("success", () => {
    const ret = anyUseCase.getDefaultExtractCode("HOKUTO_100_LX", 40000, 0);
    // Energy:40000 ExtractableEnergy:20000 => 20000ごとに消費=> 40000使う
    // 40000/10000 = 4
    expect(ret).toEqual(4);
  });
});

describe("list box items", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = createMockContextNonAuth();
    const season = await ctx.prisma.season.create({
      data: {
        startAt: new Date(),
        baseExtractItemCount: 8,
      },
    });
    await ctx.prisma.extractInitialInventory.createMany({
      data: [
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          itemType: ExtractableItemType.ARCADE_PART,
          seasonId: season.id,
          initialAmount: 1,
          featuredItem: false,
        },
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          itemType: ExtractableItemType.JUNK_PART,
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          itemType: ExtractableItemType.ARCADE_PART,
          seasonId: season.id,
          initialAmount: 3,
          featuredItem: false,
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          itemType: ExtractableItemType.JUNK_PART,
          seasonId: season.id,
          initialAmount: 4,
          featuredItem: false,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          itemType: ExtractableItemType.ARCADE_PART,
          seasonId: season.id,
          initialAmount: 5,
          featuredItem: true,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          itemType: ExtractableItemType.JUNK_PART,
          seasonId: season.id,
          initialAmount: 6,
          featuredItem: false,
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          itemType: ExtractableItemType.ARCADE_PART,
          seasonId: season.id,
          initialAmount: 7,
          featuredItem: true,
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          itemType: ExtractableItemType.JUNK_PART,
          seasonId: season.id,
          initialAmount: 8,
          featuredItem: false,
        },
      ],
    });

    const dummyUser = await createUser();
    // AP
    await ctx.prisma.arcadePart.createMany({
      data: [
        {
          // ROMは配布済みなのでUserId未設定のレコードがない
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        // ACCは1つ配布済み ２つ在庫
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          state: "IN_AKIVERSE",
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          state: "IN_AKIVERSE",
        },
        // UCは5つ全部配布済み
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
          userId: dummyUser.id,
        },
        // LCは7個すべて未配布
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          state: "IN_AKIVERSE",
        },
      ],
    });

    // Junk
    await ctx.prisma.extractJunkInventory.createMany({
      data: [
        {
          // ROMは在庫なし
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          amount: 0,
        },
        {
          // ACCは２個在庫
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: 2,
        },
        {
          // UCはすべて排出済み
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          amount: 0,
        },
        {
          // LCはすべて在庫
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          amount: 8,
        },
      ],
    });
    const ret = await useCase.listBoxItems(ctx);
    expect(ret).toMatchObject([
      {
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        initialAmount: 1,
        amount: 0,
        isJunk: false,
        isFeaturedItem: false,
      },
      {
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        initialAmount: 3,
        amount: 2,
        isJunk: false,
        isFeaturedItem: false,
      },
      {
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        amount: 0,
        initialAmount: 5,
        isJunk: false,
        isFeaturedItem: true,
      },
      {
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        amount: 7,
        initialAmount: 7,
        isJunk: false,
        isFeaturedItem: true,
      },
      {
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        initialAmount: 2,
        amount: 0,
        isJunk: true,
        isFeaturedItem: false,
      },
      {
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        initialAmount: 4,
        amount: 2,
        isJunk: true,
        isFeaturedItem: false,
      },
      {
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        amount: 0,
        initialAmount: 6,
        isJunk: true,
        isFeaturedItem: false,
      },
      {
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        amount: 8,
        initialAmount: 8,
        isJunk: true,
        isFeaturedItem: false,
      },
    ]);
  });
});

describe("extract", () => {
  async function createInventory(): Promise<string> {
    // AP 各2個
    await prisma.arcadePart.createMany({
      data: [
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
        },
      ],
    });

    // Junk 各2ずつ
    await prisma.extractJunkInventory.createMany({
      data: [
        {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          amount: 2,
        },
        {
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: 2,
        },
        {
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          amount: 2,
        },
        {
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          amount: 2,
        },
      ],
    });

    // Season
    const season = await prisma.season.create({
      data: {
        startAt: new Date(),
        baseExtractItemCount: 8,
      },
    });

    // InitialInventory
    await prisma.extractInitialInventory.createMany({
      data: [
        {
          itemType: "ARCADE_PART",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "ARCADE_PART",
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "ARCADE_PART",
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "ARCADE_PART",
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "JUNK_PART",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "JUNK_PART",
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "JUNK_PART",
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
        {
          itemType: "JUNK_PART",
          category: "LOWER_CABINET",
          subCategory: "PLAIN",
          seasonId: season.id,
          initialAmount: 2,
          featuredItem: false,
        },
      ],
    });
    return season.id;
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("success", () => {
    test("success/Teras", async () => {
      const ctx = await createMockContext({
        terasBalance: EXTRACT_FEES.TERAS,
        akvBalance: EXTRACT_FEES.AKV,
      });
      const seasonId = await createInventory();
      const am = await createArcadeMachine({
        energy: 200000,
        maxEnergy: 200000,
        userId: ctx.userId,
      });
      const ret = await useCase.extract(ctx, am.id, 20, "TERAS");
      expect(ret).toHaveLength(12);

      const getPriority = (item: ArcadePart | Junk): number => {
        const isJunk = !("ownerWalletAddress" in item);
        return getExtractPriority(isJunk, item.category, item.subCategory);
      };
      // Priorityが小さい順で返ってきていることを確認するためにソートしなおす
      const sorted = ret.sort((a, b) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority === bPriority) return 0;
        if (aPriority > bPriority) {
          return 1;
        }
        return -1;
      });
      expect(ret).toEqual(sorted);

      // 排出数を種別ごとにまとめる
      const extractedJunksMap = new Map<string, number>();
      const extractedArcadePartsMap = new Map<string, number>();
      for (const elm of ret) {
        const key = `${elm.category}-${elm.subCategory}`;
        if ("ownerWalletAddress" in elm) {
          const count = extractedArcadePartsMap.get(key);
          if (count) {
            extractedArcadePartsMap.set(key, count + 1);
          } else {
            extractedArcadePartsMap.set(key, 1);
          }
        } else {
          const count = extractedJunksMap.get(key);
          if (count) {
            extractedJunksMap.set(key, count + 1);
          } else {
            extractedJunksMap.set(key, 1);
          }
        }
      }

      // JunkInventoryが減っていることを確認
      const afterJunkInventories = await prisma.extractJunkInventory.findMany(
        {},
      );
      for (const afterJunkInventory of afterJunkInventories) {
        const extractedCount = extractedJunksMap.get(
          `${afterJunkInventory.category}-${afterJunkInventory.subCategory}`,
        );
        const initialInventory =
          await prisma.extractInitialInventory.findUniqueOrThrow({
            where: {
              seasonId_itemType_category_subCategory: {
                seasonId,
                itemType: "JUNK_PART",
                category: afterJunkInventory.category,
                subCategory: afterJunkInventory.subCategory,
              },
            },
          });
        if (extractedCount) {
          // 排出されてるアイテム
          expect(afterJunkInventory.amount).toEqual(
            initialInventory.initialAmount - extractedCount,
          );
        } else {
          // 排出されていないアイテム
          expect(afterJunkInventory.amount).toEqual(
            initialInventory.initialAmount,
          );
        }
      }

      // ユーザーの保有するAP数確認
      const arcadeParts = await prisma.arcadePart.groupBy({
        _count: {
          id: true,
        },
        where: {
          userId: ctx.userId!,
        },
        by: ["category", "subCategory"],
      });
      for (const ap of arcadeParts) {
        const count = extractedArcadePartsMap.get(
          `${ap.category}-${ap.subCategory}`,
        );
        expect(count).not.toBeUndefined();
        expect(ap._count.id).toEqual(count);
      }

      // 消費の確認
      const afterUser = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      });
      expect(afterUser).toMatchObject({
        id: ctx.userId,
        terasBalance: new Prisma.Decimal(0),
        akvBalance: EXTRACT_FEES.AKV,
      });
    });
    test("success/AKV", async () => {
      const ctx = await createMockContext({
        terasBalance: EXTRACT_FEES.TERAS,
        akvBalance: EXTRACT_FEES.AKV,
      });
      const seasonId = await createInventory();
      const am = await createArcadeMachine({
        energy: 200000,
        maxEnergy: 200000,
        userId: ctx.userId,
      });
      const ret = await useCase.extract(ctx, am.id, 20, "AKV");
      expect(ret).toHaveLength(12);

      const getPriority = (item: ArcadePart | Junk): number => {
        const isJunk = !("ownerWalletAddress" in item);
        return getExtractPriority(isJunk, item.category, item.subCategory);
      };
      // Priorityが小さい順で返ってきていることを確認するためにソートしなおす
      const sorted = ret.sort((a, b) => {
        const aPriority = getPriority(a);
        const bPriority = getPriority(b);
        if (aPriority === bPriority) return 0;
        if (aPriority > bPriority) {
          return 1;
        }
        return -1;
      });
      expect(ret).toEqual(sorted);

      // 排出数を種別ごとにまとめる
      const extractedJunksMap = new Map<string, number>();
      const extractedArcadePartsMap = new Map<string, number>();
      for (const elm of ret) {
        const key = `${elm.category}-${elm.subCategory}`;
        if ("ownerWalletAddress" in elm) {
          const count = extractedArcadePartsMap.get(key);
          if (count) {
            extractedArcadePartsMap.set(key, count + 1);
          } else {
            extractedArcadePartsMap.set(key, 1);
          }
        } else {
          const count = extractedJunksMap.get(key);
          if (count) {
            extractedJunksMap.set(key, count + 1);
          } else {
            extractedJunksMap.set(key, 1);
          }
        }
      }

      // JunkInventoryが減っていることを確認
      const afterJunkInventories = await prisma.extractJunkInventory.findMany(
        {},
      );
      for (const afterJunkInventory of afterJunkInventories) {
        const extractedCount = extractedJunksMap.get(
          `${afterJunkInventory.category}-${afterJunkInventory.subCategory}`,
        );
        const initialInventory =
          await prisma.extractInitialInventory.findUniqueOrThrow({
            where: {
              seasonId_itemType_category_subCategory: {
                seasonId,
                itemType: "JUNK_PART",
                category: afterJunkInventory.category,
                subCategory: afterJunkInventory.subCategory,
              },
            },
          });
        if (extractedCount) {
          // 排出されてるアイテム
          expect(afterJunkInventory.amount).toEqual(
            initialInventory.initialAmount - extractedCount,
          );
        } else {
          // 排出されていないアイテム
          expect(afterJunkInventory.amount).toEqual(
            initialInventory.initialAmount,
          );
        }
      }

      // ユーザーの保有するAP数確認
      const arcadeParts = await prisma.arcadePart.groupBy({
        _count: {
          id: true,
        },
        where: {
          userId: ctx.userId!,
        },
        by: ["category", "subCategory"],
      });
      for (const ap of arcadeParts) {
        const count = extractedArcadePartsMap.get(
          `${ap.category}-${ap.subCategory}`,
        );
        expect(count).not.toBeUndefined();
        expect(ap._count.id).toEqual(count);
      }

      // Teras消費の確認
      const afterUser = await prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      });
      expect(afterUser).toMatchObject({
        id: ctx.userId,
        terasBalance: EXTRACT_FEES.TERAS,
        akvBalance: new Prisma.Decimal(0),
      });
    });
  });

  test("teras insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: EXTRACT_FEES.TERAS.sub(1),
      akvBalance: EXTRACT_FEES.AKV.sub(1),
    });
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });
    await expect(useCase.extract(ctx, am.id, 20, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("AKV insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: EXTRACT_FEES.TERAS.sub(1),
      akvBalance: EXTRACT_FEES.AKV.sub(1),
    });
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });
    await expect(useCase.extract(ctx, am.id, 20, "AKV")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("arcade machine is not own", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
    });
    await expect(useCase.extract(ctx, am.id, 20, "TERAS")).rejects.toThrowError(
      PermissionDeniedUseCaseError,
    );
  });
  test("arcade machine is not found", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.extract(ctx, uuidv4(), 20, "TERAS"),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("extract code mismatch", async () => {
    const ctx = await createMockContext();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });
    await expect(useCase.extract(ctx, am.id, 19, "TERAS")).rejects.toThrowError(
      StateChangeUseCaseError,
    );
  });
  test("minExtractItemCount = inventory < extractItemCount", async () => {
    /*
    baseExtractItemCount = 8
    extractCode = 10
      extractItemCount = 8
    calculateExtractCode = 13
      extractItemCount = 11
    inventory total count = 8
     */
    // extractCode + 3 排出数=11になる
    // mockReturnValueOnceで上記のExtractCodeに加算する数を制御、mockReturnValueの方はそれ以外の箇所で呼ばれる際の返却値
    (getRandomInt as jest.Mock) = jest
      .fn()
      .mockReturnValueOnce(3)
      .mockReturnValue(0);

    const ctx = await createMockContext({
      terasBalance: 50000,
    });
    // extractCode=10 排出数=8
    const am = await createArcadeMachine({
      energy: 100000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    await createInventory();
    // 配布済み扱いにして在庫を8個に調整
    await prisma.arcadePart.updateMany({
      data: {
        userId: ctx.userId,
      },
      where: {
        OR: [
          { category: "ROM" },
          { category: "ACCUMULATOR" },
          { category: "LOWER_CABINET" },
          { category: "UPPER_CABINET" },
        ],
      },
    });

    const ret = await useCase.extract(ctx, am.id, 10, "TERAS");
    // 排出数が8個であること
    expect(ret).toHaveLength(8);

    // Inventoryの合計が0(すべての在庫を排出)であることを確認
    const listExtractItems = await useCase.listBoxItems(ctx);
    const count = listExtractItems
      .map((v) => {
        return v.amount;
      })
      .reduce((x, y) => x + y, 0);
    expect(count).toEqual(0);
    jest.resetAllMocks();
  });
  test("minExtractItemCount < inventory < extractItemCount", async () => {
    /*
    baseExtractItemCount = 8
    extractCode = 10
      extractItemCount = 8
    calculateExtractCode = 13
      extractItemCount = 11
    inventory total count = 10
     */
    // extractCode + 3 排出数=11になる
    // mockReturnValueOnceで上記のExtractCodeに加算する数を制御、mockReturnValueの方はそれ以外の箇所で呼ばれる際の返却値

    (getRandomInt as jest.Mock) = jest
      .fn()
      .mockReturnValueOnce(3)
      .mockReturnValue(0);

    const ctx = await createMockContext({
      terasBalance: 50000,
    });
    // extractCode=10 排出数=8
    const am = await createArcadeMachine({
      energy: 100000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    await createInventory();
    // 配布済み扱いにして在庫を10個に調整
    await prisma.arcadePart.updateMany({
      data: {
        userId: ctx.userId,
      },
      where: {
        OR: [
          { category: "ROM" },
          { category: "ACCUMULATOR" },
          { category: "LOWER_CABINET" },
        ],
      },
    });

    const ret = await useCase.extract(ctx, am.id, 10, "TERAS");
    // 排出数が8個であること
    expect(ret).toHaveLength(8);

    // Inventoryの合計が2であることを確認
    const listExtractItems = await useCase.listBoxItems(ctx);
    const count = listExtractItems
      .map((v) => {
        return v.amount;
      })
      .reduce((x, y) => x + y, 0);
    expect(count).toEqual(2);
    jest.resetAllMocks();
  });

  test("conflict/teras insufficient", async () => {
    (getRandomInt as jest.Mock) = jest.fn().mockReturnValue(0);

    const ctx = await createMockContext({
      terasBalance: 50000,
    });

    await createInventory();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    const org = ctx.prisma.user.findUniqueOrThrow;
    (ctx.prisma.user.findUniqueOrThrow as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const orgRet = await org(args);
        await prisma.user.update({
          where: { id: ctx.userId },
          data: { terasBalance: EXTRACT_FEES.TERAS.sub(1) },
        });
        return orgRet;
      });
    await expect(useCase.extract(ctx, am.id, 20, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
    ctx.prisma.user.findUniqueOrThrow = org;
  });
  test("conflict/arcade machine energy insufficient", async () => {
    (getRandomInt as jest.Mock) = jest.fn().mockReturnValue(0);
    const ctx = await createMockContext({
      terasBalance: 50000,
    });

    await createInventory();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    const org = ctx.prisma.user.findUniqueOrThrow;
    (ctx.prisma.user.findUniqueOrThrow as jest.Mock) = jest
      .fn()
      .mockImplementation(async (args) => {
        const orgRet = await org(args);
        await prisma.arcadeMachine.update({
          where: { id: am.id },
          data: { extractedEnergy: am.energy },
        });
        return orgRet;
      });
    await expect(useCase.extract(ctx, am.id, 20, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
    ctx.prisma.user.findUniqueOrThrow = org;
  });
  test("conflict/junk parts conflict", async () => {
    (getRandomInt as jest.Mock) = jest.fn().mockReturnValue(0);
    const executeSpy = jest.spyOn(
      ExtractUseCaseImpl.prototype as any,
      "execute",
    );
    const ctx = await createMockContext({
      terasBalance: 50000,
    });

    await createInventory();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    const listBoxItems = await useCase.listBoxItems(ctx);
    const listBoxItemsSpy = jest
      .spyOn(ExtractUseCaseImpl.prototype, "listBoxItems")
      .mockImplementationOnce(async () => {
        await prisma.extractJunkInventory.updateMany({
          data: { amount: 0 },
        });
        return listBoxItems;
      });

    await expect(useCase.extract(ctx, am.id, 20, "TERAS")).rejects.toThrowError(
      ExtractItemInsufficientUseCaseError,
    );
    // リトライしてるので2度呼ばれていること
    expect(executeSpy).toHaveBeenCalledTimes(2);
    listBoxItemsSpy.mockRestore();
    executeSpy.mockRestore();
  });
  test("arcade part conflict", async () => {
    (getRandomInt as jest.Mock) = jest.fn().mockReturnValue(0);
    const executeSpy = jest.spyOn(
      ExtractUseCaseImpl.prototype as any,
      "execute",
    );
    const ctx = await createMockContext({
      terasBalance: 50000,
    });

    await createInventory();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    const listBoxItems = await useCase.listBoxItems(ctx);
    const listBoxItemsSpy = jest
      .spyOn(ExtractUseCaseImpl.prototype, "listBoxItems")
      .mockImplementation(async () => {
        await prisma.arcadePart.updateMany({
          data: { userId: ctx.userId },
        });
        return listBoxItems;
      });

    await expect(useCase.extract(ctx, am.id, 20, "TERAS")).rejects.toThrowError(
      ConflictUseCaseError,
    );
    // リトライしてるので2度呼ばれていること
    expect(executeSpy).toHaveBeenCalledTimes(2);
    listBoxItemsSpy.mockRestore();
    executeSpy.mockRestore();
  });
  test("2nd execute success", async () => {
    (getRandomInt as jest.Mock) = jest.fn().mockReturnValue(0);
    const executeSpy = jest.spyOn(
      ExtractUseCaseImpl.prototype as any,
      "execute",
    );
    const ctx = await createMockContext({
      terasBalance: 50000,
    });

    await createInventory();
    const am = await createArcadeMachine({
      energy: 200000,
      maxEnergy: 200000,
      userId: ctx.userId,
    });

    const listBoxItems = await useCase.listBoxItems(ctx);
    const listBoxItemsSpy = jest
      .spyOn(ExtractUseCaseImpl.prototype, "listBoxItems")
      .mockImplementationOnce(async () => {
        await prisma.arcadePart.updateMany({
          data: { userId: ctx.userId },
        });
        return listBoxItems;
      })
      .mockImplementationOnce(async () => {
        await prisma.arcadePart.updateMany({
          data: { userId: null },
        });
        return listBoxItems;
      });

    const ret = await useCase.extract(ctx, am.id, 20, "TERAS");
    // リトライしてるので2度呼ばれていること
    expect(executeSpy).toHaveBeenCalledTimes(2);
    expect(ret).toHaveLength(12);
    listBoxItemsSpy.mockRestore();
    executeSpy.mockRestore();
  });
});
