import "reflect-metadata";

import { GameCenterUseCaseMock } from "../../../../../mock/use_cases/game_center_usecase_mock";
import { Container, Service } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { resolvers } from "@generated/type-graphql";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { ExecutionResult, graphql } from "graphql";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  NotFoundUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { authChecker } from "../../../../../mock/auth_checker";
import { expectGraphqlError } from "../helper";
import { MetadataUseCaseMock } from "../../../../../mock/use_cases/metadata_usecase_mock";
import { createMockContextNonAuth } from "../../../../../mock/context";

const mockUseCase = new GameCenterUseCaseMock();
const mockMetadataUseCase = new MetadataUseCaseMock();
Container.set("gameCenter.useCase", mockUseCase);
Container.set("metadata.useCase", mockMetadataUseCase);
// Prisma+type-graphql generated resolver default inject
// https://github.com/MichalLytek/typegraphql-prisma/issues/63
resolvers.forEach((value, index, array) =>
  array.forEach((v) => {
    Service()(v);
  }),
);

const schema = buildSchemaSync({
  resolvers: [...CustomResolvers, ...resolvers],
  container: Container,
  authChecker: authChecker,
});

describe("deposit", () => {
  const request = `
  mutation DepositGameCenter($input: DepositGameCenterInput!) {
    depositGameCenter(input: $input) {
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
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(() => {
    mockUseCase.reset();
  });
  test("success", async () => {
    mockUseCase.returnValueForDeposit = [
      {
        id: "1",
        state: "MOVING_TO_AKIVERSE",
        createdAt: new Date(),
        updatedAt: new Date(),
        placementAllowed: false,
        name: "dummy",
        area: "AKIHABARA",
        size: "SMALL",
        xCoordinate: 1,
        yCoordinate: 1,
        userId: null,
        ownerWalletAddress: null,
        physicalWalletAddress: null,
        lastBlock: 0,
        lastTransactionIndex: 0,
      },
    ];
    const ret = await send();
    const depositGameCenter = ret.data.depositGameCenter;
    expect(depositGameCenter[0].id).toBe("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForDeposit = new NotFoundUseCaseError(
      "test",
      "GameCenter",
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
