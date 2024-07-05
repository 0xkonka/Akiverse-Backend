import "reflect-metadata";

import { ArcadePartUseCaseMock } from "../../../../mock/use_cases/arcade_part_usecase_mock";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { resolvers } from "@generated/type-graphql";
import CustomResolvers from "../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../mock/auth_checker";
import { ExecutionResult, graphql } from "graphql";
import { ArcadePartCategory } from "@prisma/client";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  NotFoundUseCaseError,
} from "../../../../../src/use_cases/errors";
import { expectGraphqlError } from "./helper";
import { MetadataUseCaseMock } from "../../../../mock/use_cases/metadata_usecase_mock";
import { createMockContext } from "../../../../mock/context";
import { eraseDatabase } from "../../../../test_helper";

const mockUseCase = new ArcadePartUseCaseMock();
const mockMetadataUseCase = new MetadataUseCaseMock();

Container.set("arcadePart.useCase", mockUseCase);
Container.set("metadata.useCase", mockMetadataUseCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("withdraw", () => {
  const request = `
  mutation WithdrawArcadePart($input: WithdrawArcadePartInput!) {
    withdrawArcadePart(input: $input) {
      id
    }
  }`;

  async function send(): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          ids: ["1"],
        },
      },
      contextValue: await createMockContext(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    await eraseDatabase();
    mockUseCase.reset();
    mockMetadataUseCase.reset();
    mockMetadataUseCase.setDefault();
  });
  test("success", async () => {
    mockUseCase.returnValueForWithdraw = [
      {
        id: "1",
        state: "IN_AKIVERSE",
        createdAt: new Date(),
        updatedAt: new Date(),
        category: ArcadePartCategory.ROM,
        subCategory: "dummy",
        userId: "null",
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        lastBlock: 0,
        lastTransactionIndex: 0,
        destroyedAt: null,
        craftId: null,
        usedJunks: null,
        createDismantleId: null,
      },
    ];
    const ret = await send();
    const withdrawArcadePart = ret.data.withdrawArcadePart;
    expect(withdrawArcadePart[0].id).toBe("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForWithdraw = new NotFoundUseCaseError(
      "test",
      "ArcadePart",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForWithdraw = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("conflict", async () => {
    mockUseCase.throwErrorForWithdraw = new ConflictUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForWithdraw = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});

describe("deposit", () => {
  const request = `
  mutation DepositrcadePart($input: DepositArcadePartInput!) {
    depositArcadePart(input: $input) {
      id
    }
  }`;

  async function send(): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          ids: ["1"],
          hash: "hash",
        },
      },
      contextValue: await createMockContext(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    await eraseDatabase();
    mockUseCase.reset();
    mockMetadataUseCase.reset();
    mockMetadataUseCase.setDefault();
  });
  test("success", async () => {
    mockUseCase.returnValueForDeposit = [
      {
        id: "1",
        state: "MOVING_TO_AKIVERSE",
        createdAt: new Date(),
        updatedAt: new Date(),
        category: ArcadePartCategory.ROM,
        subCategory: "dummy",
        userId: "null",
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        lastBlock: 0,
        lastTransactionIndex: 0,
        destroyedAt: null,
        craftId: null,
        usedJunks: null,
        createDismantleId: null,
      },
    ];
    const ret = await send();
    const depositArcadePart = ret.data.depositArcadePart;
    expect(depositArcadePart[0].id).toBe("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForDeposit = new NotFoundUseCaseError(
      "test",
      "ArcadePart",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForDeposit = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("conflict", async () => {
    mockUseCase.throwErrorForDeposit = new ConflictUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForDeposit = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
