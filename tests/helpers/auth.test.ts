import "reflect-metadata";

import { eraseDatabase } from "../test_helper";
import { hashSessionToken, magic, validateToken } from "../../src/helpers/auth";
import prisma from "../../src/prisma";

function decodeMock(now: Date, issuer: string): jest.Mock {
  const nowSeconds = now.getTime() / 1000;
  return jest.fn().mockReturnValue([
    "token",
    {
      iat: nowSeconds,
      ext: nowSeconds,
      iss: issuer,
      sub: "6tFXTfRxykwMKOOjSMbdPrEMrpUl3m3j8DQycFqO2tw=",
      aud: "did:magic:f54168e9-9ce9-47f2-81c8-7cb2a96b26ba",
      nbf: nowSeconds,
      tid: "2ddf5983-983b-487d-b464-bc5e283a03c5",
      add: "0x91fbe74be6c6bfd8ddddd93011b059b9253f10785649738ba217e51e0e3df1381d20f521a3641f23eb99ccb34e3bc5d96332fdebc8efa50cdb415e45500952cd1c",
    },
  ]);
}

describe("validateToken", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  describe("magic token validate", () => {
    const orgMagicTokenDecode = magic.token.decode;
    const orgMagicTokenValidate = magic.token.validate;
    afterAll(() => {
      magic.token.decode = orgMagicTokenDecode;
      magic.token.validate = orgMagicTokenValidate;
    });
    test("success", async () => {
      const loginDate = new Date();
      loginDate.setHours(loginDate.getHours() - 1); // Loginしたのは1時間前
      const now = new Date();
      const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
      const user = await prisma.user.create({
        data: {
          name: "test",
          email: "test@test",
          magicSessions: {
            create: {
              issuer: issuer,
              lastLoginAt: loginDate,
            },
          },
        },
      });
      (magic.token.validate as jest.Mock) = jest.fn().mockReturnValue(true);
      (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
      const ret = await validateToken("02hoge");
      expect(ret).not.toBeNull();
      if (ret) {
        expect(ret).toEqual(user);
      }
    });
    test("validate failed", async () => {
      (magic.token.validate as jest.Mock) = jest.fn().mockReturnValue(false);
      const ret = await validateToken("02hoge");
      expect(ret).toBeNull();
    });
    test("replay attack protection", async () => {
      const loginDate = new Date();
      loginDate.setHours(loginDate.getHours() - 1); // Loginしたのは1時間前
      const issuedAt = new Date();
      issuedAt.setHours(issuedAt.getHours() - 2); // 2時間前に作ったトークン
      const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
      await prisma.user.create({
        data: {
          name: "test",
          email: "test@test",
          magicSessions: {
            create: {
              issuer: issuer,
              lastLoginAt: loginDate,
            },
          },
        },
      });
      (magic.token.validate as jest.Mock) = jest.fn().mockReturnValue(true);
      (magic.token.decode as jest.Mock) = decodeMock(issuedAt, issuer);
      const ret = await validateToken("02hoge");
      expect(ret).toBeNull();
    });
    // TODO FEのMagicSDKが生成するDidTokenが悪い
    test("loginAt -2 seconds didToken is valid", async () => {
      const loginDate = new Date();
      const issuedAt = new Date(loginDate);
      issuedAt.setSeconds(issuedAt.getSeconds() - 2); // login -2 seconds
      const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
      const user = await prisma.user.create({
        data: {
          name: "test",
          email: "test@test",
          magicSessions: {
            create: {
              issuer: issuer,
              lastLoginAt: loginDate,
            },
          },
        },
      });
      (magic.token.validate as jest.Mock) = jest.fn().mockReturnValue(true);
      (magic.token.decode as jest.Mock) = decodeMock(issuedAt, issuer);
      const ret = await validateToken("02hoge");
      expect(ret).not.toBeNull();
      if (ret) {
        expect(ret).toEqual(user);
      }
    });
  });
  test("loginAt -3 seconds didToken is invalid", async () => {
    const loginDate = new Date();
    const issuedAt = new Date(loginDate);
    issuedAt.setSeconds(issuedAt.getSeconds() - 3); // login -3 seconds
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    const user = await prisma.user.create({
      data: {
        name: "test",
        email: "test@test",
        magicSessions: {
          create: {
            issuer: issuer,
            lastLoginAt: loginDate,
          },
        },
      },
    });
    (magic.token.validate as jest.Mock) = jest.fn().mockReturnValue(true);
    (magic.token.decode as jest.Mock) = decodeMock(issuedAt, issuer);
    const ret = await validateToken("02hoge");
    expect(ret).toBeNull();
    if (ret) {
      expect(ret).toEqual(user);
    }
  });
  test("not exist session record", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    (magic.token.validate as jest.Mock) = jest.fn().mockReturnValue(true);
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    const ret = await validateToken("02hoge");
    expect(ret).toBeNull();
  });
});

describe("hashSessionToken", () => {
  test("hello world", () => {
    const testInput = "hello world";
    const result = hashSessionToken(testInput);
    expect(result).toEqual(
      "0e329bc71666c046f1829b54b73d146f16b339b9d6b772f81b8b5bc888df2f7d",
    );
  });
});
