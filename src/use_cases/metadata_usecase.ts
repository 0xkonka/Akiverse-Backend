import "reflect-metadata";

import { Context } from "../context";
import { Metadata } from "../models/metadata";
import { NotFoundUseCaseError } from "./errors";
import { getGameCenterMetadata as getGameCenterMetadata } from "../metadata/game-centers";
import { Service } from "typedi";
import {
  CabinetCategoryId,
  getArcadePartMetadata,
  lowerCabinets,
  upperCabinets,
} from "../metadata/arcade-parts";
import { getArcadeMachineMetadata } from "../metadata/arcade-machines";
import { GameId, games, PublisherId } from "../metadata/games";
import { Prisma } from "@prisma/client";
import { CRAFT_BASE_FEE, FEVER_SPARK_MAX_COUNT } from "../constants";

export type GameWithRecipe = {
  id: GameId;
  name: string;
  publisherId: PublisherId;
  craftFee: Prisma.Decimal;
  hotGame: boolean;
  craft: {
    minUpperCabinetGrade: number;
    minLowerCabinetGrade: number;
  };
  rarity: {
    rom: number;
    junk: number;
  };
  enabled: boolean;
  order: number;
  onlyTournament: boolean;
  help: {
    description: string;
    howTo: string;
  };
  category: string;
  gamePath: string;
  winCondition: string;
};
export interface MetadataUseCase {
  getGameCenterMetadata(ctx: Context, id: string): Promise<Metadata>;

  getArcadePartMetadata(ctx: Context, id: string): Promise<Metadata>;

  getArcadeMachineMetadata(ctx: Context, id: string): Promise<Metadata>;
  getGames(): GameWithRecipe[];
}

@Service()
export class MetadataUseCaseImpl implements MetadataUseCase {
  async getGameCenterMetadata(ctx: Context, id: string): Promise<Metadata> {
    const gameCenter = await ctx.prisma.gameCenter.findUnique({
      where: { id: id },
    });
    if (!gameCenter)
      throw new NotFoundUseCaseError("GameCenter not found", "GameCenter");
    const metadata = getGameCenterMetadata(gameCenter.area, gameCenter.size);
    if (!metadata)
      throw new NotFoundUseCaseError(
        "game center metadata not found",
        "GameCenter",
      );

    // GameCenter Objectごとに異なる値はここで追加
    metadata.attributes.push({
      trait_type: "X Coordinates",
      value: gameCenter.xCoordinate,
      display_type: "number",
    });
    metadata.attributes.push({
      trait_type: "Y Coordinates",
      value: gameCenter.yCoordinate,
      display_type: "number",
    });

    return {
      ...metadata,
      name: gameCenter.name,
    };
  }

  async getArcadePartMetadata(ctx: Context, id: string): Promise<Metadata> {
    const arcadePart = await ctx.prisma.arcadePart.findUnique({
      where: { id: id },
    });
    if (!arcadePart) {
      throw new NotFoundUseCaseError("ArcadePart not found", "ArcadePart");
    }
    const metadata = getArcadePartMetadata(
      arcadePart.category,
      arcadePart.subCategory,
    );
    // TODO APそれぞれが持つAttributeがあるか確認中
    return metadata;
  }

  async getArcadeMachineMetadata(ctx: Context, id: string): Promise<Metadata> {
    const arcadeMachine = await ctx.prisma.arcadeMachine.findUnique({
      where: { id: id },
    });
    if (!arcadeMachine) {
      throw new NotFoundUseCaseError(
        "ArcadeMachine not found",
        "ArcadeMachine",
      );
    }
    const metadata = getArcadeMachineMetadata(arcadeMachine.game);
    // Energy/Max Energy/Boost
    metadata.attributes.push(
      {
        trait_type: "Boost",
        value: arcadeMachine.boost,
        display_type: "number",
      },
      {
        trait_type: "Energy",
        value: arcadeMachine.energy,
        display_type: "number",
      },
      {
        trait_type: "Max Energy",
        value: arcadeMachine.maxEnergy,
        display_type: "number",
      },
      {
        trait_type: "Mega Sparked",
        value: arcadeMachine.feverSparkRemain !== null ? "True" : "False",
      },
      {
        trait_type: "Fever Remain",
        value:
          arcadeMachine.feverSparkRemain !== null
            ? arcadeMachine.feverSparkRemain
            : FEVER_SPARK_MAX_COUNT,
        display_type: "number",
      },
      {
        trait_type: "UC Grade",
        value:
          upperCabinets[
            arcadeMachine.upperCabinetSubCategory as CabinetCategoryId
          ].name,
      },
      {
        trait_type: "LC Grade",
        value:
          lowerCabinets[
            arcadeMachine.lowerCabinetSubCategory as CabinetCategoryId
          ].name,
      },
    );

    return metadata;
  }

  getGames(): GameWithRecipe[] {
    const gamesWithRecipes = Array<GameWithRecipe>();
    for (const gamesKey in games) {
      const game = games[gamesKey as GameId];

      gamesWithRecipes.push({
        id: game.id,
        name: game.name,
        publisherId: game.publisherId,
        hotGame: game.hotGame,
        craft: {
          minUpperCabinetGrade: game.craftRecipe.minUpperCabinetGrade,
          minLowerCabinetGrade: game.craftRecipe.minLowerCabinetGrade,
        },
        rarity: {
          rom: game.rarity.rom,
          junk: game.rarity.junk,
        },
        craftFee: CRAFT_BASE_FEE,
        enabled: game.enabled,
        order: game.order,
        onlyTournament: game.onlyTournament,
        help: game.help,
        category: game.category,
        gamePath: game.gamePath,
        winCondition: game.winCondition,
      });
    }
    return gamesWithRecipes;
  }
}
