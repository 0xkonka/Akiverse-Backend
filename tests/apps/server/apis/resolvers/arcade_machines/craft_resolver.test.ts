import "reflect-metadata";

import { CraftUseCaseMock } from "../../../../../mock/use_cases/craft_usecase_mock";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import resolvers from "../../../../../../src/apps/server/apis/resolvers";
import { ExecutionResult, graphql } from "graphql";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";
import { createMockContextNonAuth } from "../../../../../mock/context";

const useCase = new CraftUseCaseMock();
Container.set("craft.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("craft", () => {
  const request = `
  mutation Craft($input: CraftInput!) {
    craft(input: $input) {
      id
    }
  }
  `;

  async function send(input = {}): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          rom: {
            tokenId: "1",
          },
          accumulator: {
            subCategory: "HOKUTO_100_LX",
          },
          upperCabinet: {
            tokenId: "3",
          },
          lowerCabinet: {
            subCategory: "PLAIN",
          },
          ...input,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(async () => {
    useCase.reset();
  });
  describe("success", () => {
    test("success/Currency not specified", async () => {
      useCase.returnValueForCraft = {
        id: "1",
        game: "SMASHH",
        state: "MOVING_TO_AKIVERSE",
        boost: 2,
        gameCenterId: "3",
        createdAt: new Date(),
        updatedAt: new Date(),
        energy: 4,
        maxEnergy: 5,
        userId: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        position: 6,
        lastBlock: 7,
        lastTransactionIndex: 8,
        installedAt: new Date(),
        autoRenewLease: true,
        accumulatorSubCategory: "HOKUTO_100_LX",
        extractedEnergy: 0,
        feverSparkRemain: 0,
        destroyedAt: null,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      };
      const ret = await send();
      const craft = ret.data.craft;
      expect(craft.id).toEqual("1");
    });
    test("success/teras", async () => {
      useCase.returnValueForCraft = {
        id: "1",
        game: "SMASHH",
        state: "MOVING_TO_AKIVERSE",
        boost: 2,
        gameCenterId: "3",
        createdAt: new Date(),
        updatedAt: new Date(),
        energy: 4,
        maxEnergy: 5,
        userId: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        position: 6,
        lastBlock: 7,
        lastTransactionIndex: 8,
        installedAt: new Date(),
        autoRenewLease: true,
        accumulatorSubCategory: "HOKUTO_100_LX",
        extractedEnergy: 0,
        feverSparkRemain: 0,
        destroyedAt: null,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      };
      const ret = await send({
        usedCurrency: "TERAS",
      });
      const craft = ret.data.craft;
      expect(craft.id).toEqual("1");
    });
    test("success/AKV", async () => {
      useCase.returnValueForCraft = {
        id: "1",
        game: "SMASHH",
        state: "MOVING_TO_AKIVERSE",
        boost: 2,
        gameCenterId: "3",
        createdAt: new Date(),
        updatedAt: new Date(),
        energy: 4,
        maxEnergy: 5,
        userId: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        position: 6,
        lastBlock: 7,
        lastTransactionIndex: 8,
        installedAt: new Date(),
        autoRenewLease: true,
        accumulatorSubCategory: "HOKUTO_100_LX",
        extractedEnergy: 0,
        feverSparkRemain: 0,
        destroyedAt: null,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      };
      const ret = await send({
        usedCurrency: "AKV",
      });
      const craft = ret.data.craft;
      expect(craft.id).toEqual("1");
    });
  });

  test("not found", async () => {
    useCase.throwErrorForCraft = new NotFoundUseCaseError("test", "ArcadePart");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("permission denied", async () => {
    useCase.throwErrorForCraft = new PermissionDeniedUseCaseError();
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "PERMISSION_DENIED");
  });
  test("invalid argument", async () => {
    useCase.throwErrorForCraft = new InvalidArgumentUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("invalid argument(resolver validation/multiple input)", async () => {
    const ret = await send({
      rom: {
        tokenId: "1",
        subCategory: "test",
      },
    });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("invalid argument(resolver validation/no input)", async () => {
    const ret = await send({
      rom: {},
    });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("illegal state", async () => {
    useCase.throwErrorForCraft = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("unknown error", async () => {
    useCase.throwErrorForCraft = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
