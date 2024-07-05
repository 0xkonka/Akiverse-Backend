import "reflect-metadata";

import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import { Container, Service } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import {
  createArcadeMachine,
  createUser,
  eraseDatabase,
} from "../../../../../test_helper";
import { ExtractUseCaseMock } from "../../../../../mock/use_cases/extract_usecase_mock";
import { expectGraphqlError } from "../helper";

const mockUseCase = new ExtractUseCaseMock();
Container.set("extract.useCase", mockUseCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("extract info field resolver", () => {
  const request = `
  query ArcadeMachine($where: ArcadeMachineWhereUniqueInput!) {
    arcadeMachine(where: $where) {
      extractInfo {
        count
        extractCode
      }
    }
  }
  `;
  async function send(id: string): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        where: {
          id: id,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    mockUseCase.reset();
    await eraseDatabase();
  });
  test("success", async () => {
    const amo = await createUser();
    const am = await createArcadeMachine({ userId: amo.id });
    mockUseCase.returnValueForMinNumberOfExtractItems = {
      count: 1,
      extractCode: 1,
    };
    const ret = await send(am.id);
    expect(ret.data).toMatchObject({
      arcadeMachine: { extractInfo: { count: 1, extractCode: 1 } },
    });
  });
  test("raise error", async () => {
    const amo = await createUser();
    const am = await createArcadeMachine({ userId: amo.id });
    mockUseCase.throwErrorForMinNumberOfExtractItems = Error("test");
    const ret = await send(am.id);
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
