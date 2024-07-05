import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { createMockContext } from "../../../../../mock/context";
import { graphql } from "graphql";
import { getPurchaseItem } from "../../../../../../src/use_cases/in_app_purchases/items";
import { getInAppPurchaseImageUrl } from "../../../../../../src/helpers/asset_util";

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
describe("list in app purchase items", () => {
  const request = `
  query ListInAppPurchaseItems($os: OperatingSystem) {
    listInAppPurchaseItems(os: $os) {
      productId
      title
      imageUrl
      bonus
    }
  }
  `;

  async function send(): Promise<any> {
    const ctx = await createMockContext();
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        os: "ANDROID",
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  test("success", async () => {
    const ret = await send();
    for (const item of ret.data.listInAppPurchaseItems) {
      const t = getPurchaseItem(item.productId);

      expect(item).toMatchObject({
        // productIdはセールのIDもあるのでここではチェックしない
        title: t.title,
        bonus: t.bonusCount === undefined ? null : t.bonusCount,
        imageUrl: getInAppPurchaseImageUrl(t.variant),
      });
      expect(item.productId).toMatch(new RegExp(`^${t.id}`));
    }
  });
});

describe("getPurchaseItem", () => {
  test("sale item", () => {
    const normalItem = getPurchaseItem("io.akiverse.arcade.ticket.x50");
    const saleItem = getPurchaseItem("io.akiverse.arcade.ticket.x50.sale");
    const saleOff40Item = getPurchaseItem(
      "io.akiverse.arcade.ticket.x50.sale.off40",
    );
    expect(saleItem).toEqual(normalItem);
    expect(saleOff40Item).toEqual(normalItem);
  });
});
