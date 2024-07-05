import { InvalidArgumentUseCaseError } from "../errors";

export type Variant = "x10" | "x20" | "x50" | "x100" | "x200" | "x500";

type AndroidPurchaseItemId = `io.akiverse.arcade.ticket.${Variant}`;
type AndroidPurchaseItemPremiumId =
  `io.akiverse.arcade.ticket.${Variant}.sale.off${number}`;

export type PurchaseItem = {
  id: AndroidPurchaseItemId | AndroidPurchaseItemPremiumId;
  title: string;
  variant: Variant;
  ticketCount: number;
  bonusCount?: number;
  isSale: boolean;
  saleTitle?: string;
  offerText?: string; // 10% OFF/SALEなど
};

type PurchaseItemNormal = {
  id: AndroidPurchaseItemId;
  title: string;
  variant: Variant;
  ticketCount: number;
  bonusCount?: number;
  enabled: boolean;
};

function makeAndroidTicketItem(
  v: Variant,
  ticketCount: number,
  bonusCount: number,
  enabled: boolean,
): PurchaseItemNormal {
  return {
    id: `io.akiverse.arcade.ticket.${v}`,
    variant: v,
    title: `AKIBA Ticket ${v}`,
    ticketCount: bonusCount > 0 ? ticketCount + bonusCount : ticketCount,
    bonusCount: bonusCount > 0 ? bonusCount : undefined,
    enabled: enabled,
  };
}

const AndroidPurchaseItems: Record<AndroidPurchaseItemId, PurchaseItemNormal> =
  {
    "io.akiverse.arcade.ticket.x10": makeAndroidTicketItem("x10", 10, 0, false),
    "io.akiverse.arcade.ticket.x20": makeAndroidTicketItem("x20", 20, 0, true),
    "io.akiverse.arcade.ticket.x50": makeAndroidTicketItem("x50", 50, 3, true),
    "io.akiverse.arcade.ticket.x100": makeAndroidTicketItem(
      "x100",
      100,
      10,
      true,
    ),
    "io.akiverse.arcade.ticket.x200": makeAndroidTicketItem(
      "x200",
      200,
      30,
      true,
    ),
    "io.akiverse.arcade.ticket.x500": makeAndroidTicketItem(
      "x500",
      500,
      100,
      true,
    ),
  };

/**
 * セール中のアイテムを判断して実際のItemの内容を返す
 * @param id
 */
export function getPurchaseItem(id: string) {
  // sale商品は必ず通常商品の後ろに.saleがつくので、.sale以降を消すことで元になる商品を特定する
  const salePosition = id.indexOf(".sale");
  let itemId = id;
  if (salePosition > 0) {
    // セール商品
    itemId = id.substring(0, salePosition);
  }
  const item = AndroidPurchaseItems[itemId as AndroidPurchaseItemId];
  if (!item) {
    throw new InvalidArgumentUseCaseError("unknown product id");
  }
  return item;
}

/**
 * 現在販売中の商品リストを返す
 */
export function listPurchaseItems(): PurchaseItem[] {
  const keys = Object.keys(AndroidPurchaseItems) as AndroidPurchaseItemId[];
  const items: PurchaseItem[] = keys
    .map((key) => AndroidPurchaseItems[key])
    .filter((item) => item.enabled)
    .map((i) => {
      return {
        id: i.id,
        title: i.title,
        variant: i.variant,
        ticketCount: i.ticketCount,
        bonusCount: i.bonusCount,
        isSale: false,
      };
    });
  // セール品をここで個別に追加する
  // // 40%Off アプリリリース記念セール
  // const x50 = AndroidPurchaseItems["io.akiverse.arcade.ticket.x50"];
  // items.push({
  //   id: `${x50.id}.sale.off40`,
  //   title: x50.title,
  //   variant: x50.variant,
  //   ticketCount: x50.ticketCount,
  //   bonusCount: x50.bonusCount,
  //   isSale: true,
  //   saleTitle: "App Release Commemorative",
  //   offerText: "40%OFF",
  // });

  return items;
}
