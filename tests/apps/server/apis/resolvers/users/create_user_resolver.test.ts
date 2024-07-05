import "reflect-metadata";

import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import { createUser, eraseDatabase } from "../../../../../test_helper";
import { Container } from "typedi";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { UserUseCaseMock } from "../../../../../mock/use_cases/user_usecase_mock";
import { LoginUseCaseMock } from "../../../../../mock/use_cases/login_usecase_mock";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  UnhandledUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const userUseCaseMock = new UserUseCaseMock();
Container.set("user.useCase", userUseCaseMock);
const loginUseCaseMock = new LoginUseCaseMock();
Container.set("login.useCase", loginUseCaseMock);

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});
describe("create user resolver", () => {
  const request = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      user {
        id
        name
        email
      }
      accessToken
      refreshToken
    }
  }
  `;
  type sendParams = {
    didToken?: string;
    idToken?: string;
    extraData?: object;
  };
  async function send(params: sendParams): Promise<any> {
    const id = params.didToken
      ? { didToken: params.didToken }
      : { idToken: params.idToken };
    return await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          name: "testname",
          ...id,
          ...params.extraData,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
  }

  afterAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(async () => {
    await eraseDatabase();
  });

  test("success", async () => {
    const user = await createUser({ walletAddress: null });
    userUseCaseMock.returnValueForCreate = user;
    loginUseCaseMock.returnValueForLoginResponse = {
      user: user,
      accessToken: "access",
      refreshToken: "refresh",
      firebaseCustomToken: "firebase",
    };

    const ret = await send({ didToken: "02test" });
    const created = ret.data.createUser;
    expect(created).toMatchObject({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken: "access",
      refreshToken: "refresh",
    });
  });
  test("invalid didToken", async () => {
    userUseCaseMock.throwErrorForCreate = new InvalidArgumentUseCaseError(
      "test",
    );

    const ret = await send({ didToken: "02test" });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("same email address user exist", async () => {
    userUseCaseMock.throwErrorForCreate = new IllegalStateUseCaseError("test");

    const ret = await send({ didToken: "02test" });
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("unhandled error", async () => {
    userUseCaseMock.throwErrorForCreate = new UnhandledUseCaseError("test");

    const ret = await send({ didToken: "02test" });
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
  test("unknown error", async () => {
    userUseCaseMock.throwErrorForCreate = new Error("test");

    const ret = await send({ didToken: "02test" });
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
