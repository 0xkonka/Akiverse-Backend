import { MetadataUseCaseImpl } from "../../src/use_cases/metadata_usecase";
import { eraseDatabase } from "../test_helper";
import { createMockContextNonAuth } from "../mock/context";
import { Context } from "../../src/context";
import {
  ArcadePart,
  GameCenter,
  GameCenterArea,
  GameCenterSize,
} from "@generated/type-graphql";
import { NotFoundUseCaseError } from "../../src/use_cases/errors";
import { ArcadeMachine, ArcadePartCategory } from "@prisma/client";
import { GameId, games } from "../../src/metadata/games";
import {
  accumulators,
  getJunkMetadata,
  lowerCabinets,
  roms,
  upperCabinets,
} from "../../src/metadata/arcade-parts";
import { CRAFT_BASE_FEE } from "../../src/constants";

const useCase = new MetadataUseCaseImpl();

async function createGameCenter(
  ctx: Context,
  extraData = {},
): Promise<GameCenter> {
  return await ctx.prisma.gameCenter.create({
    data: {
      name: "test",
      id: "1",
      size: GameCenterSize.SMALL,
      xCoordinate: 2,
      yCoordinate: 3,
      area: GameCenterArea.AKIHABARA,
      ...extraData,
    },
  });
}

async function createArcadePart(
  ctx: Context,
  category: ArcadePartCategory,
  subCategory: string,
  extraData = {},
): Promise<ArcadePart> {
  return await ctx.prisma.arcadePart.create({
    data: {
      id: "1",
      category: category,
      subCategory: subCategory,
      ...extraData,
    },
  });
}

async function createArcadeMachine(
  ctx: Context,
  extraData = {},
): Promise<ArcadeMachine> {
  return ctx.prisma.arcadeMachine.create({
    data: {
      id: "1",
      game: "BUBBLE_ATTACK",
      boost: 2,
      energy: 3,
      maxEnergy: 4,
      accumulatorSubCategory: "HOKUTO_100_LX",
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "MERCURY",
      ...extraData,
    },
  });
}

