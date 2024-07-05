import { GameCenterArea, GameCenterSize } from "@prisma/client";
import { Metadata } from "../models/metadata";

type HasIdAndName<Id extends string> = { id: Id; name: string };

type Area = HasIdAndName<GameCenterArea>;

const areas: Record<GameCenterArea, Area> = {
  AKIHABARA: {
    id: GameCenterArea.AKIHABARA,
    name: "Akihabara",
  },
  SHIBUYA: {
    id: GameCenterArea.SHIBUYA,
    name: "Shibuya",
  },
};

type Size = Readonly<HasIdAndName<GameCenterSize> & { capacity: number }>;

const sizes: Record<GameCenterSize, Size> = {
  SMALL: {
    id: GameCenterSize.SMALL,
    name: "Small",
    capacity: 4,
  },
  MEDIUM: {
    id: GameCenterSize.MEDIUM,
    name: "Medium",
    capacity: 16,
  },
  LARGE: {
    id: GameCenterSize.LARGE,
    name: "Large",
    capacity: 64,
  },
};

export function getCapacity(size: GameCenterSize): number {
  const v = sizes[size];
  return v.capacity;
}

const gameCenterMetadataDescription =
  "Game Centers (GC) are rare digital pieces of real estate where players come to play on Arcade Machines (AM). Once you become an owner, you can start generating income by leasing out space to AM Owners of your choice. You can even provide your own AMs to cut out the middleman. GCs come in three sizes: small (4 AM), medium (16 AM) and large (64 AM).\n\nEach GC is a unique, Non-Fungible Token (ERC-721) on the Polygon network of the Ethereum blockchain.";

const imageUrlSuffix = ".png";
const animationUrlSuffix = ".mp4";
const externalUrlSuffix = ".png";
const transparentImageUrlSuffix = "-transparent.png";

export function getGameCenterMetadata(
  areaId: GameCenterArea,
  sizeId: GameCenterSize,
): Metadata {
  const area = areas[areaId];
  const size = sizes[sizeId];

  // create url base
  const urlBase =
    "https://assets.akiverse.io/gamecenters/" +
    area.name.toLowerCase() +
    "/" +
    size.name.toLowerCase();

  return {
    description: gameCenterMetadataDescription,
    image: urlBase + imageUrlSuffix,
    animation_url: urlBase + animationUrlSuffix,
    external_url: urlBase + externalUrlSuffix,
    transparent_image_url: urlBase + transparentImageUrlSuffix,
    attributes: [
      { trait_type: "Size", value: size.name },
      { trait_type: "Area", value: area.name },
    ],
  };
}
