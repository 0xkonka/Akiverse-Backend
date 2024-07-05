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
describe("rovi game start", () => {
  const request = `
  mutation RoviGameStart($input: RoviGameStartInput!) {
    roviGameStart(input: $input) {
      playToken
    }
  }
  `;
  test("success", async () => {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          data: "hoge",
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.data.roviGameStart.playToken).toEqual("test_token");
  });
  test("parameter error", async () => {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          data: "",
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    const parsed = JSON.parse(JSON.stringify(result));
    expectGraphqlError(parsed as ExecutionResult, "INVALID_ARGUMENT");
  });
});
