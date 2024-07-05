import "reflect-metadata";

import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import { eraseDatabase } from "../../../../../test_helper";
import { expectGraphqlError } from "../helper";
import { Container } from "typedi";
import { UserUseCaseImpl } from "../../../../../../src/use_cases/user_usecase";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { NFTsUseCaseMock } from "../../../../../mock/use_cases/nfts_usecase_mock";

const mock = new NFTsUseCaseMock();
mock.returnValue = [{ name: "name", tokenId: "tokenID" }];
Container.set("nfts.useCase", mock);
Container.set(
  "user.useCase",
  new UserUseCaseImpl(Container.get("nfts.useCase")),
);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("updateUser", () => {
  const request = `
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      name
      email
    }
  }
  `;
  async function send(extraData = {}): Promise<any> {
    return await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          name: "updated",
          iconType: "IN_WORLD",
          iconSubCategory: "DEFAULT",
          titleSubCategory: "DEFAULT",
          frameSubCategory: "DEFAULT",
          ...extraData,
        },
      },
      contextValue: createMockContext(),
    });
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ret = await send();
    expect(ret).toMatchObject({
      data: {
        updateUser: { name: "updated" },
      },
    });
  });
  test("error", async () => {
    const ret = await send({ name: "" });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
});
