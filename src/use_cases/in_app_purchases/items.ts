import { InvalidArgumentUseCaseError } from "../errors";
import { OperatingSystem } from "@generated/type-graphql";

export type Variant = "x10" | "x20" | "x50" | "x100" | "x200" | "x500" | "test";

type PurchaseItemId = `io.akiverse.arcade.ticket.${Variant}`;
type PurchaseItemPremiumId =
  `io.akiverse.arcade.ticket.${Variant}.sale.off${number}`;

export type PurchaseItem = {
  id: PurchaseItemId | PurchaseItemPremiumId;
  title: string;
  variant: Variant;
  ticketCount: number;
  bonusCount?: number;
  isSale: boolean;
  saleTitle?: string;
  offerText?: string; // 10% OFF/SALEなど
};

type PurchaseItemNormal = {
  id: PurchaseItemId;
  title: string;
  variant: Variant;
  ticketCount: number;
  bonusCount?: number;
  enabledAndroid: boolean;
  enabledIos: boolean;
};

function makeTicketItem(
  v: Variant,
  ticketCount: number,
  bonusCount: number,
  enabledAndroid: boolean,
  enabledIos: boolean,
): PurchaseItemNormal {
  return {
    id: `io.akiverse.arcade.ticket.${v}`,
    variant: v,
    title: `AKIBA Ticket ${v}`,
    ticketCount: bonusCount > 0 ? ticketCount + bonusCount : ticketCount,
    bonusCount: bonusCount > 0 ? bonusCount : undefined,
    enabledAndroid,
    enabledIos,
  };
}

const PurchaseItems: Record<PurchaseItemId, PurchaseItemNormal> = {
  "io.akiverse.arcade.ticket.test": makeTicketItem("test", 1, 0, false, true),
  "io.akiverse.arcade.ticket.x10": makeTicketItem("x10", 10, 0, false, false),
  "io.akiverse.arcade.ticket.x20": makeTicketItem("x20", 20, 0, true, true),
  "io.akiverse.arcade.ticket.x50": makeTicketItem("x50", 50, 3, true, true),
  "io.akiverse.arcade.ticket.x100": makeTicketItem("x100", 100, 10, true, true),
  "io.akiverse.arcade.ticket.x200": makeTicketItem("x200", 200, 30, true, true),
  "io.akiverse.arcade.ticket.x500": makeTicketItem(
    "x500",
    500,
    100,
    true,
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
  const item = PurchaseItems[itemId as PurchaseItemId];
  if (!item) {
    throw new InvalidArgumentUseCaseError("unknown product id");
  }
  return item;
}

/**
 * 現在販売中の商品リストを返す
 */
export function listPurchaseItems(os: OperatingSystem): PurchaseItem[] {
  const enabledKey =
    os == OperatingSystem.ANDROID ? "enabledAndroid" : "enabledIos";
  const keys = Object.keys(PurchaseItems) as PurchaseItemId[];
  const items: PurchaseItem[] = keys
    .map((key) => PurchaseItems[key])
    .filter((item) => item[enabledKey])
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
  // const x50 = PurchaseItems["io.akiverse.arcade.ticket.x50"];
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
