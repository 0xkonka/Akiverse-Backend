import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { MetadataUseCaseImpl } from "../../../../../../src/use_cases/metadata_usecase";
import { graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import { Context } from "../../../../../../src/context";
import { eraseDatabase } from "../../../../../test_helper";

Container.set("metadata.useCase", new MetadataUseCaseImpl());
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});
describe("junk metadata", () => {
  const request = `
  query Junk($where: JunkWhereUniqueInput!) {
    junk(where: $where) {
      metadata {
        name
        image
        junksPerPart
        arcadePartMetadata {
          name
          image
        }
      }
      id
    }
  }
  `;

  async function send(ctx: Context, extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        where: {
          userId_category_subCategory: {
            category: "ROM",
            subCategory: "BUBBLE_ATTACK",
            userId: ctx.userId,
            ...extraData,
          },
        },
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = await createMockContext();
    const junk = await ctx.prisma.junk.create({
      data: {
        userId: ctx.userId!,
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        amount: 1,
      },
    });
    const ret = await send(ctx);
    expect(ret.data.junk).toMatchObject({
      id: junk.id,
      metadata: {
        name: "junk Bubble Attack ROM",
        image: "https://assets.akiverse.io/arcadeparts/junks/rom-rarity-1.png",
        junksPerPart: 10,
        arcadePartMetadata: {
          name: "Bubble Attack ROM",
          image: "https://assets.akiverse.io/arcadeparts/rom-cubes/purple.png",
        },
      },
    });
  });
  test("unknown subCategory", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.junk.create({
      data: {
        userId: ctx.userId!,
        category: "ROM",
        subCategory: "Unknown",
        amount: 1,
      },
    });
    const ret = await send(ctx, { subCategory: "Unknown" });
    expect(ret.errors).toHaveLength(1);
    expect(ret.errors![0].extensions["code"]).toBe("INTERNAL_SERVER_ERROR");
  });
});
