import { createUser, eraseDatabase } from "../test_helper";
import { hashSessionToken, magic } from "../../src/helpers/auth";
import {
  decodeMock,
  getIssuerMock,
  getMetadataMock,
  validateMock,
} from "./helper";
import { LoginUseCaseImpl } from "../../src/use_cases/login_usecase";
import { createMockContextNonAuth } from "../mock/context";
import {
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  RefreshTokenInvalidUseCaseError,
  UnhandledUseCaseError,
} from "../../src/use_cases/errors";
import Moralis from "moralis";
import prisma from "../../src/prisma";
import { setTimeout } from "timers/promises";

const useCase = new LoginUseCaseImpl();

describe("email login", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    const user = await createUser();
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.token.getIssuer as jest.Mock) = getIssuerMock(issuer);
    (magic.users.getMetadataByToken as jest.Mock) = getMetadataMock(user.email);
    const ctx = createMockContextNonAuth();
    const ret = await useCase.emailLogin(ctx, "test");
    expect(ret.user).toEqual(user);
    expect(ret.accessToken).not.toEqual("");
    expect(ret.refreshToken).not.toEqual("");
  });
  test("illegal didToken(not include email)", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";

    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    (magic.users.getMetadataByToken as jest.Mock) = jest
      .fn()
      .mockResolvedValue({
        email: null,
      });
    const ctx = createMockContextNonAuth();
    await expect(useCase.emailLogin(ctx, "test")).rejects.toThrowError(
      InvalidArgumentUseCaseError,
    );
  });
  test("user not found", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.token.getIssuer as jest.Mock) = getIssuerMock(issuer);
    (magic.users.getMetadataByToken as jest.Mock) =
      getMetadataMock("dummy@mail");
    const ctx = createMockContextNonAuth();
    await expect(useCase.emailLogin(ctx, "test")).rejects.toThrowError(
      NotFoundUseCaseError,
    );
  });
  test("invalid didToken", async () => {
    (magic.token.validate as jest.Mock) = validateMock(false);
    const ctx = createMockContextNonAuth();
    await expect(useCase.emailLogin(ctx, "test")).rejects.toThrowError(
      InvalidArgumentUseCaseError,
    );
  });
});

describe("wallet login", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success", async () => {
    const ctx = createMockContextNonAuth();
    const user = await createUser();
    const moralisSession = await prisma.moralisSession.create({
      data: {
        challengeId: "hoge",
        version: "fuga",
        nonce: "piyo",
        message: "message",
        chain: "chain",
        network: "network",
        expiresAt: new Date(),
        profileId: "pid",
        verified: false,
        walletAddress: user.walletAddress!,
        tokenHash: "hoge",
      },
    });
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: moralisSession.challengeId,
        version: moralisSession.version,
        nonce: moralisSession.nonce,
      },
    });

    const ret = await useCase.walletLogin(
      ctx,
      moralisSession.message,
      "signature",
    );
    expect(ret.user).toEqual(user);
    expect(ret.accessToken).not.toEqual("");
    expect(ret.refreshToken).not.toEqual("");
  });
  test("message/signature invalid", async () => {
    const ctx = createMockContextNonAuth();

    (Moralis.Auth.verify as jest.Mock) = jest
      .fn()
      .mockRejectedValue(Error("test"));

    await expect(
      useCase.walletLogin(ctx, "message", "signature"),
    ).rejects.toThrowError(UnhandledUseCaseError);
  });
  test("moralis session not found", async () => {
    const ctx = createMockContextNonAuth();

    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: "challengeId",
        version: "version",
        nonce: "nonce",
      },
    });
    await expect(
      useCase.walletLogin(ctx, "message", "signature"),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("user not found", async () => {
    const ctx = createMockContextNonAuth();
    const moralisSession = await prisma.moralisSession.create({
      data: {
        challengeId: "hoge",
        version: "fuga",
        nonce: "piyo",
        message: "message",
        chain: "chain",
        network: "network",
        expiresAt: new Date(),
        profileId: "pid",
        verified: false,
        walletAddress: "walletAddress",
        tokenHash: "hoge",
      },
    });
    (Moralis.Auth.verify as jest.Mock) = jest.fn().mockResolvedValue({
      raw: {
        id: moralisSession.challengeId,
        version: moralisSession.version,
        nonce: moralisSession.nonce,
      },
    });
    await expect(
      useCase.walletLogin(ctx, "message", "signature"),
    ).rejects.toThrowError(NotFoundUseCaseError);
  });
});

describe("token refresh", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/old type token", async () => {
    const ctx = createMockContextNonAuth();
    const user = await createUser();
    const oneHourAddedDate = new Date();
    oneHourAddedDate.setHours(oneHourAddedDate.getHours() + 1);
    const refreshToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresAt: oneHourAddedDate,
      },
    });
    const ret = await useCase.tokenRefresh(ctx, refreshToken.id, false);
    expect(ret.accessToken.length).toBeGreaterThan(1);
    expect(ret.firebaseCustomToken.length).toEqual(0);
  });
  test("success/new type token", async () => {
    const ctx = createMockContextNonAuth();
    const user = await createUser();
    const oneHourAddedDate = new Date();
    oneHourAddedDate.setHours(oneHourAddedDate.getHours() + 1);
    const token = "dummyToken";
    const hashed = hashSessionToken(token);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashed,
        expiresAt: oneHourAddedDate,
      },
    });
    const ret = await useCase.tokenRefresh(ctx, token, false);
    expect(ret).not.toEqual("");
    expect(ret.accessToken.length).toBeGreaterThan(1);
    expect(ret.firebaseCustomToken.length).toEqual(0);
  });
  test("success/request firebase token", async () => {
    const ctx = createMockContextNonAuth();
    const user = await createUser();
    const oneHourAddedDate = new Date();
    oneHourAddedDate.setHours(oneHourAddedDate.getHours() + 1);
    const token = "dummyToken";
    const hashed = hashSessionToken(token);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashed,
        expiresAt: oneHourAddedDate,
      },
    });
    const ret = await useCase.tokenRefresh(ctx, token, true);
    expect(ret).not.toEqual("");
    expect(ret.accessToken.length).toBeGreaterThan(1);
    expect(ret.firebaseCustomToken.length).toBeGreaterThan(1);
  });
  test("refresh token not found", async () => {
    const ctx = createMockContextNonAuth();
    const dummyToken = "test dummy token";
    await expect(
      useCase.tokenRefresh(ctx, dummyToken, false),
    ).rejects.toThrowError(IllegalStateUseCaseError);
  });
  test("refresh token expired", async () => {
    const ctx = createMockContextNonAuth();
    const user = await createUser();
    const now = new Date();
    await setTimeout(1000);
    const token = "dummyToken";
    const hashed = hashSessionToken(token);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashed,
        expiresAt: now,
      },
    });
    await expect(useCase.tokenRefresh(ctx, token, false)).rejects.toThrowError(
      IllegalStateUseCaseError,
    );
  });
  test("token is not null", async () => {
    const ctx = createMockContextNonAuth();
    const user = await createUser();
    const oneHourAddedDate = new Date();
    oneHourAddedDate.setHours(oneHourAddedDate.getHours() + 1);
    const refreshToken = await prisma.refreshToken.create({
      data: {
        userId: user.id,
        expiresAt: oneHourAddedDate,
        tokenHash: "test",
      },
    });
    await expect(
      useCase.tokenRefresh(ctx, refreshToken.id, false),
    ).rejects.toThrowError(RefreshTokenInvalidUseCaseError);
  });
});
