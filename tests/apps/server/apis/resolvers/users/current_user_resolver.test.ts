import "reflect-metadata";

import { eraseDatabase } from "../../../../../test_helper";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import {
  authChecker,
  authFailChecker,
  userLockedChecker,
} from "../../../../../mock/auth_checker";
import resolvers from "../../../../../../src/apps/server/apis/resolvers";
import { ExecutionResult, graphql, GraphQLSchema } from "graphql";
import { Context } from "../../../../../../src/context";
import {
  createLockedMockContext,
  createMockContext,
  createMockContextNonAuth,
} from "../../../../../mock/context";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { expectGraphqlError } from "../helper";

dayjs.extend(timezone);
dayjs.extend(utc);

const authSuccessSchema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

const authFailSchema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authFailChecker,
});

const userLockedSchema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: userLockedChecker,
});

describe("currentUser", () => {
  const request = `
  query CurrentUser {
    currentUser {
      id
      createdAt
      name
      email
      walletAddress
      akirBalance
      akvBalance
    }
  }
  `;
  async function send(schema: GraphQLSchema, ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("context.user exists", async () => {
    const ctx = await createMockContext();
    const ret = await send(authSuccessSchema, ctx);
    expect(ret.data.currentUser.id).toBe(ctx.userId);
  });
  test("context.user not exists", async () => {
    const ctx = await createMockContextNonAuth();
    const ret = await send(authFailSchema, ctx);
    expectGraphqlError(ret as ExecutionResult, "UNAUTHENTICATED");
  });
  test("context.user user locked", async () => {
    const ctx = await createLockedMockContext();
    const ret = await send(userLockedSchema, ctx);
    expectGraphqlError(ret as ExecutionResult, "USER_LOCKED");
  });
});
