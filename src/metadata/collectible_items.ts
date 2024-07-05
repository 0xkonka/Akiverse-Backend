import { CollectibleItemCategory } from "@prisma/client";

type CollectibleItemType = {
  category: CollectibleItemCategory;
  subCategory: string;
  name: string;
};

type IconId = "DEFAULT" | "YUMMY_JUMP" | "COMMEMORATION_YUMMY_JUMP";

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
};

type TitleId = "DEFAULT" | `EVENT_${string}` | `ONWARD_${string}`;
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
