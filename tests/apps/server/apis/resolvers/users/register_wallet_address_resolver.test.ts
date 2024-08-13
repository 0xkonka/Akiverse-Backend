import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { resolvers } from "@generated/type-graphql";
import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import { eraseDatabase } from "../../../../../test_helper";
import { expectGraphqlError } from "../helper";
import { WalletAddressUseCaseMock } from "../../../../../mock/use_cases/wallet_address_usecase_mock";
import { Prisma } from "@prisma/client";
import { IllegalStateUseCaseError } from "../../../../../../src/use_cases/errors";
import { LoginUseCaseMock } from "../../../../../mock/use_cases/login_usecase_mock";

const useCase = new WalletAddressUseCaseMock();
const loginUseCase = new LoginUseCaseMock();
Container.set("walletAddress.useCase", useCase);
Container.set("login.useCase", loginUseCase);
const schema = buildSchemaSync({
  resolvers: [...resolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

describe("registerWalletAddress", () => {
  const request = `
  mutation RegisterWalletAddress($input: RegisterWalletAddressInput!) {
    registerWalletAddress(input: $input) {
      user {
        id
        walletAddress
      }
    }
  }
  `;

  async function send(): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          message: "hoge",
          signature: "fuga",
        },
      },
      contextValue: createMockContext(),
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(async () => {
    await eraseDatabase();
    useCase.useCaseReset();
  });

  test("success", async () => {
    useCase.returnValueForRegister = {
      id: "hoge",
      email: "fuga",
      walletAddress: "piyo",
      name: "foo",
      akirBalance: new Prisma.Decimal(1),
      akvBalance: new Prisma.Decimal(2),
      terasBalance: new Prisma.Decimal(3),
      tickets: 4,
      updatedAt: new Date(),
      createdAt: new Date(),
      iconType: "IN_WORLD",
      iconSubCategory: "DEFAULT",
      frameSubCategory: "DEFAULT",
      titleSubCategory: "DEFAULT",
      lockedAt: null,
      receiveBulkEmail: true,
      admin: false,
      unsubscribeToken: "826a50f1-c67e-4ac0-8179-ba4390acf38e",
    };
    const ret = await send();
    const registerWalletAddress = ret.data.registerWalletAddress;
    const want = {
      user: {
        id: useCase.returnValueForRegister.id,
        walletAddress: useCase.returnValueForRegister.walletAddress,
      },
    };
    expect(registerWalletAddress).toEqual(want);
  });
  test("error", async () => {
    useCase.throwErrorForRegister = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
});
