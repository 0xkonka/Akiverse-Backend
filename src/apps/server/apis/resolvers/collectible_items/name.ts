import { Service } from "typedi";
import { FieldResolver, Resolver, Root } from "type-graphql";
import { CollectibleItem } from "@generated/type-graphql";
import { getCollectibleItemName } from "../../../../../metadata/collectible_items";

@Service()
@Resolver(() => CollectibleItem)
export default class CollectibleItemNameResolver {
  @FieldResolver(() => String, { nullable: true })
  name(@Root() collectibleItem: CollectibleItem) {
    return getCollectibleItemName(
      collectibleItem.category,
      collectibleItem.subCategory,
    );
  }
}
