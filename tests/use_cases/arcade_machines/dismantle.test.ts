import {
  createArcadeMachine,
  createGameCenter,
  eraseDatabase,
} from "../../test_helper";
import { createMockContext } from "../../mock/context";
import ArcadeMachineUseCaseImpl from "../../../src/use_cases/arcade_machine_usecase";
import { IllegalStateUseCaseError } from "../../../src/use_cases/errors";
import {
  DISMANTLE_FEES,
  INSTALLATION_FEE_OF_DAY,
} from "../../../src/constants";
import { Prisma } from "@prisma/client";

const useCase = new ArcadeMachineUseCaseImpl();
describe("dismantle", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/no installed", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS,
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 100000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
      feverSparkRemain: 0,
    });
    const ret = await useCase.dismantle(ctx, am.id, "TERAS");
    const aps = [];
    expect(ret.rom).not.toBeNull();
    expect(ret.rom.category).toEqual("ROM");
    // ROMは必ずAMと一致する
    expect(ret.rom.subCategory).toEqual(am.game);
    aps.push(ret.rom);
    expect(ret.upperCabinet).not.toBeNull();
    expect(ret.upperCabinet.category).toEqual("UPPER_CABINET");
    if (ret.upperCabinetGradeUp) {
      // gradeUpした
      expect(ret.upperCabinet.subCategory).toEqual("MERCURY");
    } else {
      expect(ret.upperCabinet.subCategory).toEqual("PLAIN");
    }
    aps.push(ret.upperCabinet);
    expect(ret.lowerCabinet).not.toBeNull();
    expect(ret.lowerCabinet.category).toEqual("LOWER_CABINET");
    if (ret.lowerCabinetGradeUp) {
      // gradeUpした
      expect(ret.lowerCabinet.subCategory).toEqual("MERCURY");
    } else {
      expect(ret.lowerCabinet.subCategory).toEqual("PLAIN");
    }
    aps.push(ret.lowerCabinet);
    aps.map((v) => {
      expect(v).toMatchObject({
        userId: ctx.userId,
        ownerWalletAddress: ctx.walletAddress,
        state: "IN_AKIVERSE",
      });
    });
    const after = await ctx.prisma.arcadeMachine.findUniqueOrThrow({
      where: {
        id: am.id,
      },
      include: {
        dismantle: {
          include: {
            createdArcadeParts: true,
          },
        },
      },
    });
    expect(after.dismantle).toBeDefined();
    expect(after.dismantle!.arcadeMachineId).toEqual(am.id);
    expect(after.dismantle!.createdArcadeParts).toHaveLength(3);
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(0));
  });
  test("success/installed", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS,
    });
    const gc = await createGameCenter({
      userId: ctx.userId!,
      placementAllowed: true,
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 100000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
      feverSparkRemain: 1,
    });
    await useCase.installArcadeMachineToGameCenter(ctx, am.id, gc.id, false);

    expect(
      await ctx.prisma.arcadeMachine.findUniqueOrThrow({
        where: { id: am.id },
      }),
    ).toMatchObject({
      gameCenterId: gc.id,
    });
    const ret = await useCase.dismantle(ctx, am.id, "TERAS");
    const aps = [];
    expect(ret.rom).not.toBeNull();
    expect(ret.rom.category).toEqual("ROM");
    // ROMは必ずAMと一致する
    expect(ret.rom.subCategory).toEqual(am.game);
    aps.push(ret.rom);
    expect(ret.upperCabinet).not.toBeNull();
    expect(ret.upperCabinet.category).toEqual("UPPER_CABINET");
    if (ret.upperCabinetGradeUp) {
      // gradeUpした
      expect(ret.upperCabinet.subCategory).toEqual("MERCURY");
    } else {
      expect(ret.upperCabinet.subCategory).toEqual("PLAIN");
    }
    aps.push(ret.upperCabinet);
    expect(ret.lowerCabinet).not.toBeNull();
    expect(ret.lowerCabinet.category).toEqual("LOWER_CABINET");
    if (ret.lowerCabinetGradeUp) {
      // gradeUpした
      expect(ret.lowerCabinet.subCategory).toEqual("MERCURY");
    } else {
      expect(ret.lowerCabinet.subCategory).toEqual("PLAIN");
    }
    aps.push(ret.lowerCabinet);
    aps.map((v) => {
      expect(v).toMatchObject({
        userId: ctx.userId,
        ownerWalletAddress: ctx.walletAddress,
        state: "IN_AKIVERSE",
      });
    });
    const after = await ctx.prisma.arcadeMachine.findUniqueOrThrow({
      where: {
        id: am.id,
      },
      include: {
        dismantle: {
          include: {
            createdArcadeParts: true,
          },
        },
      },
    });
    expect(after.dismantle).toBeDefined();
    expect(after.dismantle!.arcadeMachineId).toEqual(am.id);
    expect(after.dismantle!.createdArcadeParts).toHaveLength(3);
    expect(after.gameCenterId).toBeNull();
    const afterUser = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: ctx.userId },
    });
    expect(afterUser.terasBalance).toEqual(new Prisma.Decimal(0));
  });
  test("fail/no mega spark", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS,
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 90000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
    });
    await expect(useCase.dismantle(ctx, am.id, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("fail/playing", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS,
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 90000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
    });
    await ctx.prisma.playSession.create({
      data: {
        arcadeMachineId: am.id,
        arcadeMachineOwnerId: ctx.userId!,
        playerId: ctx.userId!,
        state: "READY",
        authToken: "hogehoge",
        difficulty: 1,
        targetScore: 1,
      },
    });
    await expect(useCase.dismantle(ctx, am.id, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("fail/not deposited", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS,
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 100000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
      state: "IN_WALLET",
    });
    await expect(useCase.dismantle(ctx, am.id, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("fail/teras insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS.sub(1),
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 100000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
      state: "IN_WALLET",
    });
    await expect(useCase.dismantle(ctx, am.id, "TERAS")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("fail/akv insufficient", async () => {
    const ctx = await createMockContext({
      terasBalance: DISMANTLE_FEES.TERAS,
      akvBalance: DISMANTLE_FEES.AKV.sub(1),
    });
    const am = await createArcadeMachine({
      userId: ctx.userId,
      ownerWalletAddress: ctx.walletAddress,
      energy: 100000,
      maxEnergy: 100000,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
      state: "IN_WALLET",
    });
    await expect(useCase.dismantle(ctx, am.id, "AKV")).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
});

describe("grade up", () => {
  test("ランダムにアップグレードされる", () => {
    const picked = [];
    for (let i = 0; i < 100; i++) {
      picked.push(
        useCase.gradeUp("PLAIN", {
          next: "MERCURY",
          percentage: 80,
        }),
      );
    }
    expect(picked).toHaveLength(100);
    const noUpgrade = picked.filter((v) => {
      return v.isGradeUp === false;
    });
    const upgrade = picked.filter((v) => {
      return v.isGradeUp === true;
    });
    expect(noUpgrade.length).toBeGreaterThan(0);
    expect(upgrade.length).toBeGreaterThan(0);
    // 8割の確率でアップグレードされるので、必ずアップグレードの方が多くなるはず
    expect(upgrade.length).toBeGreaterThan(noUpgrade.length);
  });
  test("percentage is zero", () => {
    for (let i = 0; i < 100; i++) {
      const ret = useCase.gradeUp("PLAIN", {
        next: "MERCURY",
        percentage: 0,
      });
      expect(ret.isGradeUp).toBeFalsy();
      expect(ret.createCabinetGrade).toEqual("PLAIN");
    }
  });
});
