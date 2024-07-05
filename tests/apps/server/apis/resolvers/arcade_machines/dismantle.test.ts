import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import resolvers from "../../../../../../src/apps/server/apis/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { ArcadeMachineOperationUseCaseMock } from "../../../../../mock/use_cases/arcade_machine_usecase_mock";
import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import {
  IllegalStateUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new ArcadeMachineOperationUseCaseMock();
Container.set("arcadeMachine.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});
describe("dismantle resolver", () => {
  const request = `
  mutation Dismantle($input: DismantleInput!) {
    dismantle(input: $input) {
      rom {
        id
        category
        subCategory
      }
      upperCabinet {
        id
        category
        subCategory
      }
      upperCabinetGradeUp
      lowerCabinet {
        id
        category
        subCategory
      }
      lowerCabinetGradeUp
    }
  }
  `;

  async function send(input = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          arcadeMachineId: "hoge",
          usedCurrency: "AKV",
          ...input,
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
    useCase.returnValueForDismantle = {
      rom: {
        id: "rom",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        state: "IN_AKIVERSE",
        userId: null,
        createDismantleId: "dismantle_id",
        craftId: null,
        lastBlock: 0,
        destroyedAt: null,
        usedJunks: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        updatedAt: new Date(),
        createdAt: new Date(),
        lastTransactionIndex: 0,
      },
      upperCabinet: {
        id: "upper_cabinet",
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        state: "IN_AKIVERSE",
        userId: null,
        createDismantleId: "dismantle_id",
        craftId: null,
        lastBlock: 0,
        destroyedAt: null,
        usedJunks: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        updatedAt: new Date(),
        createdAt: new Date(),
        lastTransactionIndex: 0,
      },
      upperCabinetGradeUp: false,
      lowerCabinet: {
        id: "lower_cabinet",
        category: "LOWER_CABINET",
        subCategory: "MERCURY",
        state: "IN_AKIVERSE",
        userId: null,
        createDismantleId: "dismantle_id",
        craftId: null,
        lastBlock: 0,
        destroyedAt: null,
        usedJunks: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        updatedAt: new Date(),
        createdAt: new Date(),
        lastTransactionIndex: 0,
      },
      lowerCabinetGradeUp: true,
    };
    const ret = await send();
    expect(ret.data.dismantle).toBeDefined();
    expect(ret.data.dismantle).toMatchObject({
      rom: {
        id: "rom",
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
      },
      upperCabinet: {
        id: "upper_cabinet",
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
      },
      upperCabinetGradeUp: false,
      lowerCabinet: {
        id: "lower_cabinet",
        category: "LOWER_CABINET",
        subCategory: "MERCURY",
      },
      lowerCabinetGradeUp: true,
    });
  });
  test("not found", async () => {
    useCase.throwErrorForDismantle = new NotFoundUseCaseError(
      "test",
      "ArcadeMachine",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("permission denied", async () => {
    useCase.throwErrorForDismantle = new PermissionDeniedUseCaseError();
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "PERMISSION_DENIED");
  });
  test("illegal state", async () => {
    useCase.throwErrorForDismantle = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("unknown error", async () => {
    useCase.throwErrorForDismantle = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
