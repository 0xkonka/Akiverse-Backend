export type TraitType =
  | "Size"
  | "Area"
  | "X Coordinates"
  | "Y Coordinates"
  | "Type"
  | "Name"
  | "Game"
  | "Boost"
  | "Energy"
  | "Max Energy"
  | "Mega Sparked"
  | "Fever Remain"
  | "UC Grade"
  | "LC Grade";

// 参考：https://zenn.dev/hayatoomori/articles/f26cc4637c7d66
// 規格に従ってスネークケースを使用しています
// 一部Akiverse内で利用する専用項目が存在しているため、Handler層で項目のフィルターをしています
// see. src/apps/server/apis/rest_apis/handlers/metadata/abstract_metadata_handler.ts
export type Metadata = {
  name?: string;
  description: string;
  image: string;
  // Akiverse内固有項目
  transparent_image_url?: string;
  // Akiverse内固有(AM専用)
  without_acc_image_url?: string;
  animation_url: string;
  external_url: string;
  attributes: MetadataAttribute[];
  // Akiverse内固有(AP専用)
  rarity?: number;
};

export type StringMetadataAttribute = {
  trait_type: TraitType;
  value: string;
};

export type NumberMetadataAttribute = {
  trait_type: TraitType;
  display_type: "number";
  value: number | bigint;
};

export type MetadataAttribute =
  | StringMetadataAttribute
  | NumberMetadataAttribute;
