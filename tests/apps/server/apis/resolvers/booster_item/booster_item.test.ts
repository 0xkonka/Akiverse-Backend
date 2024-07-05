import "reflect-metadata";

import { buildSchemaSync } from "type-graphql";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container, Service } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { BoosterItemUseCaseMock } from "../../../../../mock/use_cases/booster_item_usecase_mock";
import { ExecutionResult, graphql } from "graphql";
import { createMockContextNonAuth } from "../../../../../mock/context";
import { expectGraphqlError } from "../helper";

const useCase = new BoosterItemUseCaseMock();
Container.set("boosterItem.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("booster item resolver", () => {
  beforeEach(() => {
    useCase.reset();
  });
  const request = `
  mutation ApplyBoosterItem($input: ApplyBoosterItemInput!) {
    applyBoosterItem(input: $input) {
      ... on ActiveBooster {
        id
        createdAt
        updatedAt
        endAt
        category
        subCategory
        userId
      }
      ... on ActiveBoosterForTournament {
        id
        createdAt
        updatedAt
        endAt
        category
        subCategory
        userId
        paidTournamentId
      }
    }
  }
  `;

  async function send(args: object): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {
        input: {
          ...args,
        },
      },
      contextValue: createMockContextNonAuth(),
    });
    return JSON.parse(JSON.stringify(result));
  }
  test("success", async () => {
    const now = new Date();
    const endAt = new Date();
    endAt.setHours(endAt.getHours() + 1);
    useCase.returnValueForApply = {
      id: "dummy",
      category: "SPARK_TERAS_UP",
      subCategory: "test",
      userId: "hoge",
      createdAt: now,
      updatedAt: now,
      endAt: endAt,
    };
    const ret = await send({
      boosterItemId: "SPARK_TERAS_UP-test-test",
    });
    expect(ret.data.applyBoosterItem).toEqual({
      id: "dummy",
      category: "SPARK_TERAS_UP",
      subCategory: "test",
      userId: "hoge",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      endAt: endAt.toISOString(),
    });
  });
  test("success/include paidTournamentId", async () => {
    const now = new Date();
    const endAt = new Date();
    endAt.setHours(endAt.getHours() + 1);
    useCase.returnValueForApply = {
      id: "dummy",
      category: "SPARK_TERAS_UP",
      subCategory: "test",
      userId: "hoge",
      createdAt: now,
      updatedAt: now,
      endAt: endAt,
      paidTournamentId: "paid_tournament_id",
    };
    const ret = await send({
      boosterItemId: "SPARK_TERAS_UP-test-test",
      paidTournamentId: "paid_tournament_id",
    });
    expect(ret.data.applyBoosterItem).toEqual({
      id: "dummy",
      category: "SPARK_TERAS_UP",
      subCategory: "test",
      userId: "hoge",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      endAt: endAt.toISOString(),
      paidTournamentId: "paid_tournament_id",
    });
  });
  test("invalid arguments", async () => {
    const ret = await send({
      boosterItemId: "",
    });
    expectGraphqlError(ret as ExecutionResult, "INVALID_ARGUMENT");
  });
  test("unknown error", async () => {
    useCase.throwErrorForApply = new Error("ut");
    const ret = await send({
      boosterItemId: "SPARK_TERAS_UP-test-test",
      paidTournamentId: "paid_tournament_id",
    });
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
