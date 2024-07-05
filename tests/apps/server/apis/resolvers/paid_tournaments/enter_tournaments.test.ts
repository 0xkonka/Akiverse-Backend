import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { PaidTournamentUseCaseMock } from "../../../../../mock/use_cases/paid_tournament_usecase_mock";
import { createMockContext } from "../../../../../mock/context";
import { ExecutionResult, graphql } from "graphql";
import {
  ConflictUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
} from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new PaidTournamentUseCaseMock();
Container.set("paidTournament.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});
describe("enter tournament", () => {
  beforeEach(() => {
    useCase.reset();
  });
  const request = `
  mutation EnterPaidTournament($input: EnterTournamentInput!) {
    enterPaidTournament(input: $input)
  }
  `;

  async function send(): Promise<any> {
    const ctx = await createMockContext();
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          tournamentId: "dummy",
        },
      },
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }
  test("success", async () => {
    useCase.returnValueForEntry = {
      id: "dummy",
      userId: "dummy",
      createdAt: new Date(),
      paidTournamentId: "dummy",
      usedTickets: 1,
      updatedAt: new Date(),
      countryFromIp: "JP",
      phoneNumber: null,
      prizeClaimed: false,
      walletAddress: null,
      prizeSendStatus: null,
    };
    const ret = await send();
    expect(ret.data.enterPaidTournament).toBeTruthy();
  });
  test("duplicate entry", async () => {
    useCase.throwErrorForEntry = new IllegalStateUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "ILLEGAL_STATE");
  });
  test("conflict", async () => {
    useCase.throwErrorForEntry = new ConflictUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "CONFLICT");
  });
  test("unknown tournamentId", async () => {
    useCase.throwErrorForEntry = new InvalidArgumentUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("unknown error", async () => {
    useCase.throwErrorForEntry = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
