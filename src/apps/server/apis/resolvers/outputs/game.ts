import "reflect-metadata";

import { Prisma } from "@prisma/client";
import { Field, Int, ObjectType } from "type-graphql";
import { GameWithRecipe } from "../../../../../use_cases/metadata_usecase";
import { DecimalJSScalar } from "@generated/type-graphql/scalars";

@ObjectType()
export class Games {
  constructor(version: string, games: GameWithRecipe[]) {
    this.games = games.map((v) => {
      return new Game(v);
    });
    this.version = version;
  }
  @Field(() => String)
  version: string;

  @Field(() => [Game])
  games?: Game[];
}
@ObjectType()
export class Game {
  constructor(game: GameWithRecipe) {
    this.id = game.id;
    this.name = game.name;
    this.recipe = new Recipe(game);
    this.publisherId = game.publisherId;
    this.craftFee = game.craftFee;
    this.rarity = new Rarity(game.rarity.rom, game.rarity.junk);
    this.hotGame = game.hotGame;
    this.enabled = game.enabled;
    this.order = game.order;
    this.onlyTournament = game.onlyTournament;
    this.help = new Help(game.help.description, game.help.description);
    this.category = game.category;
    this.gamePath = game.gamePath;
    this.winCondition = game.winCondition;
  }
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  publisherId: string;

  @Field(() => Recipe)
  recipe: Recipe | null;

  @Field(() => DecimalJSScalar)
  craftFee: Prisma.Decimal;

  @Field(() => Rarity)
  rarity: Rarity | null;

  @Field(() => Boolean)
  hotGame: boolean;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Int)
  order: number;

  @Field(() => Boolean)
  onlyTournament: boolean;

  @Field(() => Help)
  help: Help | null;

  @Field(() => String)
  category: string;

  @Field(() => String)
  gamePath: string;

  @Field(() => String)
  winCondition: string;
}

@ObjectType()
export class Recipe {
  constructor(game: GameWithRecipe) {
    this.minLowerCabinetGrade = game.craft.minLowerCabinetGrade;
    this.minUpperCabinetGrade = game.craft.minUpperCabinetGrade;
  }

  @Field(() => Number)
  minUpperCabinetGrade: number;

  @Field(() => Number)
  minLowerCabinetGrade: number;
}

@ObjectType()
export class Rarity {
  constructor(rom: number, junk: number) {
    this.rom = rom;
    this.junk = junk;
  }

  @Field(() => Number)
  rom: number;

  @Field(() => Number)
  junk: number;
}

@ObjectType()
export class Help {
  constructor(description: string, howTo: string) {
    this.description = description;
    this.howTo = howTo;
  }
  @Field(() => String)
  description: string;

  @Field(() => String)
  howTo: string;
}
