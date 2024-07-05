import prisma from "../../src/prisma";
import { v4 as uuidv4 } from "uuid";
import { Context, ContextImpl } from "../../src/context";
import { globalLogger } from "../../src/logger";

export async function createMockContext(extraData = {}): Promise<Context> {
  return baseCreateMockContext({
    extraData: extraData,
    accessTokenExtraData: {},
    country: "jp",
    tokenType: "magic",
  });
}

export const createMockContextNonAuth: () => Context = () => {
  return new ContextImpl(prisma, globalLogger.child(globalLogger.bindings()));
};

export async function createLockedMockContext(): Promise<Context> {
  return baseCreateMockContext({
    extraData: {},
    accessTokenExtraData: { locked: true },
    country: "jp",
    tokenType: "magic",
  });
}

export async function createMockFirebaseContext(
  extraData = {},
): Promise<Context> {
  return baseCreateMockContext({
    extraData: extraData,
    accessTokenExtraData: {},
    country: "jp",
    tokenType: "firebase",
  });
}

interface BaseCreateMockContextParams {
  extraData: {};
  accessTokenExtraData: {};
  country?: string;
  tokenType: "magic" | "firebase";
}

export async function baseCreateMockContext({
  extraData = {},
  accessTokenExtraData = {},
  country,
  tokenType,
}: BaseCreateMockContextParams): Promise<Context> {
  const user = await prisma.user.create({
    data: {
      name: "test",
      email: uuidv4(),
      walletAddress: uuidv4(),
      ...extraData,
    },
  });
  const ctx = new ContextImpl(
    prisma,
    globalLogger.child(globalLogger.bindings()),
    country,
  );
  if (tokenType === "magic") {
    ctx.accessToken = {
      tokenUse: "api",
      userId: user.id,
      walletAddress: user.walletAddress ? user.walletAddress : undefined,
      locked: false,
      ...accessTokenExtraData,
    };
  } else {
    ctx.accessToken = {
      akiverseId: user.id,
      walletAddress: user.walletAddress ? user.walletAddress : undefined,
      locked: false,
      uid: "firebase_uid",
      admin: false,
      ...accessTokenExtraData,
    };
  }

  return ctx;
}
