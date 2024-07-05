import "reflect-metadata";

import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import resolvers from "../../../../../../src/apps/server/apis/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { RoviGameUseCaseMock } from "../../../../../mock/use_cases/rovi_game_usecase_mock";
import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import { expectGraphqlError } from "../helper";

const useCase = new RoviGameUseCaseMock();
Container.set("rovi.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("rovi game finish", () => {
  const request = `
  mutation RoviGameFinish($input: RoviGameFinishInput!) {
    roviGameFinish(input: $input) {
      success
    }
  }
  `;
  beforeEach(() => {
    useCase.returnValueForFinish = false;
  });
  test("success", async () => {
    useCase.returnValueForFinish = true;
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          token: "dummy",
          score: 100,
          duration: 200,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.data.roviGameFinish.success).toBeTruthy();
  });
  test("parameter error", async () => {
    useCase.returnValueForFinish = true;
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          token: "",
          duration: 200,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    const parsed = JSON.parse(JSON.stringify(result));
    expectGraphqlError(parsed as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("useCase error", async () => {
    useCase.returnValueForFinish = false;
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          token: "dummy",
          score: 100,
          duration: 200,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.data.roviGameFinish.success).toBeFalsy();
  });
});
