import { GameId, games } from "./games";
import { ArcadePartCategory } from "@prisma/client";
import { Metadata } from "../models/metadata";
import { NotFoundUseCaseError } from "../use_cases/errors";

type BaseArcadePartType<
  Category extends ArcadePartCategory,
  SubCategory extends string,
> = {
  subCategory: SubCategory;
  category: Category;
  name: string;
  description: string;
  imageUrl: string;
  animationUrl: string;
  externalUrl: string;
  junk: {
    // APに変えるために必要なJunkの数
    junksPerPart: number;
    imageUrl: string;
    rarity: number;
  };
  order: number; //同じカテゴリ内での並び順
  rarity: number;
};

export type ArcadePartTypeId = {
  category: ArcadePartCategory;
  subCategory: string;
};

function getCategoryName(category: ArcadePartCategory): string {
  switch (category) {
    case ArcadePartCategory.ROM:
      return "Rom";
    case ArcadePartCategory.ACCUMULATOR:
      return "Accumulator";
    case ArcadePartCategory.UPPER_CABINET:
      return "Upper Cabinet";
    case ArcadePartCategory.LOWER_CABINET:
      return "Lower Cabinet";
  }
}

// ROM画像 制作会社別に定義
const romImages = {
  DEFAULT: {
    imageUrl: "https://assets.akiverse.io/arcadeparts/rom-cubes/purple.png",
    animationUrl: "https://assets.akiverse.io/arcadeparts/rom-cubes/purple.mp4",
  },
  TORNYADE_GAMES: {
    imageUrl: "https://assets.akiverse.io/arcadeparts/rom-cubes/tornyade.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/rom-cubes/tornyade.mp4",
  },
};

// ROM
// nameはGameTypeと同じ
export type Rom = BaseArcadePartType<"ROM", GameId>;

export const roms: Record<GameId, Rom> = {
  BUBBLE_ATTACK: {
    subCategory: games.BUBBLE_ATTACK.id,
    category: ArcadePartCategory.ROM,
    name: games.BUBBLE_ATTACK.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 1,
    rarity: 1,
  },
  STAR_GUARDIAN: {
    subCategory: games.STAR_GUARDIAN.id,
    category: ArcadePartCategory.ROM,
    name: games.STAR_GUARDIAN.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 2,
    rarity: 1,
  },
  CURVE_BALL_3D: {
    subCategory: games.CURVE_BALL_3D.id,
    category: ArcadePartCategory.ROM,
    name: games.CURVE_BALL_3D.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 3,
    rarity: 1,
  },
  YUMMY_JUMP: {
    subCategory: games.YUMMY_JUMP.id,
    category: ArcadePartCategory.ROM,
    name: games.YUMMY_JUMP.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 4,
    rarity: 1,
  },
  CYBER_PINBALL: {
    subCategory: games.CYBER_PINBALL.id,
    category: ArcadePartCategory.ROM,
    name: games.CYBER_PINBALL.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 5,
    rarity: 1,
  },
  NEON_BLITZ: {
    subCategory: games.NEON_BLITZ.id,
    category: ArcadePartCategory.ROM,
    name: games.NEON_BLITZ.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 6,
    rarity: 1,
  },
  SUPER_SNAKE: {
    subCategory: games.SUPER_SNAKE.id,
    category: ArcadePartCategory.ROM,
    name: games.SUPER_SNAKE.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 7,
    rarity: 1,
  },
  NEON_PONG: {
    subCategory: games.NEON_PONG.id,
    category: ArcadePartCategory.ROM,
    name: games.NEON_PONG.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 1,
    },
    order: 8,
    rarity: 1,
  },
  MYTHIC_MATCH: {
    subCategory: games.MYTHIC_MATCH.id,
    category: ArcadePartCategory.ROM,
    name: games.MYTHIC_MATCH.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 2,
    },
    order: 9,
    rarity: 2,
  },
  AKIBA_FC: {
    subCategory: games.AKIBA_FC.id,
    category: ArcadePartCategory.ROM,
    name: games.AKIBA_FC.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 2,
    },
    order: 10,
    rarity: 2,
  },
  NEON_SNAP: {
    subCategory: games.NEON_SNAP.id,
    category: ArcadePartCategory.ROM,
    name: games.NEON_SNAP.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 2,
    },
    order: 10,
    rarity: 2,
  },
  NINJA_GO_GO: {
    subCategory: games.NINJA_GO_GO.id,
    category: ArcadePartCategory.ROM,
    name: games.NINJA_GO_GO.name,
    ...romImages.TORNYADE_GAMES,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 2,
    },
    order: 11,
    rarity: 2,
  },
  MYTHIC_SWING: {
    subCategory: games.MYTHIC_SWING.id,
    category: ArcadePartCategory.ROM,
    name: games.MYTHIC_SWING.name,
    ...romImages.DEFAULT,
    externalUrl: "",
    description: "",
    junk: {
      junksPerPart: 10,
      imageUrl: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
      rarity: 2,
    },
    order: 12,
    rarity: 2,
  },
};

