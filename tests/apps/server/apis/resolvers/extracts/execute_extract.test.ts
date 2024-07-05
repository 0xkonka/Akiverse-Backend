import "reflect-metadata";

import { ExtractUseCaseMock } from "../../../../../mock/use_cases/extract_usecase_mock";
import { Container, Service } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { Context } from "vm";
import { ExecutionResult, graphql } from "graphql";
import { ArcadePart, Junk } from "@prisma/client";
import { createMockContext } from "../../../../../mock/context";
import {
  ConflictUseCaseError,
  ExtractItemInsufficientUseCaseError,
  IllegalStateUseCaseError,
  InternalServerUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
  StateChangeUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new ExtractUseCaseMock();
Container.set("extract.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
describe("execute extract", () => {
  beforeEach(() => {
    useCase.reset();
  });
  const request = `
  mutation ExecuteExtract($input: ExecuteExtractInput!) {
    executeExtract(input: $input) {
      ... on Junk {
        id
        category
        subCategory
        amount
      }
      ... on ArcadePart {
        id
        userId
        state
        category
        subCategory
      }
    }
  }
  `;

  async function send(ctx: Context, extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          arcadeMachineId: "id1",
          extractCode: 1,
          ...extraData,
        },
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  describe("success", () => {
    test("success/Do not specify a currency", async () => {
      const ctx = await createMockContext();
      const arcadePart: ArcadePart = {
        id: "id1",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        state: "IN_AKIVERSE",
        userId: ctx.userId!,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastBlock: 0,
        lastTransactionIndex: 0,
        usedJunks: null,
        craftId: null,
        destroyedAt: null,
        physicalWalletAddress: null,
        ownerWalletAddress: null,
        createDismantleId: null,
      };
      const junk: Junk = {
        id: "junk1",
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 1,
        userId: ctx.userId!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      useCase.returnValueForExtract = [arcadePart, junk];
      const ret = await send(ctx);
      expect(ret.data.executeExtract).toMatchObject([
        {
          id: "id1",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          state: "IN_AKIVERSE",
        },
        {
          id: "junk1",
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: 1,
        },
      ]);
    });
    test("success/TERAS", async () => {
      const ctx = await createMockContext();
      const arcadePart: ArcadePart = {
        id: "id1",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        state: "IN_AKIVERSE",
        userId: ctx.userId!,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastBlock: 0,
        lastTransactionIndex: 0,
        usedJunks: null,
        craftId: null,
        destroyedAt: null,
        physicalWalletAddress: null,
        ownerWalletAddress: null,
        createDismantleId: null,
      };
      const junk: Junk = {
        id: "junk1",
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 1,
        userId: ctx.userId!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      useCase.returnValueForExtract = [arcadePart, junk];
      const ret = await send(ctx, { usedCurrency: "TERAS" });
      expect(ret.data.executeExtract).toMatchObject([
        {
          id: "id1",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          state: "IN_AKIVERSE",
        },
        {
          id: "junk1",
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: 1,
        },
      ]);
    });
    test("success/AKV", async () => {
      const ctx = await createMockContext();
      const arcadePart: ArcadePart = {
        id: "id1",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        state: "IN_AKIVERSE",
        userId: ctx.userId!,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastBlock: 0,
        lastTransactionIndex: 0,
        usedJunks: null,
        craftId: null,
        destroyedAt: null,
        physicalWalletAddress: null,
        ownerWalletAddress: null,
        createDismantleId: null,
      };
      const junk: Junk = {
        id: "junk1",
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 1,
        userId: ctx.userId!,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      useCase.returnValueForExtract = [arcadePart, junk];
      const ret = await send(ctx, { usedCurrency: "AKV" });
      expect(ret.data.executeExtract).toMatchObject([
        {
          id: "id1",
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          state: "IN_AKIVERSE",
        },
        {
          id: "junk1",
          category: "ACCUMULATOR",
          subCategory: "HOKUTO_100_LX",
          amount: 1,
        },
      ]);
    });
  });

  test("extract code mismatch", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new StateChangeUseCaseError();
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "STATE_CHANGE");
  });
  test("not found", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new NotFoundUseCaseError(
      "test",
      "ArcadeMachine",
    );
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new IllegalStateUseCaseError("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("extract code mismatch", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new StateChangeUseCaseError();
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "STATE_CHANGE");
  });
  test("permission denied", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new PermissionDeniedUseCaseError();
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "PERMISSION_DENIED");
  });
  test("extract item insufficient", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new ExtractItemInsufficientUseCaseError();
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "EXTRACT_ITEM_INSUFFICIENT");
  });
  test("internal server error", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new InternalServerUseCaseError("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
  test("unknown error", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new Error("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
  test("conflict", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForExtract = new ConflictUseCaseError("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
});
