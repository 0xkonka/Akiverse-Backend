import "reflect-metadata";

import { ArcadeMachineOperationUseCaseMock } from "../../../../mock/use_cases/arcade_machine_usecase_mock";
import { ExecutionResult, graphql } from "graphql";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
} from "../../../../../src/use_cases/errors";
import { authChecker } from "../../../../mock/auth_checker";
import { expectGraphqlError } from "./helper";
import { MetadataUseCaseMock } from "../../../../mock/use_cases/metadata_usecase_mock";
import {
  createMockContext,
  createMockContextNonAuth,
} from "../../../../mock/context";
import { GeneratedResolvers } from "../../../../../src/apps/server/resolvers";
import {
  createArcadeMachine,
  createUser,
  eraseDatabase,
} from "../../../../test_helper";
import { Context } from "../../../../../src/context";
import {
  FEVER_SPARKED_REWARD_TOTAL,
  MEGA_SPARKED_REWARD,
  SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
} from "../../../../../src/constants";
import { games } from "../../../../../src/metadata/games";

const mockUseCase = new ArcadeMachineOperationUseCaseMock();
const mockMetadataUseCase = new MetadataUseCaseMock();

Container.set("arcadeMachine.useCase", mockUseCase);
Container.set("metadata.useCase", mockMetadataUseCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
describe("installArcadeMachine", () => {
  const request = `
  mutation InstallArcadeMachine($input: InstallArcadeMachineInput!) {
  installArcadeMachine(input: $input) {
    arcadeMachine {
      id
    }
  }
}`;

  async function send(): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          arcadeMachineId: "1",
          gameCenterId: "2",
          autoRenewLease: true,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(() => {
    mockUseCase.reset();
    mockMetadataUseCase.reset();
    mockMetadataUseCase.setDefault();
  });
  test("success", async () => {
    mockUseCase.returnValueForInstall = {
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
      feverSparkRemain: null,
      destroyedAt: null,
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
    };

    const ret = await send();
    const installedArcadeMachine = ret.data.installArcadeMachine;
    expect(installedArcadeMachine.arcadeMachine?.id).toBe("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForInstall = new NotFoundUseCaseError(
      "test",
      "arcade machine",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForInstall = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("conflict", async () => {
    mockUseCase.throwErrorForInstall = new ConflictUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
  test("permission denied", async () => {
    mockUseCase.throwErrorForInstall = new PermissionDeniedUseCaseError();
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "PERMISSION_DENIED");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForInstall = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});

describe("uninstallArcadeMachine", () => {
  const request = `
  mutation UninstallArcadeMachine($input: UninstallArcadeMachineInput!) {
    uninstallArcadeMachine(input: $input) {
      arcadeMachine {
        id
      }
    }
  }`;

  async function send(): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          id: "1",
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(() => {
    mockUseCase.reset();
    mockMetadataUseCase.reset();
    mockMetadataUseCase.setDefault();
  });
  test("success", async () => {
    mockUseCase.returnValueForUninstall = {
      id: "1",
      state: "IN_AKIVERSE",
      game: "dummy",
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
      installedAt: null,
      autoRenewLease: true,
      accumulatorSubCategory: "HOKUTO_100_LX",
      extractedEnergy: 0,
      feverSparkRemain: null,
      destroyedAt: null,
      upperCabinetSubCategory: "PLAIN",
      lowerCabinetSubCategory: "PLAIN",
    };

    const ret = await send();
    const uninstallArcadeMachine = ret.data.uninstallArcadeMachine;
    expect(uninstallArcadeMachine.arcadeMachine?.id).toBe("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForUninstall = new NotFoundUseCaseError(
      "test",
      "arcade machine",
    );
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
  });
  test("illegal state", async () => {
    mockUseCase.throwErrorForUninstall = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("permission denied", async () => {
    mockUseCase.throwErrorForUninstall = new PermissionDeniedUseCaseError();
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "PERMISSION_DENIED");
  });
  test("unknown error", async () => {
    mockUseCase.throwErrorForUninstall = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});

describe("withdraw", () => {
  const request = `
  mutation WithdrawArcadeMachine($input: WithdrawArcadeMachineInput!) {
    withdrawArcadeMachine(input: $input) {
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
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(() => {
    mockUseCase.reset();
    mockMetadataUseCase.reset();
    mockMetadataUseCase.setDefault();
  });
  test("success", async () => {
    mockUseCase.returnValueForWithdraw = [
      {
        id: "1",
        state: "IN_AKIVERSE",
        game: "dummy",
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
        installedAt: null,
        autoRenewLease: true,
        accumulatorSubCategory: "HOKUTO_100_LX",
        extractedEnergy: 1,
        feverSparkRemain: null,
        destroyedAt: null,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      },
    ];

    const ret = await send();
    const withdrawArcadeMachine = ret.data.withdrawArcadeMachine;
    expect(withdrawArcadeMachine[0].id).toEqual("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForWithdraw = new NotFoundUseCaseError(
      "test",
      "ArcadeMachine",
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
  mutation DepositArcadeMachine($input: DepositArcadeMachineInput!) {
    depositArcadeMachine(input: $input) {
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
        game: "dummy",
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
        installedAt: null,
        autoRenewLease: true,
        accumulatorSubCategory: "HOKUTO_100_LX",
        extractedEnergy: 0,
        feverSparkRemain: null,
        destroyedAt: null,
        upperCabinetSubCategory: "PLAIN",
        lowerCabinetSubCategory: "PLAIN",
      },
    ];
    const ret = await send();
    const depositArcadeMachine = ret.data.depositArcadeMachine;
    expect(depositArcadeMachine[0].id).toEqual("1");
  });
  test("not found", async () => {
    mockUseCase.throwErrorForDeposit = new NotFoundUseCaseError(
      "test",
      "ArcadeMachine",
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

describe("playing field resolver", () => {
  const request = `
  query ArcadeMachine($where: ArcadeMachineWhereUniqueInput!) {
    arcadeMachine(where: $where) {
      playing
    }
  }`;
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
  test("now playing", async () => {
    const amo = await createUser();
    const am = await createArcadeMachine({ userId: amo.id });
    mockUseCase.returnValueForPlaying = true;
    const ret = await send(am.id);
    expect(ret.data).toMatchObject({ arcadeMachine: { playing: true } });
  });
  test("not playing", async () => {
    const amo = await createUser();
    const am = await createArcadeMachine({ userId: amo.id });
    mockUseCase.returnValueForPlaying = false;
    const ret = await send(am.id);
    expect(ret.data).toMatchObject({ arcadeMachine: { playing: false } });
  });
  test("raise error", async () => {
    const amo = await createUser();
    const am = await createArcadeMachine({ userId: amo.id });
    mockUseCase.throwErrorForPlaying = Error("test");
    const ret = await send(am.id);
    expect(ret.data).toMatchObject({ arcadeMachine: { playing: true } });
  });
});

describe("rewardForSparking", () => {
  const request = `
  query ArcadeMachines($orderBy: [ArcadeMachineOrderByWithRelationInput!]) {
    arcadeMachines(orderBy: $orderBy) {
      id
      rewardForSparking
    }
  }
  `;
  async function send(ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        orderBy: {
          energy: "asc",
        },
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("no am", async () => {
    const ctx = await createMockContext();
    const ret = await send(ctx);
    expect(ret.data.arcadeMachines).toHaveLength(0);
  });
  test("multi am", async () => {
    const ctx = await createMockContext();
    const otherCtx = await createMockContext();

    // energy の昇順で返すようにしているので、明示する
    const ownedArcadeMachine = await createArcadeMachine({
      id: "1",
      userId: ctx.userId!,
      energy: 1000,
      maxEnergy: 10000,
      game: "BUBBLE_ATTACK",
    });
    const otherArcadeMachine = await createArcadeMachine({
      id: "2",
      userId: otherCtx.userId!,
      energy: 2000,
      maxEnergy: 10000,
      game: "BUBBLE_ATTACK",
    });

    const ret = await send(ctx);
    const bubble = games["BUBBLE_ATTACK"];
    expect(ret.data.arcadeMachines).toHaveLength(2);
    expect(ret.data.arcadeMachines).toMatchObject([
      {
        id: ownedArcadeMachine.id,
        rewardForSparking: bubble.sparkedEmitTerasSelf
          .mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER)
          .toString(),
      },
      {
        id: otherArcadeMachine.id,
        rewardForSparking: bubble.sparkedEmitTerasOther
          .mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER)
          .toString(),
      },
    ]);
  });
  test("Fever AM", async () => {
    const ctx = await createMockContext();
    const otherCtx = await createMockContext();

    // energy の昇順で返すようにしているので、明示する
    const ownedArcadeMachine = await createArcadeMachine({
      id: "1",
      userId: ctx.userId!,
      energy: 1000,
      maxEnergy: 10000,
      game: "BUBBLE_ATTACK",
    });
    const otherArcadeMachine = await createArcadeMachine({
      id: "2",
      userId: otherCtx.userId!,
      energy: 10000,
      game: "BUBBLE_ATTACK",
      maxEnergy: 10000,
      feverSparkRemain: 10,
    });

    const ret = await send(ctx);
    const bubble = games["BUBBLE_ATTACK"];
    expect(ret.data.arcadeMachines).toHaveLength(2);
    expect(ret.data.arcadeMachines).toMatchObject([
      {
        id: ownedArcadeMachine.id,
        rewardForSparking: bubble.sparkedEmitTerasSelf
          .mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER)
          .toString(),
      },
      {
        id: otherArcadeMachine.id,
        rewardForSparking: bubble.sparkedEmitTerasOther
          .mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER)
          .add(
            FEVER_SPARKED_REWARD_TOTAL.mul(
              SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER,
            ),
          )
          .toString(),
      },
    ]);
  });
  test("include Upcoming AM", async () => {
    const ctx = await createMockContext();
    const otherCtx = await createMockContext();

    // energy の昇順で返すようにしているので、明示する
    const ownedArcadeMachine = await createArcadeMachine({
      id: "1",
      userId: ctx.userId!,
      energy: 1000,
      maxEnergy: 3000,
      game: "BUBBLE_ATTACK",
    });
    const otherArcadeMachine = await createArcadeMachine({
      id: "2",
      userId: otherCtx.userId!,
      energy: 2900,
      maxEnergy: 3000,
      game: "BUBBLE_ATTACK",
    });

    const ret = await send(ctx);
    const bubble = games["BUBBLE_ATTACK"];
    expect(ret.data.arcadeMachines).toHaveLength(2);
    expect(ret.data.arcadeMachines).toMatchObject([
      {
        id: ownedArcadeMachine.id,
        rewardForSparking: bubble.sparkedEmitTerasSelf
          .mul(SPARKED_TERAS_DISTRIBUTION_RATIO_TO_PLAYER)
          .toString(),
      },
      {
        id: otherArcadeMachine.id,
        rewardForSparking: MEGA_SPARKED_REWARD.toString(),
      },
    ]);
  });
});
