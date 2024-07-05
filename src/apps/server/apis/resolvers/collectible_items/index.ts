import { CustomFindManyCollectibleItemsResolver } from "./collectible_items";
import CollectibleItemNameResolver from "./name";

const CustomCollectibleItemResolvers = [
  CustomFindManyCollectibleItemsResolver,
  CollectibleItemNameResolver,
];

export default CustomCollectibleItemResolvers;
