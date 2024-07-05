import "reflect-metadata";

import { ExtractUseCaseMock } from "../../../../../mock/use_cases/extract_usecase_mock";
import { Container, Service } from "typedi";
import { ExecutionResult, graphql } from "graphql";
import { createMockContext } from "../../../../../mock/context";
import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { authChecker } from "../../../../../mock/auth_checker";
import { BoxItem } from "../../../../../../src/use_cases/extract_usecase";
import { InternalServerUseCaseError } from "../../../../../../src/use_cases/errors";
import { expectGraphqlError } from "../helper";

const useCase = new ExtractUseCaseMock();
Container.set("extract.useCase", useCase);
const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});

GeneratedResolvers.forEach((v) => {
  Service()(v);
});

describe("list box items", () => {
  beforeEach(() => {
    useCase.reset();
  });
  const request = `
  query ListExtractInventory {
    listExtractInventory {
      hotItems {
        category
        subCategory
        amount
        initialAmount
        name
      }
      otherItems {
        category
        subCategory
        amount
        initialAmount
        name
      }
      totalAmount
    }
  }
  `;

  async function send(): Promise<any> {
    const ctx = await createMockContext();
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {},
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  test("success", async () => {
    const mockRet: BoxItem[] = [];
    mockRet.push(
      {
        // 表示対象
        category: "ROM",
        subCategory: "BUBBLE_ATTACK",
        amount: 1,
        initialAmount: 2,
        isJunk: false,
        isFeaturedItem: false,
        name: "Bubble Attack ROM",
      },
      {
        // 表示非対象
        category: "ACCUMULATOR",
        subCategory: "HOKUTO_100_LX",
        amount: 3,
        initialAmount: 4,
        isJunk: true,
        isFeaturedItem: false,
        name: "Junk Hokuto100LX Accumulator",
      },
      {
        // 表示対象
        category: "UPPER_CABINET",
        subCategory: "PLAIN",
        amount: 5,
        initialAmount: 6,
        isJunk: false,
        isFeaturedItem: true,
        name: "Plain Upper Cabinet",
      },
      {
        // 表示非対象
        category: "LOWER_CABINET",
        subCategory: "PLAIN",
        amount: 7,
        initialAmount: 8,
        isJunk: true,
        isFeaturedItem: true,
        name: "Junk Plain Lower Cabinet",
      },
    );
    useCase.returnValueForListBoxItems = mockRet;
    const ret = await send();
    expect(ret.data.listExtractInventory).toMatchObject({
      hotItems: [
        {
          amount: 5,
          initialAmount: 6,
          category: "UPPER_CABINET",
          subCategory: "PLAIN",
          name: "Plain Upper Cabinet",
        },
      ],
      otherItems: [
        {
          amount: 1,
          initialAmount: 2,
          category: "ROM",
          subCategory: "BUBBLE_ATTACK",
          name: "Bubble Attack ROM",
        },
      ],
      totalAmount: 16, // すべてのAmountの合計
    });
  });
  test("success/no items", async () => {
    useCase.returnValueForListBoxItems = [];
    const ret = await send();
    expect(ret.data.listExtractInventory).toMatchObject({
      hotItems: [],
      otherItems: [],
      totalAmount: 0,
    });
  });
  test("internal server error", async () => {
    useCase.throwErrorForListBoxItems = new InternalServerUseCaseError("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
  test("unknown error", async () => {
    useCase.throwErrorForListBoxItems = new Error("test");
    const ret = await send();
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