// Accumulator
// https://www.notion.so/Craft-System-fdccc1a29dd04fca8cff173c4c69d188#9987c39325274529b8dac4f420930ea6

export type AccumulatorId =
  | "HOKUTO_100_LX"
  | "HOKUTO_120_LX"
  | "HOKUTO_140_LX"
  | "RYGEN_NA_1"
  | "RYGEN_NA_2"
  | "RYGEN_NA_3"
  | "RYGEN_NB_1"
  | "YAMABIKO_2200"
  | "YAMABIKO_4400"
  | "YAMABIKO_6600";

export type Accumulator = BaseArcadePartType<"ACCUMULATOR", AccumulatorId> & {
  name: string;
  tankCapacity: number;
  extractableEnergy: number;
  group: number;
};

export const accumulators: Record<AccumulatorId, Accumulator> = {
  HOKUTO_100_LX: {
    subCategory: "HOKUTO_100_LX",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Hokuto100LX",
    description:
      "An Accumulator manufactured by HOKUTO that has a high absorption rate of Sparklium and stable performance. HOKUTO is an electronics manufacturer leading the market share and has a reputation for its quality, durability, and connectivity to all types of Arcade Machines (AMs).",
    tankCapacity: 100_000,
    extractableEnergy: 20_000,
    group: 1,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/hokuto_100_lx.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/hokuto_100_lx.mp4",
    externalUrl: "",
    junk: {
      junksPerPart: 10,
      imageUrl:
        "https://assets.akiverse.io/arcadeparts/junks/accumulator-rarity-1.png",
      rarity: 1,
    },
    order: 1,
    rarity: 1,
  },
  HOKUTO_120_LX: {
    subCategory: "HOKUTO_120_LX",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Hokuto120LX",
    description: "",
    tankCapacity: 120_000,
    extractableEnergy: 20_000,
    group: 1,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/hokuto_120_lx.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/hokuto_120_lx.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 2,
    rarity: 1,
  },
  HOKUTO_140_LX: {
    subCategory: "HOKUTO_140_LX",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Hokuto140LX",
    description: "",
    tankCapacity: 140_000,
    extractableEnergy: 20_000,
    group: 1,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/hokuto_140_lx.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/hokuto_140_lx.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 3,
    rarity: 1,
  },
  RYGEN_NA_1: {
    subCategory: "RYGEN_NA_1",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Rygen NA1",
    description:
      "Rygen Generation - the long-established Accumulator production company, has put in all of its resources to develop the new Rygen series. In the SparkMark test that was disclosed, it is said that the performance has improved by 150% compared to the former product.",
    tankCapacity: 100_000,
    extractableEnergy: 30_000,
    group: 2,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_na_1.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_na_1.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 4,
    rarity: 1,
  },
  RYGEN_NA_2: {
    subCategory: "RYGEN_NA_2",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Rygen NA2",
    description: "",
    tankCapacity: 120_000,
    extractableEnergy: 30_000,
    group: 2,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_na_2.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_na_2.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 5,
    rarity: 1,
  },
  RYGEN_NA_3: {
    subCategory: "RYGEN_NA_3",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Rygen NA3",
    description: "",
    tankCapacity: 150_000,
    extractableEnergy: 30_000,
    group: 2,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_na_3.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_na_3.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 6,
    rarity: 1,
  },
  RYGEN_NB_1: {
    subCategory: "RYGEN_NB_1",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Rygen NB1",
    description: "",
    tankCapacity: 80_000,
    extractableEnergy: 30_000,
    group: 2,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_nb_1.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/rygen_nb_1.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 7,
    rarity: 1,
  },
  YAMABIKO_2200: {
    subCategory: "YAMABIKO_2200",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Yamabiko 2200",
    description:
      "An Accumulator from EchoDen. EchoDen has had a strong fan base for a very long period of time because of its trustworthiness and sincere craftsmanship. While the Accumulator has a very basic structure, the company continues to improve the small little details to maximize its performance to compete with other companies.",
    tankCapacity: 110_000,
    extractableEnergy: 40_000,
    group: 3,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/yamabiko_2200.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/yamabiko_2200.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 8,
    rarity: 1,
  },
  YAMABIKO_4400: {
    subCategory: "YAMABIKO_4400",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Yamabiko 4400",
    description: "",
    tankCapacity: 130_000,
    extractableEnergy: 40_000,
    group: 3,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/yamabiko_4400.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/yamabiko_4400.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 9,
    rarity: 1,
  },
  YAMABIKO_6600: {
    subCategory: "YAMABIKO_6600",
    category: ArcadePartCategory.ACCUMULATOR,
    name: "Yamabiko 6600",
    description: "",
    tankCapacity: 150_000,
    extractableEnergy: 40_000,
    group: 3,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/yamabiko_6600.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/accumulators/yamabiko_6600.mp4",
    externalUrl: "",
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
    order: 10,
    rarity: 1,
  },
};
// Cabinet
//www.notion.so/Craft-System-fdccc1a29dd04fca8cff173c4c69d188#da10caf0dadf4c11bb915cc87fd6c00e

