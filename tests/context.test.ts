import { bindRequestContext, ContextImpl } from "../src/context";
import prisma from "../src/prisma";
import { IconType, Prisma, User } from "@prisma/client";
import { mockReq } from "sinon-express-mock";
import { createContext } from "../src/context";
import { createUser, eraseDatabase } from "./test_helper";
import { generateAccessToken } from "../src/helpers/token";
import {
  TokenExpiredUseCaseError,
  TokenLockedUseCaseError,
} from "../src/use_cases/errors";
import { setTimeout } from "timers/promises";
import {
  AkiverseIdTokenPayload,
  // Mockのためignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifyIdToken,
} from "../src/helpers/firebase_auth";
import { InvalidArgumentResolverError } from "../src/apps/server/apis/resolvers/errors";

class testItem {
  constructor(id: string | null) {
    this.userId = id;
  }
  userId: string | null;
}

const dummyUser: User = {
  id: "dummy",
  name: "dummy_name",
  email: "dummy_email",
  createdAt: new Date(),
  updatedAt: new Date(),
  akirBalance: new Prisma.Decimal("1"),
  akvBalance: new Prisma.Decimal("2"),
  terasBalance: new Prisma.Decimal("3"),
  tickets: 4,
  walletAddress: "dummy_wallet",
  iconType: IconType.IN_WORLD,
  iconSubCategory: "DEFAULT",
  frameSubCategory: "DEFAULT",
  titleSubCategory: "DEFAULT",
  lockedAt: null,
  receiveBulkEmail: true,
  admin: false,
  unsubscribeToken: "826a50f1-c67e-4ac0-8179-ba4390acf38e",
};
describe("currentUserOwns", () => {
  describe("1 item", () => {
    test("owned", () => {
      const ctx = new ContextImpl(prisma);
      ctx.accessToken = {
        tokenUse: "api",
        userId: dummyUser.id,
        walletAddress: dummyUser.walletAddress
          ? dummyUser.walletAddress
          : undefined,
        locked: false,
      };
      const item = new testItem(dummyUser.id);
      expect(ctx.currentUserOwns(item)).toBeTruthy();
    });
    test("not owned", () => {
      const ctx = new ContextImpl(prisma);
      ctx.accessToken = {
        tokenUse: "api",
        userId: dummyUser.id,
        walletAddress: dummyUser.walletAddress
          ? dummyUser.walletAddress
          : undefined,
        locked: false,
      };
      const item = new testItem("not owned");
      expect(ctx.currentUserOwns(item)).toBeFalsy();
    });
    test("item user is null", () => {
      const ctx = new ContextImpl(prisma);
      ctx.accessToken = {
        tokenUse: "api",
        userId: dummyUser.id,
        walletAddress: dummyUser.walletAddress
          ? dummyUser.walletAddress
          : undefined,
        locked: false,
      };
      const item = new testItem(null);
      expect(ctx.currentUserOwns(item)).toBeFalsy();
    });
    test("Context.user is undefined", () => {
      const ctx = new ContextImpl(prisma);
      const item = new testItem(dummyUser.id);
      expect(ctx.currentUserOwns(item)).toBeFalsy();
    });
  });
  describe("multi items", () => {
    test("owned", () => {
      const ctx = new ContextImpl(prisma);
      ctx.accessToken = {
        tokenUse: "api",
        userId: dummyUser.id,
        walletAddress: dummyUser.walletAddress
          ? dummyUser.walletAddress
          : undefined,
        locked: false,
      };
      const item1 = new testItem(dummyUser.id);
      const item2 = new testItem(dummyUser.id);
      const item3 = new testItem(dummyUser.id);
      expect(ctx.currentUserOwns(item1, item2, item3)).toBeTruthy();
    });
    test("1 item other user owned", () => {
      const ctx = new ContextImpl(prisma);
      ctx.accessToken = {
        tokenUse: "api",
        userId: dummyUser.id,
        walletAddress: dummyUser.walletAddress
          ? dummyUser.walletAddress
          : undefined,
        locked: false,
      };
      const item1 = new testItem(dummyUser.id);
      const item2 = new testItem("not owned");
      const item3 = new testItem(dummyUser.id);
      expect(ctx.currentUserOwns(item1, item2, item3)).toBeFalsy();
    });
    test("all items other user owned", () => {
      const ctx = new ContextImpl(prisma);
      ctx.accessToken = {
        tokenUse: "api",
        userId: dummyUser.id,
        walletAddress: dummyUser.walletAddress
          ? dummyUser.walletAddress
          : undefined,
        locked: false,
      };
      const item1 = new testItem("not owned");
      const item2 = new testItem("not owned");
      const item3 = new testItem("not owned");
      expect(ctx.currentUserOwns(item1, item2, item3)).toBeFalsy();
    });
    test("Context.user is undefined", () => {
      const ctx = new ContextImpl(prisma);
      const item1 = new testItem(dummyUser.id);
      const item2 = new testItem(dummyUser.id);
      const item3 = new testItem(dummyUser.id);
      expect(ctx.currentUserOwns(item1, item2, item3)).toBeFalsy();
    });
  });
});

