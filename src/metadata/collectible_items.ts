import { CollectibleItemCategory } from "@prisma/client";

type CollectibleItemType = {
  category: CollectibleItemCategory;
  subCategory: string;
  name: string;
};

type NeonBrosColor = "BLUE" | "PURPLE" | "GREEN" | "YELLOW";
type IconId =
  | "DEFAULT"
  | "YUMMY_JUMP"
  | "COMMEMORATION_YUMMY_JUMP"
  | `NEON_BROS_${NeonBrosColor}`
  | "MIA_HEREWEGO";

export const icons: Record<IconId, CollectibleItemType> = {
  DEFAULT: {
    category: CollectibleItemCategory.ICON,
    subCategory: "DEFAULT",
    name: "Default Icon",
  },
  YUMMY_JUMP: {
    category: CollectibleItemCategory.ICON,
    subCategory: "YUMMY_JUMP",
    name: "Yummy Jump",
  },
  COMMEMORATION_YUMMY_JUMP: {
    category: CollectibleItemCategory.ICON,
    subCategory: "COMMEMORATION_YUMMY_JUMP",
    name: "Profile Pic Commemoration YummyJump",
  },
  NEON_BROS_BLUE: {
    category: CollectibleItemCategory.ICON,
    subCategory: "NEON_BROS_BLUE",
    name: "Neon Bros. (Blue)",
  },
  NEON_BROS_PURPLE: {
    category: CollectibleItemCategory.ICON,
    subCategory: "NEON_BROS_PURPLE",
    name: "Neon Bros. (Purple)",
  },
  NEON_BROS_GREEN: {
    category: CollectibleItemCategory.ICON,
    subCategory: "NEON_BROS_GREEN",
    name: "Neon Bros. (Green)",
  },
  NEON_BROS_YELLOW: {
    category: CollectibleItemCategory.ICON,
    subCategory: "NEON_BROS_YELLOW",
    name: "Neon Bros. (Yellow)",
  },
  MIA_HEREWEGO: {
    category: CollectibleItemCategory.ICON,
    subCategory: "MIA_HEREWEGO",
    name: "Mia: Here we Go!",
  },
};

type TitleId =
  | "DEFAULT"
  | `EVENT_${string}`
  | `ONWARD_${string}`
  | "CHAMPION_DEBUT"
  | "ULTIMATE_CHAMPION"
  | "RISING_STAR"
  | "ELITE_PERFORMER"
  | "FAMILY_MEMBER"
  | "ULTIMATE_REGULAR";
export const titles: Record<TitleId, CollectibleItemType> = {
  DEFAULT: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "DEFAULT",
    name: "Marebito",
  },
  ONWARD_COOL_NEWBIE: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "ONWARD_COOL_NEWBIE",
    name: "Cool Newbie",
  },
  EVENT_NIGERIA_202309: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "EVENT_NIGERIA_202309",
    name: "Hello Nigeria!",
  },
  EVENT_BRAZIL_202311: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "EVENT_BRAZIL_202311",
    name: "Hello Brazil!",
  },
  ONWARD_LITTLE_SPARKER: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "ONWARD_LITTLE_SPARKER",
    name: "Little Sparker",
  },
  CHAMPION_DEBUT: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "CHAMPION_DEBUT",
    name: "Champion Debut",
  },
  ULTIMATE_CHAMPION: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "ULTIMATE_CHAMPION",
    name: "Ultimate Champion",
  },
  RISING_STAR: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "RISING_STAR",
    name: "Rising Star",
  },
  ELITE_PERFORMER: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "ELITE_PERFORMER",
    name: "Elite Performer",
  },
  FAMILY_MEMBER: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "FAMILY_MEMBER",
    name: "Family Member",
  },
  ULTIMATE_REGULAR: {
    category: CollectibleItemCategory.TITLE,
    subCategory: "ULTIMATE_REGULAR",
    name: "Ultimate Regular",
  },
};

type FrameId = string;
export const frames: Record<FrameId, CollectibleItemType> = {
  DEFAULT: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "DEFAULT",
    name: "Default",
  },
  HOLY_STAR: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "HOLY_STAR",
    name: "Reward Frame Holy Star",
  },
  ELITE_01: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "ELITE_01",
    name: "Elite Frame 1",
  },
  ELITE_02: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "ELITE_02",
    name: "Elite Frame 2",
  },
  ELITE_03: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "ELITE_03",
    name: "Elite Frame 3",
  },
  CHAMP_01: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "CHAMP_01",
    name: "Champ Frame 1",
  },
  CHAMP_02: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "CHAMP_02",
    name: "Champ Frame 2",
  },
  CHAMP_03: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "CHAMP_03",
    name: "Champ Frame 3",
  },
  CHAMP_04: {
    category: CollectibleItemCategory.FRAME,
    subCategory: "CHAMP_04",
    name: "Champ Frame 4",
  },
};

export function getCollectibleItemName(
  category: CollectibleItemCategory,
  subCategory: string,
): string {
  let name: string | undefined;
  switch (category) {
    case "ICON":
      name = icons[subCategory as IconId]?.name;
      break;
    case "TITLE":
      name = titles[subCategory as TitleId]?.name;
      break;
    case "FRAME":
      name = frames[subCategory as FrameId]?.name;
      break;
  }
  return name;
}