export type CabinetCategoryId =
  | "PLAIN"
  | "MERCURY"
  | "VENUS"
  | "EARTH"
  | "MARS"
  | "JUPITER"
  | "SATURN"
  | "URANUS"
  | "NEPTUNE"
  | "PLUTO";

type CabinetGradeUpInfo = {
  next: CabinetCategoryId;
  percentage: number;
};

type CabinetAbility = {
  name: string;
  grade: number;
  order: number;
  rarity: number;
  gradeUp: CabinetGradeUpInfo;
};

type CabinetAbilities = Record<CabinetCategoryId, CabinetAbility>;

const cabinetAbilities: CabinetAbilities = {
  PLAIN: {
    name: "Plain",
    grade: 1,
    order: 1,
    rarity: 1,
    gradeUp: {
      next: "MERCURY",
      percentage: 50,
    },
  },
  MERCURY: {
    name: "Mercury",
    grade: 2,
    order: 2,
    rarity: 2,
    gradeUp: {
      next: "VENUS",
      percentage: 0,
    },
  },
  VENUS: {
    name: "Venus",
    grade: 3,
    order: 3,
    rarity: 3,
    gradeUp: {
      next: "EARTH",
      percentage: 0,
    },
  },
  EARTH: {
    name: "Earth",
    grade: 4,
    order: 4,
    rarity: 4,
    gradeUp: {
      next: "MARS",
      percentage: 0,
    },
  },
  MARS: {
    name: "Mars",
    grade: 5,
    order: 5,
    rarity: 5,
    gradeUp: {
      next: "JUPITER",
      percentage: 0,
    },
  },
  JUPITER: {
    name: "Jupiter",
    grade: 6,
    order: 6,
    rarity: 6,
    gradeUp: {
      next: "SATURN",
      percentage: 0,
    },
  },
  SATURN: {
    name: "Saturn",
    grade: 7,
    order: 7,
    rarity: 7,
    gradeUp: {
      next: "URANUS",
      percentage: 0,
    },
  },
  URANUS: {
    name: "Uranus",
    grade: 8,
    order: 8,
    rarity: 8,
    gradeUp: {
      next: "NEPTUNE",
      percentage: 0,
    },
  },
  NEPTUNE: {
    name: "Neptune",
    grade: 9,
    order: 9,
    rarity: 9,
    gradeUp: {
      next: "PLUTO",
      percentage: 0,
    },
  },
  PLUTO: {
    name: "Pluto",
    grade: 10,
    order: 10,
    rarity: 10,
    gradeUp: {
      next: "PLUTO",
      percentage: 0,
    },
  },
};

// Upper Cabinet

export type UpperCabinet = BaseArcadePartType<
  "UPPER_CABINET",
  CabinetCategoryId
> &
  CabinetAbility;

