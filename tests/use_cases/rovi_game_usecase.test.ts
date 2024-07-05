import { RoviGameUseCaseImpl } from "../../src/use_cases/rovi_game_usecase";
import { createMockContextNonAuth } from "../mock/context";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import {
  generateRoviGamePlayToken,
  verifyRoviGamePlayToken,
} from "../../src/helpers/token";

const useCase = new RoviGameUseCaseImpl("http://localhost");
const data = {
  xApiKey: "xApiKeyValue",
  authorization: "authorizationValue",
  contestReferenceId: "tournamentId",
  source: "sourceValue",
  sourceId: "sourceIdValue",
};
const encodedData = btoa(JSON.stringify(data));

describe("Rovi game start", () => {
  test("success", async () => {
    const ctx = createMockContextNonAuth();
    const token = await useCase.start(ctx, encodedData);
    expect(token).not.toBeNull();
    const parsedToken = verifyRoviGamePlayToken(token);
    expect(parsedToken.sub).not.toBeNull();
    expect(parsedToken.data).toEqual(encodedData);
  });
});

let httpResponseMockedValues: HttpResponse[];
let callCount = 0;
const handler = [
  http.post("http://localhost/tournamentId/score", async ({ request }) => {
    const bodies = await request.json();
    const headers = request.headers;
    const expect = {
      score: 100,
      duration: 200,
    };
    if (bodies === expect) {
      return new HttpResponse("bodies invalid", {
        status: 400,
      });
    }
    const xApiKey = headers.get("x-api-key");
    const authorization = headers.get("authorization");
    if (!xApiKey || xApiKey !== data.xApiKey) {
      return new HttpResponse("xApiKey invalid", {
        status: 400,
      });
    }
    if (!authorization || authorization !== data.authorization) {
      return new HttpResponse("authorization invalid", {
        status: 400,
      });
    }

    callCount++;
    return httpResponseMockedValues[callCount - 1];
  }),
];
const server = setupServer(...handler);
describe("Rovi game finish", () => {
  let token: string;
  beforeAll(async () => {
    server.listen();
    token = await generateRoviGamePlayToken("unit_test", encodedData);
  });
  beforeEach(() => {
    callCount = 0;
  });
  afterAll(() => {
    server.close();
  });
  test("success", async () => {
    const ctx = createMockContextNonAuth();
    httpResponseMockedValues = [
      new HttpResponse("success", {
        status: 200,
        statusText: "mocked ok",
      }),
    ];

    const success = await useCase.finish(ctx, token, 100, 200);
    expect(success).toBeTruthy();
    expect(callCount).toEqual(1);
  });
  test("Roviのサーバーが正常に動いていない", async () => {
    const ctx = createMockContextNonAuth();
    httpResponseMockedValues = [
      new HttpResponse("fail 1", {
        status: 500,
        statusText: "mocked internal server error",
      }),
      new HttpResponse("fail 2", {
        status: 500,
        statusText: "mocked internal server error",
      }),
      new HttpResponse("fail 3", {
        status: 500,
        statusText: "mocked internal server error",
      }),
    ];
    const success = await useCase.finish(ctx, token, 100, 200);
    expect(success).toBeFalsy();
  });
  test("リトライして成功", async () => {
    const ctx = createMockContextNonAuth();
    httpResponseMockedValues = [
      new HttpResponse("fail 1", {
        status: 500,
        statusText: "mocked internal server error",
      }),
      new HttpResponse("fail 2", {
        status: 500,
        statusText: "mocked internal server error",
      }),
      new HttpResponse("success", {
        status: 200,
        statusText: "mocked ok",
      }),
    ];
    const success = await useCase.finish(ctx, token, 100, 200);
    expect(success).toBeTruthy();
  });
  test("invalid token", async () => {
    const ctx = createMockContextNonAuth();
    const success = await useCase.finish(ctx, "token", 100, 200);
    expect(success).toBeFalsy();
  });
});
