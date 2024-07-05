import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { resolvers } from "@generated/type-graphql";
import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import { createUser, eraseDatabase } from "../../../../../test_helper";
import { expectGraphqlError } from "../helper";
import { WalletAddressUseCaseMock } from "../../../../../mock/use_cases/wallet_address_usecase_mock";
import {
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
} from "../../../../../../src/use_cases/errors";
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

describe("login", () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(async () => {
    await eraseDatabase();
    loginUseCase.reset();
  });

  describe("email login", () => {
    const request = `
      query login($didToken: String) {
        login(didToken: $didToken) {
          user {
            id
            name
            email
          },
          accessToken
          refreshToken
        }
      }
      `;
    async function send(): Promise<any> {
      return await graphql({
        schema: schema,
        source: request,
        variableValues: {
          didToken: "test",
        },
        contextValue: createMockContextNonAuth(),
      });
    }
    test("success", async () => {
      const user = await createUser();
      loginUseCase.returnValueForLoginResponse = {
        user: user,
        accessToken: "hoge",
        refreshToken: "fuga",
        firebaseCustomToken: "piyo",
      };

      const expected = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        accessToken: "hoge",
        refreshToken: "fuga",
      };

      const ret = await send();
      const login = ret.data.login;
      expect(login).toEqual(expected);
    });
    test("invalid didToken", async () => {
      loginUseCase.throwError = new InvalidArgumentUseCaseError("test");
      const ret = await send();
      expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
    });
    test("user not found", async () => {
      loginUseCase.throwError = new NotFoundUseCaseError("test", "User");
      const ret = await send();
      expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
    });
    test("unknown error", async () => {
      loginUseCase.throwError = new Error("test");
      const ret = await send();
      expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
    });
  });
  describe("wallet login", () => {
    const request = `
      query login($message: String, $signature: String) {
        login(message: $message, signature: $signature) {
          user {
            id
            name
            email
          },
          accessToken
          refreshToken
          firebaseCustomToken
        }
      }
      `;
    async function send(): Promise<any> {
      return await graphql({
        schema: schema,
        source: request,
        variableValues: {
          message: "test_message",
          signature: "test_sig",
        },
        contextValue: createMockContextNonAuth(),
      });
    }
    test("success", async () => {
      const user = await createUser();
      loginUseCase.returnValueForLoginResponse = {
        user: user,
        accessToken: "hoge",
        refreshToken: "fuga",
        firebaseCustomToken: "piyo",
      };

      const expected = {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        accessToken: "hoge",
        refreshToken: "fuga",
        firebaseCustomToken: "piyo",
      };

      const ret = await send();
      const login = ret.data.login;
      expect(login).toEqual(expected);
    });
    test("user not found", async () => {
      loginUseCase.throwError = new NotFoundUseCaseError("test", "User");
      const ret = await send();
      expectGraphqlError(ret as ExecutionResult, "NOT_FOUND");
    });
    test("unknown error", async () => {
      loginUseCase.throwError = new Error("test");
      const ret = await send();
      expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
    });
  });
  describe("invalid request", () => {
    async function send(request: string, variables = {}): Promise<any> {
      return await graphql({
        schema: schema,
        source: request,
        variableValues: {
          ...variables,
        },
        contextValue: createMockContextNonAuth(),
      });
    }
    test("invalid argument. all args empty", async () => {
      const request = `
        query login($didToken: String, $message: String, $signature: String) {
          login(didToken: $didToken, message: $message, signature: $signature) {
            user {
              id
              name
              email
            },
            accessToken
            refreshToken
          }
        }
        `;
      const ret = await send(request, {
        didToken: "",
        message: "",
        signature: "",
      });
      expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
    });
    test("invalid argument. all args set", async () => {
      const request = `
        query login($didToken: String, $message: String, $signature: String) {
          login(didToken: $didToken, message: $message, signature: $signature) {
            user {
              id
              name
              email
            },
            accessToken
            refreshToken
          }
        }
        `;
      const ret = await send(request, {
        didToken: "hoge",
        message: "fuga",
        signature: "piyo",
      });
      expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
    });
  });
});
