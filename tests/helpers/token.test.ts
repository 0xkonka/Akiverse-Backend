import { createUser, eraseDatabase } from "../test_helper";
import {
  ApiAccessTokenPayload,
  generateAccessToken,
  verifyToken,
} from "../../src/helpers/token";
import { setTimeout } from "timers/promises";
import {
  InvalidArgumentUseCaseError,
  TokenExpiredUseCaseError,
  UnhandledUseCaseError,
} from "../../src/use_cases/errors";
// @ts-ignore
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_SECRET } from "../../src/constants";

describe("access token", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("generate and verify success/api", async () => {
    const user = await createUser();
    const token = generateAccessToken(user);
    const verified = verifyToken(token);
    const expectObj: ApiAccessTokenPayload = {
      tokenUse: "api",
      userId: user.id,
      walletAddress: user.walletAddress ? user.walletAddress : undefined,
      locked: false,
    };
    expect(verified).toMatchObject(expectObj);
  });
  test("generate success/ verify expired", async () => {
    const user = await createUser();
    // 有効期間を1秒で生成する
    const token = generateAccessToken(user, { expiresIn: "1s" });
    await setTimeout(2000); // 2秒待ってExpiredになるのを待つ
    expect(() => verifyToken(token)).toThrowError(TokenExpiredUseCaseError);
  });
});

describe("verify token(illegal only)", () => {
  // 正常ケースはaccess tokenの方で検証
  test("token invalid", () => {
    expect(() => verifyToken("hoge")).toThrowError(InvalidArgumentUseCaseError);
  });
  test("unknown token_use", () => {
    const invalidToken = jwt.sign(
      {
        sub: "hoge",
        token_use: "test",
      },
      ACCESS_TOKEN_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "1m",
        issuer: "akiverse",
      },
    );
    expect(() => verifyToken(invalidToken)).toThrowError(UnhandledUseCaseError);
  });
  test("illegal algorithm", () => {
    const invalidToken = jwt.sign(
      {
        sub: "hoge",
        token_use: "test",
      },
      ACCESS_TOKEN_SECRET,
      {
        algorithm: "HS384",
        expiresIn: "1m",
        issuer: "akiverse",
      },
    );
    expect(() => verifyToken(invalidToken)).toThrowError(
      InvalidArgumentUseCaseError,
    );
  });
});
