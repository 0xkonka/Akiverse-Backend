import "reflect-metadata";

import { UserUseCaseImpl } from "../../src/use_cases/user_usecase";
import { createUser, eraseDatabase } from "../test_helper";
import { magic } from "../../src/helpers/auth";
import { decodeMock, getMetadataMock, validateMock } from "./helper";
import { createMockContext, createMockContextNonAuth } from "../mock/context";
import prisma from "../../src/prisma";
import { IconType } from "@prisma/client";
import { InvalidArgumentUseCaseError } from "../../src/use_cases/errors";
import {
  ProfilePictureNftUseCase,
  ProfileIcon,
} from "../../src/use_cases/eth_nfts/profile_picture_nft_usecase";
import { Context } from "vm";

class NFTsUseCaseDummy implements ProfilePictureNftUseCase {
  async listProfileIconImages(ctx: Context): Promise<ProfileIcon[]> {
    return [
      {
        name: "icon1",
        tokenId: "icon1",
      },
      {
        name: "icon2",
        tokenId: "icon2",
      },
      {
        name: "icon3",
        tokenId: "icon3",
      },
    ];
  }
}

const useCase = new UserUseCaseImpl(new NFTsUseCaseDummy());
describe("name validator test", () => {
  type test = {
    name: string;
    param: string;
    expected: boolean;
  };
  const tests: test[] = [
    {
      name: "empty",
      param: "",
      expected: false,
    },
    {
      name: "under limitation",
      param: "aBcdEfgH1Jk1Mn0p9Rst",
      expected: true,
    },
    {
      name: "over limitation",
      param: "aBcdEfgH1Jk1Mn0p9RstU",
      expected: false,
    },
    {
      name: "Include allowed symbols",
      param: "aBcdEfgH1Jk1Mn0p9_-.",
      expected: true,
    },
    {
      name: "include !",
      param: "a!",
      expected: false,
    },
    {
      name: "禁止ワードを含むが連結されている",
      param: "hogefuck",
      expected: true,
    },
    {
      name: "禁止ワードを含む",
      param: "hoge_fuck",
      expected: false,
    },
    {
      name: "禁止ワードのみ",
      param: "fuck",
      expected: false,
    },
    {
      name: "禁止ワードを含む.記号が連続",
      param: "hoge__--..fuck",
      expected: false,
    },
  ];

  for (const { name, param, expected } of tests) {
    test(name, () => {
      const { valid } = useCase.isValidName(param);
      expect(valid).toBe(expected);
    });
  }
});
describe("createUser", () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/session not exist", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    const emailAddress = "not.exist@test";
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.users.getMetadataByToken as jest.Mock) =
      getMetadataMock(emailAddress);
    const ctx = await createMockContextNonAuth();
    const ret = await useCase.createFromMagic(ctx, "test", "test");
    expect(ret).toMatchObject({
      name: "test",
      email: emailAddress,
    });
    const session = await prisma.magicSession.findUnique({ where: { issuer } });
    expect(session).not.toBeNull();
    if (session) {
      expect(session.issuer).toBe(issuer);
      expect(session.userId).toBe(ret.id);
    }
  });
  test("success/session exist", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    const emailAddress = "not.exist@test";
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.users.getMetadataByToken as jest.Mock) =
      getMetadataMock(emailAddress);

    const beforeSession = await prisma.magicSession.findUnique({
      where: { issuer },
    });
    expect(beforeSession).toBeNull();
    await prisma.magicSession.create({ data: { issuer, lastLoginAt: now } });
    const ctx = await createMockContextNonAuth();
    const ret = await useCase.createFromMagic(ctx, "test", "test");
    expect(ret).toMatchObject({
      name: "test",
      email: emailAddress,
    });
    const session = await prisma.magicSession.findUnique({ where: { issuer } });
    expect(session).not.toBeNull();
    if (session) {
      expect(session.issuer).toBe(issuer);
      expect(session.userId).toBe(ret.id);
    }
  });
  test("same email address user exist", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    const emailAddress = "exist@test";
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    await createUser({ email: emailAddress });
    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.users.getMetadataByToken as jest.Mock) =
      getMetadataMock(emailAddress);
    const ctx = await createMockContextNonAuth();
    await expect(
      useCase.createFromMagic(ctx, "test", "test"),
    ).rejects.toThrowError("same email address user is exist");
  });
  test("invalid didToken", async () => {
    (magic.token.validate as jest.Mock) = validateMock(false);
    const ctx = await createMockContextNonAuth();
    await expect(
      useCase.createFromMagic(ctx, "test", "test"),
    ).rejects.toThrowError("didToken is invalid");
  });
  test("invalid name", async () => {
    const now = new Date();
    const issuer = "did:ethr:0xB2ec9b61699762491b6542278E9dFEC9050f8089";
    const emailAddress = "exist@test";
    (magic.token.decode as jest.Mock) = decodeMock(now, issuer);
    await createUser({ email: emailAddress });
    (magic.token.validate as jest.Mock) = validateMock(true);
    (magic.users.getMetadataByToken as jest.Mock) =
      getMetadataMock(emailAddress);
    const ctx = await createMockContextNonAuth();
    await expect(useCase.createFromMagic(ctx, "test", "")).rejects.toThrowError(
      "Name is limited to 20 characters",
    );
  });
});

