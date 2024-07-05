import "reflect-metadata";

import { AKVUseCaseMock } from "../../../../../mock/use_cases/currencies/akv_usecase_mock";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new AKVUseCaseMock();
Container.set("currency.akv.useCase", useCase);

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("withdraw akv", () => {
  const request = `
  mutation WithdrawAKV($input: WithdrawAKVInput!) {
    withdrawAKV(input: $input)
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          amount: "1",
          ...extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(() => {
    useCase.reset();
  });

  test("success", async () => {
    const ret = await send();
    expect(ret.data.withdrawAKV).toBeTruthy();
  });
  test("illegal state", async () => {
    useCase.throwErrorForWithdraw = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("invalid argument", async () => {
    useCase.throwErrorForWithdraw = new InvalidArgumentUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("unhandled", async () => {
    useCase.throwErrorForWithdraw = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
