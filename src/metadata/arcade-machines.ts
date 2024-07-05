import {
  ArcadePartCategories,
  Rom,
  Accumulator,
  UpperCabinet,
  LowerCabinet,
} from "./arcade-parts";

import { GameId, games } from "./games";
import { Metadata } from "../models/metadata";
import { NotFoundUseCaseError } from "../use_cases/errors";

type CanCraft<T extends ArcadePartCategories> = (arcadePartsType: T) => boolean;

// ArcadeMachineType
//   nameはGamesと同じ
//
//   レシピについて
//   https://www.notion.so/Craft-System-fdccc1a29dd04fca8cff173c4c69d188#ff86b6024c9146988190ce3d25cd5505
type ArcadeMachineType = {
  id: GameId;
  name: string;
  imageUrl: string;
  transparentImageUrl: string;
  imageUrlWithoutAccumulator: string;
  animationUrl: string;
  externalUrl: string;
  usableParts: {
    rom: CanCraft<Rom>;
    accumulator: CanCraft<Accumulator>;
    upperCabinet: CanCraft<UpperCabinet>;
    lowerCabinet: CanCraft<LowerCabinet>;
  };
};

const assetsBaseUrl = "https://assets.akiverse.io/arcademachines";

export const arcadeMachines: Record<GameId, ArcadeMachineType> = {
  /* TODO
      usablePartsに制限があるGameを追加したときに、
      tests/use_cases/craft_usecase.test.tsにケースを追加してください。
      今はusablePartsのチェック処理がテストできていません。
  * */
  BUBBLE_ATTACK: {
    id: "BUBBLE_ATTACK",
    name: games.BUBBLE_ATTACK.name,
    imageUrl: `${assetsBaseUrl}/bubble-attack.png`,
    transparentImageUrl: `${assetsBaseUrl}/bubble-attack-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/bubble-attack-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/bubble-attack.mp4`,
    externalUrl: `${assetsBaseUrl}/bubble-attack.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "BUBBLE_ATTACK",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  STAR_GUARDIAN: {
    id: "STAR_GUARDIAN",
    name: games.STAR_GUARDIAN.name,
    imageUrl: `${assetsBaseUrl}/star-guardian.png`,
    transparentImageUrl: `${assetsBaseUrl}/star-guardian-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/star-guardian-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/star-guardian.mp4`,
    externalUrl: `${assetsBaseUrl}/star-guardian.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "STAR_GUARDIAN",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  CURVE_BALL_3D: {
    id: "CURVE_BALL_3D",
    name: games.CURVE_BALL_3D.name,
    imageUrl: `${assetsBaseUrl}/curve-ball-3d-white.png`,
    transparentImageUrl: `${assetsBaseUrl}/curve-ball-3d-white-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/curve-ball-3d-white-transparent.png`,
    animationUrl: "",
    externalUrl: `${assetsBaseUrl}/curve-ball-3d-white-external.png`,
    usableParts: {
      // CurveBall3Dはゲームとして無効なのでクラフトできる組み合わせはない
      rom: (): boolean => false,
      accumulator: () => false,
      upperCabinet: () => false,
      lowerCabinet: () => false,
    },
  },
  YUMMY_JUMP: {
    id: "YUMMY_JUMP",
    name: games.YUMMY_JUMP.name,
    imageUrl: `${assetsBaseUrl}/yummy-jump.png`,
    transparentImageUrl: `${assetsBaseUrl}/yummy-jump-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/yummy-jump-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/yummy-jump.mp4`,
    externalUrl: `${assetsBaseUrl}/yummy-jump.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "YUMMY_JUMP",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  CYBER_PINBALL: {
    id: "CYBER_PINBALL",
    name: games.CYBER_PINBALL.name,
    imageUrl: `${assetsBaseUrl}/cyber-pinball.png`,
    transparentImageUrl: `${assetsBaseUrl}/cyber-pinball-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/cyber-pinball-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/cyber-pinball.mp4`,
    externalUrl: `${assetsBaseUrl}/cyber-pinball.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "CYBER_PINBALL",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  NEON_BLITZ: {
    id: "NEON_BLITZ",
    name: games.NEON_BLITZ.name,
    imageUrl: `${assetsBaseUrl}/neon-blitz.png`,
    transparentImageUrl: `${assetsBaseUrl}/neon-blitz-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/neon-blitz-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/neon-blitz.mp4`,
    externalUrl: `${assetsBaseUrl}/neon-blitz.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "NEON_BLITZ",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  SUPER_SNAKE: {
    id: "SUPER_SNAKE",
    name: games.SUPER_SNAKE.name,
    imageUrl: `${assetsBaseUrl}/super-snake.png`,
    transparentImageUrl: `${assetsBaseUrl}/super-snake-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/super-snake-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/super-snake.mp4`,
    externalUrl: `${assetsBaseUrl}/super-snake.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "SUPER_SNAKE",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  NEON_PONG: {
    id: "NEON_PONG",
    name: games.NEON_PONG.name,
    imageUrl: `${assetsBaseUrl}/neon-pong.png`,
    transparentImageUrl: `${assetsBaseUrl}/neon-pong-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/neon-pong-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/neon-pong.mp4`,
    externalUrl: `${assetsBaseUrl}/neon-pong.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "NEON_PONG",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: () => true,
    },
  },
  MYTHIC_MATCH: {
    id: "MYTHIC_MATCH",
    name: games.MYTHIC_MATCH.name,
    imageUrl: `${assetsBaseUrl}/mythic-match.png`,
    transparentImageUrl: `${assetsBaseUrl}/mythic-match-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/mythic-match-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/mythic-match.mp4`,
    externalUrl: `${assetsBaseUrl}/mythic-match.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "MYTHIC_MATCH",
      accumulator: () => true,
      upperCabinet: (uc) => uc.grade >= 2,
      lowerCabinet: () => true,
    },
  },
  AKIBA_FC: {
    id: "AKIBA_FC",
    name: games.AKIBA_FC.name,
    imageUrl: `${assetsBaseUrl}/akiba-fc.png`,
    transparentImageUrl: `${assetsBaseUrl}/akiba-fc-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/akiba-fc-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/akiba-fc.mp4`,
    externalUrl: `${assetsBaseUrl}/akiba-fc.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "AKIBA_FC",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: (lc) => lc.grade >= 2,
    },
  },
  NEON_SNAP: {
    id: "NEON_SNAP",
    name: games.NEON_SNAP.name,
    imageUrl: `${assetsBaseUrl}/neon-snap.png`,
    transparentImageUrl: `${assetsBaseUrl}/neon-snap-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/neon-snap-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/neon-snap.mp4`,
    externalUrl: `${assetsBaseUrl}/neon-snap.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "NEON_SNAP",
      accumulator: () => true,
      upperCabinet: () => true,
      lowerCabinet: (lc) => lc.grade >= 2,
    },
  },
  NINJA_GO_GO: {
    id: "NINJA_GO_GO",
    name: games.NINJA_GO_GO.name,
    imageUrl: `${assetsBaseUrl}/ninja-go-go.png`,
    transparentImageUrl: `${assetsBaseUrl}/ninja-go-go-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/ninja-go-go-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/ninja-go-go.mp4`,
    externalUrl: `${assetsBaseUrl}/ninja-go-go.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "NINJA_GO_GO",
      accumulator: () => true,
      upperCabinet: (uc) => uc.grade >= 2,
      lowerCabinet: () => true,
    },
  },
  MYTHIC_SWING: {
    id: "MYTHIC_SWING",
    name: games.MYTHIC_SWING.name,
    imageUrl: `${assetsBaseUrl}/mythic-swing.png`,
    transparentImageUrl: `${assetsBaseUrl}/mythic-swing-transparent.png`,
    imageUrlWithoutAccumulator: `${assetsBaseUrl}/mythic-swing-without-acc.png`,
    animationUrl: `${assetsBaseUrl}/mythic-swing.mp4`,
    externalUrl: `${assetsBaseUrl}/mythic-swing.png`,
    usableParts: {
      rom: (r): boolean => r.subCategory === "MYTHIC_SWING",
      accumulator: () => true,
      upperCabinet: (uc) => uc.grade >= 2,
      lowerCabinet: () => true,
    },
  },
};

export function getArcadeMachineMetadata(gameId: string): Metadata {
  const am = arcadeMachines[gameId as GameId];
  if (!am) {
    throw new NotFoundUseCaseError(
      "ArcadeMachine metadata not found",
      "ArcadeMachine",
    );
  }

  return {
    // TODO Description
    name: am.name,
    description: "",
    image: am.imageUrl,
    transparent_image_url: am.transparentImageUrl,
    without_acc_image_url: am.imageUrlWithoutAccumulator,
    animation_url: am.animationUrl,
    external_url: am.externalUrl,
    attributes: [{ trait_type: "Game", value: am.name }],
  };
}
