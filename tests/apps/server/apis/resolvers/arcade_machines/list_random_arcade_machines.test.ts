import "reflect-metadata";

import { ArcadeMachineOperationUseCaseMock } from "../../../../../mock/use_cases/arcade_machine_usecase_mock";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import { InvalidArgumentUseCaseError } from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new ArcadeMachineOperationUseCaseMock();

Container.set("arcadeMachine.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("list random arcade machines", () => {
  const request = `
  query ArcadeMachines($game: String) {
    listRandomArcadeMachines(game: $game) {
      arcadeMachines {
        id
      }
    }
  }
  `;
  beforeEach(() => {
    useCase.reset();
  });
  async function send(): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        game: "BUBBLE_ATTACK",
      },
      contextValue: createMockContext(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  test("success", async () => {
    useCase.returnValueForListRandomArcadeMachines = [
      {
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
      },
      {
        id: "2",
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
        extractedEnergy: 2,
        feverSparkRemain: 0,
        destroyedAt: null,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      },
    ];
    const ret = await send();
    const list = ret.data.listRandomArcadeMachines;
    expect(list.arcadeMachines).toHaveLength(2);
    expect(list).toMatchObject({ arcadeMachines: [{ id: "1" }, { id: "2" }] });
  });
  test("invalid argument", async () => {
    useCase.throwErrorForListRandomArcadeMachines =
      new InvalidArgumentUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("unknown error", async () => {
    useCase.throwErrorForListRandomArcadeMachines = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
