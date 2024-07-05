import { Variant } from "../use_cases/in_app_purchases/items";

const assetBaseUrl = "https://assets.akiverse.io";

export function getInAppPurchaseImageUrl(t: Variant): string {
  return `${assetBaseUrl}/front-end/shop/ticket/${t.toLowerCase()}.png`;
}
