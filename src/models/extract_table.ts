import { ArcadePartCategory } from "@prisma/client";
import { InternalServerUseCaseError } from "../use_cases/errors";

export type ExtractCodes =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export type BaseExtractItems = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * baseExtractItem : {
 *   ExtractCode: ExtractItemCount
 * }
 * で定義されている
 */
const extractTableRecords: Record<
  BaseExtractItems,
  Record<ExtractCodes, number>
> = {
  4: {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 1,
    6: 2,
    7: 2,
    8: 3,
    9: 3,
    10: 4,
    11: 5,
    12: 6,
    13: 7,
    14: 8,
    15: 9,
    16: 10,
    17: 11,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  5: {
    1: 1,
    2: 1,
    3: 1,
    4: 1,
    5: 2,
    6: 2,
    7: 3,
    8: 3,
    9: 4,
    10: 5,
    11: 6,
    12: 7,
    13: 8,
    14: 9,
    15: 10,
    16: 11,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  6: {
    1: 1,
    2: 1,
    3: 1,
    4: 2,
    5: 2,
    6: 3,
    7: 3,
    8: 4,
    9: 5,
    10: 6,
    11: 7,
    12: 8,
    13: 9,
    14: 10,
    15: 11,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  7: {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 4,
    8: 5,
    9: 6,
    10: 7,
    11: 8,
    12: 9,
    13: 10,
    14: 11,
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  8: {
    1: 1,
    2: 1,
    3: 2,
    4: 2,
    5: 3,
    6: 4,
    7: 5,
    8: 6,
    9: 7,
    10: 8,
    11: 9,
    12: 10,
    13: 11,
    14: 12,
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  9: {
    1: 1,
    2: 1,
    3: 2,
    4: 3,
    5: 4,
    6: 5,
    7: 6,
    8: 7,
    9: 8,
    10: 9,
    11: 10,
    12: 11,
    13: 12,
    14: 12,
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  10: {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    11: 11,
    12: 12,
    13: 12,
    14: 12,
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  11: {
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 7,
    7: 8,
    8: 9,
    9: 10,
    10: 11,
    11: 12,
    12: 12,
    13: 12,
    14: 12,
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
  12: {
    1: 3,
    2: 4,
    3: 5,
    4: 6,
    5: 7,
    6: 8,
    7: 9,
    8: 10,
    9: 11,
    10: 12,
    11: 12,
    12: 12,
    13: 12,
    14: 12,
    15: 12,
    16: 12,
    17: 12,
    18: 12,
    19: 12,
    20: 12,
    21: 12,
    22: 12,
    23: 12,
    24: 12,
  },
};

export function getExtractItemCount(
  code: ExtractCodes,
  base: BaseExtractItems,
): number | undefined {
  const bases = extractTableRecords[base];
  return bases[code];
}

// base data
// https://docs.google.com/spreadsheets/d/1B9-xLG4bZ36DHaB4BYy1C6S-3732ZFnT/edit#gid=1502989578
// まだROMが実装されていない物や消耗品のような現時点で存在しないものが未設定
// そのためRecord型ではなくMapで定義
const ExtractPriorityOfArcadePartMap = new Map<string, number>([
  // ROM
  [makeExtractPriorityKey("ROM", "BUBBLE_ATTACK"), 510],
  [makeExtractPriorityKey("ROM", "CURVE_BALL_3D"), 511],
  [makeExtractPriorityKey("ROM", "STAR_GUARDIAN"), 512],
  [makeExtractPriorityKey("ROM", "YUMMY_JUMP"), 513],
  [makeExtractPriorityKey("ROM", "CYBER_PINBALL"), 514],
  [makeExtractPriorityKey("ROM", "NEON_BLITZ"), 515],
  [makeExtractPriorityKey("ROM", "SUPER_SNAKE"), 516],
  [makeExtractPriorityKey("ROM", "NEON_PONG"), 517],
  [makeExtractPriorityKey("ROM", "MYTHIC_MATCH"), 518],
  [makeExtractPriorityKey("ROM", "AKIBA_FC"), 519],
  [makeExtractPriorityKey("ROM", "NEON_SNAP"), 520],
  [makeExtractPriorityKey("ROM", "NINJA_GO_GO"), 521],
  [makeExtractPriorityKey("ROM", "MYTHIC_SWING"), 522],

  // ACC
  [makeExtractPriorityKey("ACCUMULATOR", "HOKUTO_100_LX"), 100],
  [makeExtractPriorityKey("ACCUMULATOR", "HOKUTO_120_LX"), 110],
  [makeExtractPriorityKey("ACCUMULATOR", "HOKUTO_140_LX"), 120],
  [makeExtractPriorityKey("ACCUMULATOR", "RYGEN_NA_1"), 101],
  [makeExtractPriorityKey("ACCUMULATOR", "RYGEN_NA_2"), 111],
  [makeExtractPriorityKey("ACCUMULATOR", "RYGEN_NA_3"), 121],
  [makeExtractPriorityKey("ACCUMULATOR", "RYGEN_NB_1"), 130],
  [makeExtractPriorityKey("ACCUMULATOR", "YAMABIKO_2200"), 102],
  [makeExtractPriorityKey("ACCUMULATOR", "YAMABIKO_4400"), 112],
  [makeExtractPriorityKey("ACCUMULATOR", "YAMABIKO_6600"), 122],

  // Upper Cabinet
  [makeExtractPriorityKey("UPPER_CABINET", "PLAIN"), 50],
  [makeExtractPriorityKey("UPPER_CABINET", "MERCURY"), 52],
  [makeExtractPriorityKey("UPPER_CABINET", "VENUS"), 54],
  [makeExtractPriorityKey("UPPER_CABINET", "EARTH"), 56],
  [makeExtractPriorityKey("UPPER_CABINET", "MARS"), 58],
  [makeExtractPriorityKey("UPPER_CABINET", "JUPITER"), 60],
  [makeExtractPriorityKey("UPPER_CABINET", "SATURN"), 62],
  [makeExtractPriorityKey("UPPER_CABINET", "URANUS"), 64],
  [makeExtractPriorityKey("UPPER_CABINET", "NEPTUNE"), 66],
  [makeExtractPriorityKey("UPPER_CABINET", "PLUTO"), 68],

  // Lower Cabinet
  [makeExtractPriorityKey("LOWER_CABINET", "PLAIN"), 51],
  [makeExtractPriorityKey("LOWER_CABINET", "MERCURY"), 53],
  [makeExtractPriorityKey("LOWER_CABINET", "VENUS"), 55],
  [makeExtractPriorityKey("LOWER_CABINET", "EARTH"), 57],
  [makeExtractPriorityKey("LOWER_CABINET", "MARS"), 59],
  [makeExtractPriorityKey("LOWER_CABINET", "JUPITER"), 61],
  [makeExtractPriorityKey("LOWER_CABINET", "SATURN"), 63],
  [makeExtractPriorityKey("LOWER_CABINET", "URANUS"), 65],
  [makeExtractPriorityKey("LOWER_CABINET", "NEPTUNE"), 67],
  [makeExtractPriorityKey("LOWER_CABINET", "PLUTO"), 69],
]);
const ExtractPriorityOfJunkPartMap = new Map<string, number>([
  // ROM
  [makeExtractPriorityKey("ROM", "BUBBLE_ATTACK"), 20],
  [makeExtractPriorityKey("ROM", "CURVE_BALL_3D"), 21],
  [makeExtractPriorityKey("ROM", "STAR_GUARDIAN"), 22],
  [makeExtractPriorityKey("ROM", "YUMMY_JUMP"), 23],
  [makeExtractPriorityKey("ROM", "CYBER_PINBALL"), 24],
  [makeExtractPriorityKey("ROM", "NEON_BLITZ"), 25],
  [makeExtractPriorityKey("ROM", "SUPER_SNAKE"), 26],
  [makeExtractPriorityKey("ROM", "NEON_PONG"), 27],
  [makeExtractPriorityKey("ROM", "MYTHIC_MATCH"), 28],
  [makeExtractPriorityKey("ROM", "AKIBA_FC"), 29],
  [makeExtractPriorityKey("ROM", "NEON_SNAP"), 30],
  [makeExtractPriorityKey("ROM", "NINJA_GO_GO"), 31],
  [makeExtractPriorityKey("ROM", "MYTHIC_SWING"), 32],

  // ACC
  [makeExtractPriorityKey("ACCUMULATOR", "HOKUTO_100_LX"), 3],

  // Upper Cabinet
  [makeExtractPriorityKey("UPPER_CABINET", "PLAIN"), 2],

  // Lower Cabinet
  [makeExtractPriorityKey("LOWER_CABINET", "PLAIN"), 1],
]);

function makeExtractPriorityKey(
  category: ArcadePartCategory,
  subCategory: string,
): string {
  return `${category}-${subCategory}`;
}
export function getExtractPriority(
  isJunk: boolean,
  category: ArcadePartCategory,
  subCategory: string,
): number {
  if (isJunk) {
    const n = ExtractPriorityOfJunkPartMap.get(
      makeExtractPriorityKey(category, subCategory),
    );
    if (!n) {
      throw new InternalServerUseCaseError(
        `Extract priority not exists. type: Junk. key: ${makeExtractPriorityKey(
          category,
          subCategory,
        )}`,
      );
    }
    return n;
  } else {
    const n = ExtractPriorityOfArcadePartMap.get(
      makeExtractPriorityKey(category, subCategory),
    );
    if (!n) {
      throw new InternalServerUseCaseError(
        `Extract priority not exists. type: ArcadePart. key: ${makeExtractPriorityKey(
          category,
          subCategory,
        )}`,
      );
    }
    return n;
  }
}