describe("game center", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = createMockContextNonAuth();
    const gameCenter = await createGameCenter(ctx);
    const ret = await useCase.getGameCenterMetadata(ctx, gameCenter.id);

    const urlBase = "https://assets.akiverse.io/gamecenters/akihabara/small";
    const expected = {
      name: gameCenter.name,
      description:
        "Game Centers (GC) are rare digital pieces of real estate where players come to play on Arcade Machines (AM). Once you become an owner, you can start generating income by leasing out space to AM Owners of your choice. You can even provide your own AMs to cut out the middleman. GCs come in three sizes: small (4 AM), medium (16 AM) and large (64 AM).\n\nEach GC is a unique, Non-Fungible Token (ERC-721) on the Polygon network of the Ethereum blockchain.",
      image: urlBase + ".png",
      animation_url: urlBase + ".mp4",
      external_url: urlBase + ".png",
      transparent_image_url: urlBase + "-transparent.png",
      attributes: [
        { trait_type: "Size", value: "Small" },
        { trait_type: "Area", value: "Akihabara" },
        { trait_type: "X Coordinates", display_type: "number", value: 2 },
        { trait_type: "Y Coordinates", display_type: "number", value: 3 },
      ],
    };
    expect(ret).toEqual(expected);
  });
  test("not found", async () => {
    const ctx = createMockContextNonAuth();
    await expect(useCase.getGameCenterMetadata(ctx, "1")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
});

describe("arcade parts", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("not found", async () => {
    const ctx = createMockContextNonAuth();
    await expect(useCase.getGameCenterMetadata(ctx, "1")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("success/ROM", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.ROM,
      "BUBBLE_ATTACK",
    );
    const ret = await useCase.getArcadePartMetadata(ctx, ap.id);
    const rom = roms.BUBBLE_ATTACK;
    const expected = {
      name: rom.name + " ROM",
      description: rom.description,
      image: rom.imageUrl,
      animation_url: rom.animationUrl,
      external_url: rom.externalUrl,
      attributes: [
        { trait_type: "Type", value: "Rom" },
        { trait_type: "Name", value: "Bubble Attack" },
      ],
      rarity: 1,
    };
    expect(ret).toEqual(expected);
  });
  test("mismatch sub category/ROM", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.ROM,
      "ILLEGAL_SUB_CATEGORY",
    );
    await expect(
      useCase.getArcadePartMetadata(ctx, ap.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("success/Accumulator", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.ACCUMULATOR,
      "HOKUTO_100_LX",
    );
    const ret = await useCase.getArcadePartMetadata(ctx, ap.id);
    const acc = accumulators.HOKUTO_100_LX;
    const expected = {
      name: acc.name + " Accumulator",
      description: acc.description,
      image: acc.imageUrl,
      animation_url: acc.animationUrl,
      external_url: acc.externalUrl,
      attributes: [
        { trait_type: "Type", value: "Accumulator" },
        { trait_type: "Name", value: "Hokuto100LX" },
      ],
      rarity: 1,
    };
    expect(ret).toEqual(expected);
  });
  test("mismatch sub category/Accumulator", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.ACCUMULATOR,
      "ILLEGAL_SUB_CATEGORY",
    );
    await expect(
      useCase.getArcadePartMetadata(ctx, ap.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("success/UpperCabinet", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.UPPER_CABINET,
      "MERCURY",
    );
    const ret = await useCase.getArcadePartMetadata(ctx, ap.id);
    const uc = upperCabinets.MERCURY;
    const expected = {
      name: uc.name + " Upper Cabinet",
      description: uc.description,
      image: uc.imageUrl,
      animation_url: uc.animationUrl,
      external_url: uc.externalUrl,
      attributes: [
        { trait_type: "Type", value: "Upper Cabinet" },
        { trait_type: "Name", value: "Mercury" },
      ],
      rarity: 2,
    };
    expect(ret).toEqual(expected);
  });
  test("mismatch sub category/UpperCabinet", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.UPPER_CABINET,
      "ILLEGAL_SUB_CATEGORY",
    );
    await expect(
      useCase.getArcadePartMetadata(ctx, ap.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
  test("success/LowerCabinet", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.LOWER_CABINET,
      "VENUS",
    );
    const ret = await useCase.getArcadePartMetadata(ctx, ap.id);
    const lc = lowerCabinets.VENUS;
    const expected = {
      name: lc.name + " Lower Cabinet",
      description: lc.description,
      image: lc.imageUrl,
      animation_url: lc.animationUrl,
      external_url: lc.externalUrl,
      attributes: [
        { trait_type: "Type", value: "Lower Cabinet" },
        { trait_type: "Name", value: "Venus" },
      ],
      rarity: 3,
    };
    expect(ret).toEqual(expected);
  });
  test("mismatch sub category/LowerCabinet", async () => {
    const ctx = createMockContextNonAuth();
    const ap = await createArcadePart(
      ctx,
      ArcadePartCategory.LOWER_CABINET,
      "ILLEGAL_SUB_CATEGORY",
    );
    await expect(
      useCase.getArcadePartMetadata(ctx, ap.id),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
});

describe("arcade machine", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = createMockContextNonAuth();
    const am = await createArcadeMachine(ctx);
    const ret = await useCase.getArcadeMachineMetadata(ctx, am.id);

    const expected = {
      name: "Bubble Attack",
      description: "",
      image: "https://assets.akiverse.io/arcademachines/bubble-attack.png",
      transparent_image_url:
        "https://assets.akiverse.io/arcademachines/bubble-attack-transparent.png",
      without_acc_image_url:
        "https://assets.akiverse.io/arcademachines/bubble-attack-without-acc.png",
      animation_url:
        "https://assets.akiverse.io/arcademachines/bubble-attack.mp4",
      external_url:
        "https://assets.akiverse.io/arcademachines/bubble-attack.png",
      attributes: [
        { trait_type: "Game", value: "Bubble Attack" },
        { trait_type: "Boost", value: 2, display_type: "number" },
        { trait_type: "Energy", value: 3, display_type: "number" },
        { trait_type: "Max Energy", value: 4, display_type: "number" },
        { trait_type: "Mega Sparked", value: "False" },
        { trait_type: "Fever Remain", value: 30, display_type: "number" },
        { trait_type: "UC Grade", value: "Plain" },
        { trait_type: "LC Grade", value: "Mercury" },
      ],
    };
    expect(ret).toEqual(expected);
  });
  test("not found", async () => {
    const ctx = createMockContextNonAuth();
    await expect(
      useCase.getArcadeMachineMetadata(ctx, "1"),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
});

describe("listGames", () => {
  test("get", () => {
    const ret = useCase.getGames();

    // すべてのGameIDを保持し、レスポンスに含まれていたかチェックする
    const gameIds = new Map<string, boolean>();
    for (const gamesKey in games) {
      gameIds.set(gamesKey, false);
    }
    expect(ret).toHaveLength(gameIds.size);
    ret.forEach((v) => {
      gameIds.set(v.id, true);
      const game = games[v.id];
      expect(game).not.toBeNull();
      expect(v.id).toEqual(game.id);
      expect(v.name).toEqual(game.name);
      expect(v.hotGame).toEqual(game.hotGame);
      expect(v.rarity).toEqual(game.rarity);
      expect(v.craft).toEqual(game.craftRecipe);
      expect(v.craftFee).toEqual(CRAFT_BASE_FEE);
      expect(v.publisherId).toEqual(game.publisherId);
      expect(v.enabled).toEqual(game.enabled);
      expect(v.order).toEqual(game.order);
    });
    gameIds.forEach((v) => {
      // すべてのゲームが含まれるか
      expect(v).toBeTruthy();
    });
  });
});

describe("getJunkMetadata", () => {
  test("success", () => {
    const rom = getJunkMetadata("ROM", "BUBBLE_ATTACK");
    expect(rom).toMatchObject({
      name: `junk Bubble Attack ROM`,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      junksPerPart: 10,
    });
    const acc = getJunkMetadata("ACCUMULATOR", "HOKUTO_100_LX");
    expect(acc).toMatchObject({
      name: `junk Hokuto100LX Accumulator`,
      imageUrl:
        "https://assets.akiverse.io/arcadeparts/junks/accumulator-rarity-1.png",
      junksPerPart: 10,
    });
    const lc = getJunkMetadata("LOWER_CABINET", "PLAIN");
    expect(lc).toMatchObject({
      name: `junk Plain Lower Cabinet`,
      imageUrl:
        "https://assets.akiverse.io/arcadeparts/junks/lower-cabinet-rarity-1.png",
      junksPerPart: 10,
    });
    const uc = getJunkMetadata("UPPER_CABINET", "PLAIN");
    expect(uc).toMatchObject({
      name: `junk Plain Upper Cabinet`,
      imageUrl:
        "https://assets.akiverse.io/arcadeparts/junks/upper-cabinet-rarity-1.png",
      junksPerPart: 10,
    });
  });
});