describe("createContext", () => {
  beforeEach(async () => {
    await eraseDatabase();
  });
  afterEach(() => {
    jest.resetAllMocks();
  });
  describe("original auth context", () => {
    // TODO FirebaseAuthのInvalidTokenはOriginal Authのテストで検証されている
    test("auth success", async () => {
      const user = await createUser();
      const accessToken = generateAccessToken(user);
      const req = mockReq({
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      bindRequestContext(req, null, () => {});

      // 当日初回
      const ctx = await createContext({ req });
      expect(ctx.userId).toEqual(user.id);
      const logs = await prisma.accessLog.findMany({});
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toEqual(user.id);
      expect(logs[0].accessCount).toEqual(1);

      // 当日2回目
      const ctx2 = await createContext({ req });
      expect(ctx2.userId).toEqual(user.id);
      const logs2 = await prisma.accessLog.findMany({});
      expect(logs2).toHaveLength(1);
      expect(logs2[0].userId).toEqual(user.id);
      expect(logs2[0].accessCount).toEqual(2);
    });
    test("auth failed", async () => {
      const req = mockReq({
        headers: {
          authorization: "Bearer hoge",
        },
      });
      bindRequestContext(req, null, () => {});
      await expect(createContext({ req })).rejects.toThrow(
        InvalidArgumentResolverError,
      );
    });
    test("no authorization header", async () => {
      const req = mockReq({
        headers: {},
      });
      bindRequestContext(req, null, () => {});
      const ctx = await createContext({ req });
      expect(ctx.userId).toBeUndefined();
    });
    test("expired token", async () => {
      const user = await createUser();
      const accessToken = generateAccessToken(user, { expiresIn: "1s" });
      await setTimeout(2000);
      const req = mockReq({
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      bindRequestContext(req, null, () => {});
      const ctx = await createContext({ req });
      expect(ctx.userId).toBeUndefined();
    });
  });
  describe("firebase auth context", () => {
    beforeEach(async () => {
      await eraseDatabase();
    });
    afterAll(() => {
      jest.resetAllMocks();
    });
    test("success", async () => {
      const user = await createUser();
      const retValue: AkiverseIdTokenPayload = {
        uid: "firebaseID",
        admin: false,
        akiverseId: user.id,
        locked: false,
        walletAddress: user.walletAddress ? user.walletAddress : undefined,
        email: user.email,
      };
      (verifyIdToken as jest.Mock) = jest.fn().mockReturnValue(retValue);
      const req = mockReq({
        headers: {
          authorization: `Bearer dummy`,
        },
      });

      bindRequestContext(req, null, () => {});
      const ctx = await createContext({ req });
      expect(ctx.userId).toEqual(user.id);

      expect(ctx.userId).toEqual(user.id);
      const logs = await prisma.accessLog.findMany({});
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toEqual(user.id);
      expect(logs[0].accessCount).toEqual(1);

      // 当日2回目
      const ctx2 = await createContext({ req });
      expect(ctx2.userId).toEqual(user.id);
      const logs2 = await prisma.accessLog.findMany({});
      expect(logs2).toHaveLength(1);
      expect(logs2[0].userId).toEqual(user.id);
      expect(logs2[0].accessCount).toEqual(2);
    });
    test("token expired", async () => {
      (verifyIdToken as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new TokenExpiredUseCaseError());
      const req = mockReq({
        headers: {
          authorization: `Bearer dummy`,
        },
      });

      bindRequestContext(req, null, () => {});
      const ctx = await createContext({ req });
      expect(ctx.userId).toBeUndefined();
    });
    test("account locked", async () => {
      (verifyIdToken as jest.Mock) = jest
        .fn()
        .mockRejectedValue(new TokenLockedUseCaseError());
      const req = mockReq({
        headers: {
          authorization: `Bearer dummy`,
        },
      });

      bindRequestContext(req, null, () => {});
      await expect(createContext({ req })).rejects.toThrow(
        TokenLockedUseCaseError,
      );
    });
  });
});
