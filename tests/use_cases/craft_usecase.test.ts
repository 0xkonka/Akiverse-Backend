import "reflect-metadata";

import {
  CraftPartType,
  CraftUseCaseImpl,
} from "../../src/use_cases/craft_usecase";
import { ArcadePart, NftState, Prisma } from "@prisma/client";
import { Context } from "../../src/context";
import { createMockContext } from "../mock/context";
import { createUser, eraseDatabase } from "../test_helper";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../src/use_cases/errors";
import { AccumulatorId, accumulators } from "../../src/metadata/arcade-parts";
import { CRAFT_BASE_FEES } from "../../src/constants";
import { RankingUseCaseImpl } from "../../src/use_cases/ranking_usecase";

const useCase = new CraftUseCaseImpl(new RankingUseCaseImpl());

describe("craft", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  async function createRom(ctx: Context, extraData = {}): Promise<ArcadePart> {
    return await ctx.prisma.arcadePart.create({
      data: {
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        userId: ctx.userId!,
        ...extraData,
      },
    });
  }
  async function createAccumulator(
    ctx: Context,
    extraData = {},
  ): Promise<ArcadePart> {
    return await ctx.prisma.arcadePart.create({
      data: {
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        userId: ctx.userId!,
        ...extraData,
      },
    });
  }
  async function createLowerCabinet(
    ctx: Context,
    extraData = {},
  ): Promise<ArcadePart> {
    return await ctx.prisma.arcadePart.create({
      data: {
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        userId: ctx.userId!,
        ...extraData,
      },
    });
  }
  async function createUpperCabinet(
    ctx: Context,
    extraData = {},
  ): Promise<ArcadePart> {
    return await ctx.prisma.arcadePart.create({
      data: {
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        userId: ctx.userId!,
        ...extraData,
      },
    });
  }
  describe("success", () => {
    test("arcade parts only", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const accMetadata = accumulators[acc.subCategory as AccumulatorId];
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      const retAm = await useCase.craft(ctx, craftParts, "TERAS");
      const craft = await ctx.prisma.craft.findUniqueOrThrow({
        where: { craftedArcadeMachineId: retAm.id },
      });

      const updatedParts = await ctx.prisma.arcadePart.findMany({
        where: {
          OR: [{ id: rom.id }, { id: acc.id }, { id: lc.id }, { id: uc.id }],
        },
      });
      // すべてのパーツが削除されており、AMのIDを持っていること
      updatedParts.forEach((v) => {
        expect(v.destroyedAt).not.toBeNull();
        expect(v.craftId).toEqual(craft.id);
      });
      type WantType = {
        game: string;
        maxEnergy: number;
        state: NftState;
        userId: string;
        ownerWalletAddress: string;
        accumulatorSubCategory: string;
        upperCabinetSubCategory: string;
        lowerCabinetSubCategory: string;
      };
      const want: WantType = {
        game: rom.subCategory,
        maxEnergy: accMetadata.tankCapacity,
        state: NftState.IN_AKIVERSE,
        userId: ctx.userId!,
        ownerWalletAddress: ctx.walletAddress!,
        accumulatorSubCategory: accMetadata.subCategory,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      };
      const convertedRet = retAm as WantType;
      expect(convertedRet).toMatchObject(want);
      expect(craft).toMatchObject({
        userId: ctx.userId!,
        craftedArcadeMachineId: retAm.id,
        usedTerasBalance: CRAFT_BASE_FEES.TERAS,
        usedAkvBalance: new Prisma.Decimal(0),
      });
      const afterUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      });
      expect(afterUser).toMatchObject({
        id: ctx.userId,
        terasBalance: new Prisma.Decimal(0),
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
    });
    test("junk parts only", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
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
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      const retAm = await useCase.craft(ctx, craftParts, "TERAS");
      const craft = await ctx.prisma.craft.findUniqueOrThrow({
        where: { craftedArcadeMachineId: retAm.id },
        include: {
          arcadeParts: true,
        },
      });
      expect(craft.arcadeParts).toHaveLength(4);
      // すべてのパーツが削除されており、AMのIDを持っていること
      craft.arcadeParts.forEach((v) => {
        expect(v.destroyedAt).not.toBeNull();
        expect(v.craftId).toEqual(craft.id);
      });
      const afterJunkParts = await ctx.prisma.junk.findMany();
      expect(afterJunkParts).toHaveLength(4);
      afterJunkParts.map((value) => {
        expect(value.amount).toEqual(0);
      });
      const afterUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      });
      expect(afterUser).toMatchObject({
        id: ctx.userId,
        terasBalance: new Prisma.Decimal(0),
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
    });
    test("ap/junk mix", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
      await ctx.prisma.junk.createMany({
        data: [
          {
            userId: ctx.userId!,
            category: "ACCUMULATOR",
            subCategory: "HOKUTO_100_LX",
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
      const rom = await createRom(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(2);
      const retAm = await useCase.craft(ctx, craftParts, "TERAS");
      const craft = await ctx.prisma.craft.findUniqueOrThrow({
        where: { craftedArcadeMachineId: retAm.id },
        include: {
          arcadeParts: true,
        },
      });
      expect(craft.arcadeParts).toHaveLength(4);
      // すべてのパーツが削除されており、AMのIDを持っていること
      craft.arcadeParts.forEach((v) => {
        expect(v.destroyedAt).not.toBeNull();
        expect(v.craftId).toEqual(craft.id);
      });
      const afterJunkParts = await ctx.prisma.junk.findMany();
      expect(afterJunkParts).toHaveLength(2);
      afterJunkParts.map((value) => {
        expect(value.amount).toEqual(0);
      });
      const afterUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      });
      expect(afterUser).toMatchObject({
        id: ctx.userId,
        terasBalance: new Prisma.Decimal(0),
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
    });
    test("use AKV", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
        akvBalance: CRAFT_BASE_FEES.AKV,
      });
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const accMetadata = accumulators[acc.subCategory as AccumulatorId];
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      const retAm = await useCase.craft(ctx, craftParts, "AKV");
      const craft = await ctx.prisma.craft.findUniqueOrThrow({
        where: { craftedArcadeMachineId: retAm.id },
      });

      const updatedParts = await ctx.prisma.arcadePart.findMany({
        where: {
          OR: [{ id: rom.id }, { id: acc.id }, { id: lc.id }, { id: uc.id }],
        },
      });
      // すべてのパーツが削除されており、AMのIDを持っていること
      updatedParts.forEach((v) => {
        expect(v.destroyedAt).not.toBeNull();
        expect(v.craftId).toEqual(craft.id);
      });
      type WantType = {
        game: string;
        maxEnergy: number;
        state: NftState;
        userId: string;
        ownerWalletAddress: string;
      };
      const want: WantType = {
        game: rom.subCategory,
        maxEnergy: accMetadata.tankCapacity,
        state: NftState.IN_AKIVERSE,
        userId: ctx.userId!,
        ownerWalletAddress: ctx.walletAddress!,
      };
      const convertedRet = retAm as WantType;
      expect(convertedRet).toMatchObject(want);
      expect(craft).toMatchObject({
        userId: ctx.userId!,
        craftedArcadeMachineId: retAm.id,
        usedTerasBalance: new Prisma.Decimal(0),
        usedAkvBalance: CRAFT_BASE_FEES.AKV,
      });
      const afterUser = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId },
      });
      expect(afterUser).toMatchObject({
        id: ctx.userId,
        terasBalance: CRAFT_BASE_FEES.TERAS,
        akvBalance: new Prisma.Decimal(0),
      });
    });
  });

  test("craft fee insufficient(teras)", async () => {
    const ctx = await createMockContext({
      terasBalance: CRAFT_BASE_FEES.TERAS.sub(1),
    });
    const rom = await createRom(ctx);
    const acc = await createAccumulator(ctx);
    const lc = await createLowerCabinet(ctx);
    const uc = await createUpperCabinet(ctx);
    const craftParts: CraftPartType[] = [];
    craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
    craftParts.push({
      category: "ACCUMULATOR",
      tokenId: acc.id,
      useJunk: false,
    });
    craftParts.push({
      category: "LOWER_CABINET",
      tokenId: lc.id,
      useJunk: false,
    });
    craftParts.push({
      category: "UPPER_CABINET",
      tokenId: uc.id,
      useJunk: false,
    });
    await expect(useCase.craft(ctx, craftParts, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("craft fee insufficient(akv)", async () => {
    const ctx = await createMockContext({
      akvBalance: CRAFT_BASE_FEES.AKV.sub(1),
    });
    const rom = await createRom(ctx);
    const acc = await createAccumulator(ctx);
    const lc = await createLowerCabinet(ctx);
    const uc = await createUpperCabinet(ctx);
    const craftParts: CraftPartType[] = [];
    craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
    craftParts.push({
      category: "ACCUMULATOR",
      tokenId: acc.id,
      useJunk: false,
    });
    craftParts.push({
      category: "LOWER_CABINET",
      tokenId: lc.id,
      useJunk: false,
    });
    craftParts.push({
      category: "UPPER_CABINET",
      tokenId: uc.id,
      useJunk: false,
    });
    await expect(useCase.craft(ctx, craftParts, "AKV")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  describe("parts not found", () => {
    test("rom not found", async () => {
      const ctx = await createMockContext();
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: "nothing", useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("accumulator not found", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: "nothing",
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("lower cabinet not found", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: "nothing",
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("upper cabinet not found", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: "nothing",
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
  });
  describe("junk amount is insufficient", () => {
    test("rom", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
      await ctx.prisma.junk.createMany({
        data: [
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
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("accumulator", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
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
            amount: 9,
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
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("upper cabinet", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
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
            amount: 0,
          },
          {
            userId: ctx.userId!,
            category: "LOWER_CABINET",
            subCategory: "PLAIN",
            amount: 10,
          },
        ],
      });
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("lower cabinet", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
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
        ],
      });
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
  });
  describe("permission denied", () => {
    test("rom permission denied", async () => {
      const ctx = await createMockContext();
      const dummyUser = await createUser();
      const rom = await createRom(ctx, { userId: dummyUser.id });
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(PermissionDeniedUseCaseError);
    });
    test("accumulator permission denied", async () => {
      const ctx = await createMockContext();
      const dummyUser = await createUser();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx, { userId: dummyUser.id });
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(PermissionDeniedUseCaseError);
    });
    test("lower cabinet permission denied", async () => {
      const ctx = await createMockContext();
      const dummyUser = await createUser();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx, { userId: dummyUser.id });
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(PermissionDeniedUseCaseError);
    });
    test("upper cabinet permission denied", async () => {
      const ctx = await createMockContext();
      const dummyUser = await createUser();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx, { userId: dummyUser.id });
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(PermissionDeniedUseCaseError);
    });
  });
  describe("parts destroyed", () => {
    test("rom destroyed", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx, { destroyedAt: new Date() });
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
    test("accumulator destroyed", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx, { destroyedAt: new Date() });
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
    test("lower cabinet destroyed", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx, { destroyedAt: new Date() });
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
    test("upper cabinet destroyed", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx, { destroyedAt: new Date() });
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
  });
  describe("parts is not IN_AKIVERSE state", () => {
    test("rom is not IN_AKIVERSE state", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx, { state: NftState.MOVING_TO_WALLET });
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
    test("accumulator is not IN_AKIVERSE state", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx, {
        state: NftState.MOVING_TO_AKIVERSE,
      });
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
    test("lower cabinet is not IN_AKIVERSE state", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx, { state: NftState.IN_WALLET });
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
    test("upper cabinet is not IN_AKIVERSE state", async () => {
      const ctx = await createMockContext();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx, {
        state: NftState.MOVING_TO_WALLET,
      });
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(IllegalStateUseCaseError);
    });
  });
  test("same category parts", async () => {
    const ctx = await createMockContext();
    const rom = await createRom(ctx);
    // acc is ROM type parts
    const acc = await createRom(ctx);
    const lc = await createLowerCabinet(ctx);
    const uc = await createUpperCabinet(ctx);
    const craftParts: CraftPartType[] = [];
    craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
    craftParts.push({
      category: "ACCUMULATOR",
      tokenId: acc.id,
      useJunk: false,
    });
    craftParts.push({
      category: "LOWER_CABINET",
      tokenId: lc.id,
      useJunk: false,
    });
    craftParts.push({
      category: "UPPER_CABINET",
      tokenId: uc.id,
      useJunk: false,
    });
    await expect(useCase.craft(ctx, craftParts, "TERAS")).rejects.toThrowError(
      InvalidArgumentUseCaseError,
    );
  });
  describe("craft conflicted", () => {
    test("destroyed at is not null", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });

      const orgMethod = ctx.prisma.user.findUnique;
      (ctx.prisma.user.findUnique as jest.Mock) = jest
        .fn()
        .mockImplementation(async (args) => {
          // 別トランザクションで先にAM作られたことを再現するために、destroyedAtを更新後に元の処理をする
          await ctx.prisma.arcadePart.update({
            where: { id: rom.id },
            data: { destroyedAt: new Date() },
          });
          return orgMethod(args);
        });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(ConflictUseCaseError);
      ctx.prisma.user.findUnique = orgMethod;
    });
    test("part owner change", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
      const afterOwner = await createUser();
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      const orgMethod = ctx.prisma.user.findUnique;
      (ctx.prisma.user.findUnique as jest.Mock) = jest
        .fn()
        .mockImplementation(async (args) => {
          // 別トランザクションでAPを移動させたことを再現
          await ctx.prisma.arcadePart.update({
            where: { id: acc.id },
            data: { userId: afterOwner.id },
          });
          return orgMethod(args);
        });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(ConflictUseCaseError);
      ctx.prisma.user.findUnique = orgMethod;
    });
    test("state change", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      const orgMethod = ctx.prisma.user.findUnique;
      (ctx.prisma.user.findUnique as jest.Mock) = jest
        .fn()
        .mockImplementation(async (args) => {
          // 別トランザクションでAPのStateを変えたことを再現
          await ctx.prisma.arcadePart.update({
            where: { id: lc.id },
            data: { state: NftState.MOVING_TO_WALLET },
          });
          return orgMethod(args);
        });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(ConflictUseCaseError);
      ctx.prisma.user.findUnique = orgMethod;
    });
    test("teras insufficient", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
      const rom = await createRom(ctx);
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      const orgMethod = ctx.prisma.user.findUnique;
      (ctx.prisma.user.findUnique as jest.Mock) = jest
        .fn()
        .mockImplementation(async (args) => {
          const orgRet = await orgMethod(args);
          // 別トランザクションでAPのStateを変えたことを再現
          await ctx.prisma.user.update({
            where: { id: ctx.userId! },
            data: { terasBalance: CRAFT_BASE_FEES.TERAS.sub(1) },
          });
          return orgRet;
        });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(ConflictUseCaseError);
      ctx.prisma.user.findUnique = orgMethod;
      const u = await ctx.prisma.user.findUniqueOrThrow({
        where: { id: ctx.userId! },
      });
      expect(u.terasBalance).toEqual(CRAFT_BASE_FEES.TERAS.sub(1));
      const amCount = await ctx.prisma.arcadeMachine.count({});
      expect(amCount).toEqual(0);
    });
    test("junk part insufficient", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
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
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      const orgMethod = ctx.prisma.user.findUnique;
      (ctx.prisma.user.findUnique as jest.Mock) = jest
        .fn()
        .mockImplementation(async (args) => {
          const orgRet = await orgMethod(args);
          // 別トランザクションでROMの数量を減らす
          await ctx.prisma.junk.update({
            where: {
              userId_category_subCategory: {
                userId: ctx.userId!,
                category: "ROM",
                subCategory: "BUBBLE_ATTACK",
              },
            },
            data: {
              amount: 0,
            },
          });
          return orgRet;
        });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(ConflictUseCaseError);
      ctx.prisma.user.findUnique = orgMethod;
    });
  });
  describe("usable parts check", () => {
    test("arcade part", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
      const rom = await createRom(ctx, { subCategory: "CURVE_BALL_3D" });
      const acc = await createAccumulator(ctx);
      const lc = await createLowerCabinet(ctx);
      const uc = await createUpperCabinet(ctx);
      const craftParts: CraftPartType[] = [];
      craftParts.push({ category: "ROM", tokenId: rom.id, useJunk: false });
      craftParts.push({
        category: "ACCUMULATOR",
        tokenId: acc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        tokenId: lc.id,
        useJunk: false,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        tokenId: uc.id,
        useJunk: false,
      });
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
    test("junk", async () => {
      const ctx = await createMockContext({
        terasBalance: CRAFT_BASE_FEES.TERAS,
      });
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
      const craftParts: CraftPartType[] = [];
      craftParts.push({
        category: "ROM",
        subCategory: "CURVE_BALL_3D",
        useJunk: true,
      });
      craftParts.push({
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        useJunk: true,
      });
      craftParts.push({
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      craftParts.push({
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        useJunk: true,
      });
      const beforeApCount = await ctx.prisma.arcadePart.count();
      expect(beforeApCount).toEqual(0);
      await expect(
        useCase.craft(ctx, craftParts, "TERAS"),
      ).rejects.toThrowError(InvalidArgumentUseCaseError);
    });
  });
});
