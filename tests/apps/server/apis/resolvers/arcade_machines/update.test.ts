import "reflect-metadata";

import { ExecutionResult, graphql } from "graphql";
import { ArcadeMachineOperationUseCaseMock } from "../../../../../mock/use_cases/arcade_machine_usecase_mock";
import { createMockContext } from "../../../../../mock/context";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import {
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new ArcadeMachineOperationUseCaseMock();

Container.set("arcadeMachine.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("arcade machine update", () => {
  const request = `
  mutation UpdateArcadeMachine($input: UpdateArcadeMachineInput!) {
    updateArcadeMachine(input: $input) {
      id
      autoRenewLease
    }
  }
  `;
  beforeEach(() => {
    useCase.reset();
  });
  async function send(extraData = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          arcadeMachineId: "test",
          autoRenewLease: false,
          ...extraData,
        },
      },
      contextValue: createMockContext(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  test("success", async () => {
    useCase.returnValueForUpdate = {
      id: "1",
      state: "IN_AKIVERSE",
      game: "SMASHH",
      boost: 0,
      gameCenterId: "3",
      createdAt: new Date(),
      updatedAt: new Date(),
      energy: 0,
      maxEnergy: 0,
      userId: null,
      ownerWalletAddress: null,
      physicalWalletAddress: null,
      position: 1,
      lastBlock: 0,
      lastTransactionIndex: 0,
      installedAt: new Date(),
      autoRenewLease: true,
      accumulatorSubCategory: "HOKUTO_100_LX",
      extractedEnergy: 1,
      feverSparkRemain: 0,
      destroyedAt: null,
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
    };
    const ret = await send();
    const updateArcadeMachine = ret.data.updateArcadeMachine;
    expect(updateArcadeMachine.autoRenewLease).toBeTruthy();
  });
  test("not found", async () => {
    useCase.throwErrorForUpdate = new NotFoundUseCaseError(
      "test",
      "arcade machine",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("permission denied", async () => {
    useCase.throwErrorForUpdate = new PermissionDeniedUseCaseError();
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "PERMISSION_DENIED");
  });
  test("unknown error", async () => {
    useCase.throwErrorForUpdate = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