describe("update", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  test("success/inWorldIcon", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.collectibleItem.create({
      data: {
        userId: ctx.userId!,
        category: "ICON",
        subCategory: "TEST_ICON",
      },
    });
    const ret = await useCase.update(
      ctx,
      "updated",
      IconType.IN_WORLD,
      "TEST_ICON",
      "DEFAULT",
      "DEFAULT",
    );
    expect(ret.name).toEqual("updated");
    expect(ret.iconType).toEqual(IconType.IN_WORLD);
    expect(ret.iconSubCategory).toEqual("TEST_ICON");
  });
  test("success/nftIcon", async () => {
    const ctx = await createMockContext();
    const ret = await useCase.update(
      ctx,
      "updated",
      IconType.NFT,
      "icon1",
      "DEFAULT",
      "DEFAULT",
    );
    expect(ret.name).toEqual("updated");
    expect(ret.iconType).toEqual(IconType.NFT);
    expect(ret.iconSubCategory).toEqual("icon1");
  });
  test("success/title", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.collectibleItem.create({
      data: {
        userId: ctx.userId!,
        category: "TITLE",
        subCategory: "TEST_TITLE",
      },
    });

    const ret = await useCase.update(
      ctx,
      "updated",
      IconType.IN_WORLD,
      "DEFAULT",
      "TEST_TITLE",
      "DEFAULT",
    );
    expect(ret.name).toEqual("updated");
    expect(ret.iconType).toEqual(IconType.IN_WORLD);
    expect(ret.iconSubCategory).toEqual("DEFAULT");
    expect(ret.titleSubCategory).toEqual("TEST_TITLE");
    expect(ret.frameSubCategory).toEqual("DEFAULT");
  });
  test("success/frame", async () => {
    const ctx = await createMockContext();
    await ctx.prisma.collectibleItem.create({
      data: {
        userId: ctx.userId!,
        category: "FRAME",
        subCategory: "FRAME_TEST",
      },
    });
    const ret = await useCase.update(
      ctx,
      "updated",
      IconType.IN_WORLD,
      "DEFAULT",
      "DEFAULT",
      "FRAME_TEST",
    );

    expect(ret.name).toEqual("updated");
    expect(ret.iconType).toEqual(IconType.IN_WORLD);
    expect(ret.iconSubCategory).toEqual("DEFAULT");
    expect(ret.titleSubCategory).toEqual("DEFAULT");
    expect(ret.frameSubCategory).toEqual("FRAME_TEST");
  });
  test("invalid name", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.update(
        ctx,
        "",
        IconType.IN_WORLD,
        "DEFAULT",
        "DEFAULT",
        "DEFAULT",
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("not held iconSubCategory/inWorldIcon", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.update(
        ctx,
        "updated",
        IconType.IN_WORLD,
        "DUMMY",
        "DEFAULT",
        "DEFAULT",
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("not held iconSubCategory/nft", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.update(
        ctx,
        "updated",
        IconType.NFT,
        "DUMMY",
        "DEFAULT",
        "DEFAULT",
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("not held titleSubCategory", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.update(
        ctx,
        "updated",
        IconType.IN_WORLD,
        "DEFAULT",
        "DUMMY",
        "DEFAULT",
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
  test("not held frameSubCategory", async () => {
    const ctx = await createMockContext();
    await expect(
      useCase.update(
        ctx,
        "updated",
        IconType.IN_WORLD,
        "DEFAULT",
        "DEFAULT",
        "DUMMY",
      ),
    ).rejects.toThrowError(InvalidArgumentUseCaseError);
  });
});
