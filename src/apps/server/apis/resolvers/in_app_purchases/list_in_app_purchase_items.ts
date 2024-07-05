import { Args, Query, Resolver } from "type-graphql";
import { Service } from "typedi";
import { ListInAppPurchaseItemsInput } from "./inputs/list_in_app_purchase_items_input";
import { ListInAppPurchaseItemsOutput } from "./outputs/list_in_app_purchase_items_output";
import { InvalidArgumentResolverError } from "../errors";
import { getInAppPurchaseImageUrl } from "../../../../../helpers/asset_util";
import { listPurchaseItems } from "../../../../../use_cases/in_app_purchases/items";

@Resolver()
@Service()
export default class ListInAppPurchaseItems {
  @Query(() => [ListInAppPurchaseItemsOutput])
  listInAppPurchaseItems(@Args() args: ListInAppPurchaseItemsInput) {
    if (args.os === "IOS") {
      throw new InvalidArgumentResolverError("not implemented");
    }
    return listPurchaseItems().map(
      (v) =>
        new ListInAppPurchaseItemsOutput({
          productId: v.id,
          bonus: v.bonusCount,
          imageUrl: getInAppPurchaseImageUrl(v.variant),
          title: v.title,
          isSale: v.isSale,
          saleTitle: v.saleTitle,
          offerText: v.offerText,
        }),
    );
  }
}