export const upperCabinets: Record<CabinetCategoryId, UpperCabinet> = {
  PLAIN: {
    subCategory: "PLAIN",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/01_uc_plain.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/01_uc_plain.mp4",
    externalUrl: "",
    description:
      "The most basic Upper Cabinet model that is made by HOKUTO, the largest Arcade Parts (AP) manufacturer. It has a 26-inch monitor, a full-size control panel and the surface of the body has a film finish that makes it easy to reskin.",
    ...cabinetAbilities.PLAIN,
    junk: {
      junksPerPart: 10,
      imageUrl:
        "https://assets.akiverse.io/arcadeparts/junks/upper-cabinet-rarity-1.png",
      rarity: 1,
    },
  },

  MERCURY: {
    subCategory: "MERCURY",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/02_uc_mercury.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/02_uc_mercury.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.MERCURY,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },

  VENUS: {
    subCategory: "VENUS",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/03_uc_venus.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/03_uc_venus.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.VENUS,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  EARTH: {
    subCategory: "EARTH",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/04_uc_earth.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/04_uc_earth.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.EARTH,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  MARS: {
    subCategory: "MARS",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/05_uc_mars.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/05_uc_mars.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.MARS,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  JUPITER: {
    subCategory: "JUPITER",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/06_uc_jupiter.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/06_uc_jupiter.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.JUPITER,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  SATURN: {
    subCategory: "SATURN",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/07_uc_saturn.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/07_uc_saturn.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.SATURN,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  URANUS: {
    subCategory: "URANUS",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/08_uc_uranus.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/08_uc_uranus.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.URANUS,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  NEPTUNE: {
    subCategory: "NEPTUNE",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/09_uc_neptune.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/09_uc_neptune.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.NEPTUNE,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  PLUTO: {
    subCategory: "PLUTO",
    category: ArcadePartCategory.UPPER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/10_uc_pluto.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/upper-cabinets/10_uc_pluto.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.PLUTO,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
};

// Lower Cabinet

export type LowerCabinet = BaseArcadePartType<
  "LOWER_CABINET",
  CabinetCategoryId
> &
  CabinetAbility;

export const lowerCabinets: Record<CabinetCategoryId, LowerCabinet> = {
  PLAIN: {
    subCategory: "PLAIN",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/01_lc_plain.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/01_lc_plain.mp4",
    externalUrl: "",
    description:
      "The most basic Lower Cabinet model that is made by HOKUTO, the largest Arcade Parts (AP) manufacturer. On the front of the cabinet is a slot panel for users to log in, and on the inside is a connector for the Accumulator, and a power supply unit. As with the Upper Cabinet, the surface of the body has a film finish that makes it easy to reskin.",
    ...cabinetAbilities.PLAIN,
    junk: {
      junksPerPart: 10,
      imageUrl:
        "https://assets.akiverse.io/arcadeparts/junks/lower-cabinet-rarity-1.png",
      rarity: 1,
    },
  },

  MERCURY: {
    subCategory: "MERCURY",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/02_lc_mercury.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/02_lc_mercury.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.MERCURY,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },

  VENUS: {
    subCategory: "VENUS",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/03_lc_venus.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/03_lc_venus.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.VENUS,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  EARTH: {
    subCategory: "EARTH",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/04_lc_earth.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/04_lc_earth.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.EARTH,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  MARS: {
    subCategory: "MARS",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/05_lc_mars.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/05_lc_mars.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.MARS,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  JUPITER: {
    subCategory: "JUPITER",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/06_lc_jupiter.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/06_lc_jupiter.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.JUPITER,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  SATURN: {
    subCategory: "SATURN",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/07_lc_saturn.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/07_lc_saturn.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.SATURN,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  URANUS: {
    subCategory: "URANUS",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/08_lc_uranus.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/08_lc_uranus.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.URANUS,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  NEPTUNE: {
    subCategory: "NEPTUNE",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/09_lc_neptune.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/09_lc_neptune.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.NEPTUNE,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
  PLUTO: {
    subCategory: "PLUTO",
    category: ArcadePartCategory.LOWER_CABINET,
    imageUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/10_lc_pluto.png",
    animationUrl:
      "https://assets.akiverse.io/arcadeparts/cabinets/lower-cabinets/10_lc_pluto.mp4",
    externalUrl: "",
    description: "",
    ...cabinetAbilities.PLUTO,
    junk: { junksPerPart: 10, imageUrl: "", rarity: 1 },
  },
};

export type ArcadePartCategories =
  | Rom
  | Accumulator
  | UpperCabinet
  | LowerCabinet;

export const allParts: ArcadePartTypeId[] = [
  ...Object.values(roms).map(({ category, subCategory }) => ({
    category,
    subCategory,
  })),
  ...Object.values(accumulators).map(({ category, subCategory }) => ({
    category,
    subCategory,
  })),
  ...Object.values(upperCabinets).map(({ category, subCategory }) => ({
    category,
    subCategory,
  })),
  ...Object.values(lowerCabinets).map(({ category, subCategory }) => ({
    category,
    subCategory,
  })),
];

type BaseMetadata = Pick<
  Metadata,
  | "image"
  | "animation_url"
  | "external_url"
  | "attributes"
  | "description"
  | "rarity"
>;

function getBaseMetadata(part: BaseArcadePartType<any, any>): BaseMetadata {
  return {
    image: part.imageUrl,
    animation_url: part.animationUrl,
    external_url: part.externalUrl,
    description: part.description,
    attributes: [
      {
        trait_type: "Type",
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        value: getCategoryName(part.category),
      },
      {
        trait_type: "Name",
        value: part.name,
      },
    ],
    rarity: part.rarity,
  };
}

export function getArcadePartMetadata(
  category: ArcadePartCategory,
  subCategory: string,
): Metadata {
  switch (category) {
    case ArcadePartCategory.ROM:
      return getRomMetadata(subCategory);
    case ArcadePartCategory.ACCUMULATOR:
      return getAccumulatorMetadata(subCategory);
    case ArcadePartCategory.UPPER_CABINET:
      return getUpperCabinetMetadata(subCategory);
    case ArcadePartCategory.LOWER_CABINET:
      return getLowerCabinetMetadata(subCategory);
  }
}

function getRomMetadata(subCategory: string): Metadata {
  const rom = roms[subCategory as GameId];
  if (!rom)
    throw new NotFoundUseCaseError(
      "ArcadePart metadata not found",
      "ArcadePart",
    );
  const base = getBaseMetadata(rom);
  // TODO 個別のAttribute
  return {
    name: `${rom.name} ROM`,
    ...base,
  };
}

function getAccumulatorMetadata(subCategory: string): Metadata {
  const accumulator = accumulators[subCategory as AccumulatorId];
  if (!accumulator)
    throw new NotFoundUseCaseError(
      "ArcadePart metadata not found",
      "ArcadePart",
    );
  const base = getBaseMetadata(accumulator);
  // TODO 個別のAttribute
  return {
    name: `${accumulator.name} Accumulator`,
    ...base,
  };
}

function getUpperCabinetMetadata(subCategory: string): Metadata {
  const upperCabinet = upperCabinets[subCategory as CabinetCategoryId];
  if (!upperCabinet)
    throw new NotFoundUseCaseError(
      "ArcadePart metadata not found",
      "ArcadePart",
    );
  const base = getBaseMetadata(upperCabinet);
  // TODO 個別のAttribute
  return {
    name: `${upperCabinet.name} Upper Cabinet`,
    ...base,
  };
}

function getLowerCabinetMetadata(subCategory: string): Metadata {
  const lowerCabinet = lowerCabinets[subCategory as CabinetCategoryId];
  if (!lowerCabinet)
    throw new NotFoundUseCaseError(
      "ArcadePart metadata not found",
      "ArcadePart",
    );
  const base = getBaseMetadata(lowerCabinet);
  // TODO 個別のAttribute
  return {
    name: `${lowerCabinet.name} Lower Cabinet`,
    ...base,
  };
}

export type JunkMetadata = {
  name: string;
  junksPerPart: number;
  imageUrl: string;
  rarity: number;
};
export function getJunkMetadata(
  category: ArcadePartCategory,
  subCategory: string,
): JunkMetadata {
  let metadata;
  let name;
  switch (category) {
    case "ROM":
      metadata = roms[subCategory as GameId];
      name = `junk ${metadata.name} ROM`;
      break;
    case "ACCUMULATOR":
      metadata = accumulators[subCategory as AccumulatorId];
      name = `junk ${metadata.name} Accumulator`;
      break;
    case "UPPER_CABINET":
      metadata = upperCabinets[subCategory as CabinetCategoryId];
      name = `junk ${metadata.name} Upper Cabinet`;
      break;
    case "LOWER_CABINET":
      metadata = lowerCabinets[subCategory as CabinetCategoryId];
      name = `junk ${metadata.name} Lower Cabinet`;
      break;
  }

  return {
    name: name,
    junksPerPart: metadata.junk.junksPerPart,
    imageUrl: metadata.junk.imageUrl,
    rarity: metadata.rarity,
  };
}
