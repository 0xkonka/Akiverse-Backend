import { ExecutionResult } from "graphql";
import { buildSchemaSync } from "type-graphql";
import { ApolloServerPluginLandingPageLocalDefault } from "apollo-server-core";
import { applyModelsEnhanceMap } from "@generated/type-graphql";
import CustomResolvers from "../../../../../src/apps/server/apis/resolvers";
import {
  GeneratedResolvers,
  modelsEnhanceMap,
} from "../../../../../src/apps/server/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../src/apps/server/auth";
import { ApolloServer } from "apollo-server-express";
import { Context } from "../../../../../src/context";

export function expectGraphqlError(
  graphqlResult: ExecutionResult,
  code: string,
): void {
  expect(graphqlResult.errors).toHaveLength(1);
  expect(graphqlResult.errors![0].extensions["code"]).toBe(code);
}

export const server = async (ctx: () => Promise<Context>) => {
  const schema = schemaInit();

  return new ApolloServer({
    schema,
    csrfPrevention: true,
    context: ctx,
    cache: "bounded",
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      }),
    ],
  });
};

export function schemaInit() {
  GeneratedResolvers.forEach((v) => {
    Service()(v);
  });
  applyModelsEnhanceMap(modelsEnhanceMap);

  return buildSchemaSync({
    resolvers: [...GeneratedResolvers, ...CustomResolvers],
    container: Container,
    authChecker: authChecker,
  });
}
