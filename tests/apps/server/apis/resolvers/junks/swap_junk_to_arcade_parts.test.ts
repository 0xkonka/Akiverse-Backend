import "reflect-metadata";

import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { JunkUseCaseMock } from "../../../../../mock/use_cases/junk_usecase_mock";
import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import { ArcadePart } from "@prisma/client";
import { expectGraphqlError } from "../helper";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  UnhandledUseCaseError,
} from "../../../../../../src/use_cases/errors";

const useCase = new JunkUseCaseMock();
Container.set("junk.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("swap junk to arcade parts", () => {
  const request = `
  mutation SwapJunkToArcadePart($input: SwapJunkToArcadePartsInput!) {
    swapJunkToArcadePart(input: $input) {
      arcadeParts {
        id
      }
    }
  }
  `;

  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          quantity: 1,
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
    const mockData: ArcadePart[] = [];
    mockData.push({
      id: "test",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "test",
      ownerWalletAddress: "test",
      physicalWalletAddress: null,
      state: "IN_AKIVERSE",
      lastBlock: 0,
      lastTransactionIndex: 1,
      category: "ROM",
      subCategory: "BUBBLE_ATTACK",
      destroyedAt: null,
      craftId: null,
      usedJunks: 10,
      createDismantleId: null,
    });
    useCase.returnValueForSwap = mockData;
    const ret = await send();
    expect(ret.data.swapJunkToArcadePart).toMatchObject({
      arcadeParts: [
        {
          id: "test",
        },
      ],
    });
  });
  test("quantity zero", async () => {
    const ret = await send({ quantity: 0 });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("quantity negative number", async () => {
    const ret = await send({ quantity: -1 });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("Illegal State", async () => {
    useCase.throwErrorForSwap = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("Invalid Argument", async () => {
    useCase.throwErrorForSwap = new InvalidArgumentUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("conflict", async () => {
    useCase.throwErrorForSwap = new ConflictUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
  test("unhandled", async () => {
    useCase.throwErrorForSwap = new UnhandledUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
