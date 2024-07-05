import "reflect-metadata";

import { buildSchemaSync } from "type-graphql/dist/utils/buildSchema";
import { GeneratedResolvers } from "../../../../../../src/apps/server/resolvers";
import CustomResolvers from "../../../../../../src/apps/server/apis/resolvers";
import { Container } from "typedi";
import { authChecker } from "../../../../../mock/auth_checker";
import { ProcessingTransferUseCaseMock } from "../../../../../mock/use_cases/processing_transfer_usecase_mock";
import { ExecutionResult, graphql } from "graphql";
import { Context } from "../../../../../../src/context";
import { createMockContext } from "../../../../../mock/context";
import { eraseDatabase } from "../../../../../test_helper";
import { Prisma } from "@prisma/client";
import { expectGraphqlError } from "../helper";

const useCase = new ProcessingTransferUseCaseMock();
Container.set("processingTransfer.useCase", useCase);

const schema = buildSchemaSync({
  resolvers: [...GeneratedResolvers, ...CustomResolvers],
  container: Container,
  authChecker: authChecker,
});
describe("check transfers", () => {
  const request = `
query CheckTransfers {
  checkTransfers {
    nft {
      gameCenters {
        deposits {
          id
          name
        }
        withdraws {
          id
          name
        }
      }
      arcadeMachines {
        deposits {
          id
          name
        }
        withdraws {
          id
          name
        }
      }
      arcadeParts {
        deposits {
          id
          name
        }
        withdraws {
          id
          name
        }
      }
    }
    ft {
      akv {
        deposits
        withdraws
      }
      akir {
        deposits
        withdraws
      }
    }
  }
}
  `;
  async function send(ctx: Context): Promise<any> {
    const result = await graphql({
      schema: schema,
      source: request,
      variableValues: {},
      contextValue: ctx,
    });
    return JSON.parse(JSON.stringify(result));
  }

  beforeEach(async () => {
    useCase.reset();
    await eraseDatabase();
  });

  test("no progressing transfers", async () => {
    const ctx = await createMockContext();
    useCase.returnValueForList = {
      nft: {
        gameCenters: {
          deposits: [],
          withdraws: [],
        },
        arcadeMachines: {
          deposits: [],
          withdraws: [],
        },
        arcadeParts: {
          deposits: [],
          withdraws: [],
        },
      },
      ft: {
        akv: {
          deposits: [],
          withdraws: [],
        },
        akir: {
          deposits: [],
          withdraws: [],
        },
      },
    };
    const ret = await send(ctx);
    expect(ret.data).toMatchObject({
      checkTransfers: {
        nft: {
          gameCenters: {
            deposits: [],
            withdraws: [],
          },
          arcadeMachines: {
            deposits: [],
            withdraws: [],
          },
          arcadeParts: {
            deposits: [],
            withdraws: [],
          },
        },
        ft: {
          akv: {
            deposits: [],
            withdraws: [],
          },
          akir: {
            deposits: [],
            withdraws: [],
          },
        },
      },
    });
  });
  test("progressing transfers", async () => {
    const ctx = await createMockContext();
    useCase.returnValueForList = {
      nft: {
        gameCenters: {
          deposits: [
            {
              id: "1",
              name: "deposit_gc_1",
            },
          ],
          withdraws: [
            {
              id: "2",
              name: "withdraw_gc_2",
            },
          ],
        },
        arcadeMachines: {
          deposits: [
            {
              id: "3",
              name: "deposit_am_3",
            },
          ],
          withdraws: [
            {
              id: "4",
              name: "withdraw_am_4",
            },
          ],
        },
        arcadeParts: {
          deposits: [
            {
              id: "5",
              name: "deposit_ap_5",
            },
          ],
          withdraws: [
            {
              id: "6",
              name: "withdraw_ap_6",
            },
          ],
        },
      },
      ft: {
        akv: {
          deposits: [new Prisma.Decimal(1)],
          withdraws: [new Prisma.Decimal(2)],
        },
        akir: {
          deposits: [new Prisma.Decimal(3)],
          withdraws: [new Prisma.Decimal(4)],
        },
      },
    };
    const ret = await send(ctx);
    expect(ret.data).toMatchObject({
      checkTransfers: {
        nft: {
          gameCenters: {
            deposits: [
              {
                id: "1",
                name: "deposit_gc_1",
              },
            ],
            withdraws: [
              {
                id: "2",
                name: "withdraw_gc_2",
              },
            ],
          },
          arcadeMachines: {
            deposits: [
              {
                id: "3",
                name: "deposit_am_3",
              },
            ],
            withdraws: [
              {
                id: "4",
                name: "withdraw_am_4",
              },
            ],
          },
          arcadeParts: {
            deposits: [
              {
                id: "5",
                name: "deposit_ap_5",
              },
            ],
            withdraws: [
              {
                id: "6",
                name: "withdraw_ap_6",
              },
            ],
          },
        },
        ft: {
          akv: {
            deposits: ["1"],
            withdraws: ["2"],
          },
          akir: {
            deposits: ["3"],
            withdraws: ["4"],
          },
        },
      },
    });
  });
  test("unknown error", async () => {
    const ctx = await createMockContext();
    useCase.throwErrorForList = new Error("test");
    const ret = await send(ctx);
    expectGraphqlError(ret as ExecutionResult, "INTERNAL_SERVER_ERROR");
  });
});
