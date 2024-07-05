import { User } from "@prisma/client";
import jwt, {
  JsonWebTokenError,
  SignOptions,
  TokenExpiredError,
  VerifyOptions,
} from "jsonwebtoken";
import prisma from "../prisma";
import { nowAddDays } from "./datetime";
import { ACCESS_TOKEN_SECRET, ROVI_PLAY_TOKEN_SECRET } from "../constants";
import {
  AbstractUseCaseError,
  InvalidArgumentUseCaseError,
  TokenExpiredUseCaseError,
  UnhandledUseCaseError,
} from "../use_cases/errors";
import { randomBytes } from "node:crypto";
import { hashSessionToken } from "./auth";

type AccessTokenPayload = {
  sub: string; // UserId
  token_use: "api";
  wallet_address?: string;
  locked: boolean;
};

// 今後Payloadの種類が追加される可能性を考慮
type Payload = AccessTokenPayload;

const signOptions: SignOptions = {
  algorithm: "HS256",
};

const verifyOptions: VerifyOptions = {
  algorithms: ["HS256"],
  issuer: "akiverse",
};

/** @deprecated Firebase移行後に削除します */
export function generateAccessToken(user: User, options = {}): string {
  const payload: Payload = {
    sub: user.id,
    token_use: "api",
    locked: !!user.lockedAt,
  };
  if (user.walletAddress) {
    payload.wallet_address = user.walletAddress;
  }

  return jwt.sign(
    {
      ...payload,
    },
    ACCESS_TOKEN_SECRET,
    {
      ...signOptions,
      expiresIn: "15m",
      issuer: "akiverse",
      ...options,
    },
  );
}

/** @deprecated Firebase移行後に削除します */
export async function generateRefreshToken(user: User): Promise<string> {
  const bytes: Buffer = randomBytes(16);
  const token: string = bytes.toString("hex");
  const hashed = hashSessionToken(token);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashed,
      expiresAt: nowAddDays(90),
    },
  });
  return token;
}

export async function generateRoviGamePlayToken(
  playId: string,
  data: string,
): Promise<string> {
  const payload: RoviGamePlayTokenPayload = {
    sub: playId,
    token_use: "rovi",
    data: data,
  };

  return jwt.sign(
    {
      ...payload,
    },
    ROVI_PLAY_TOKEN_SECRET,
    {
      ...signOptions,
      expiresIn: "10m",
      issuer: "akiverse",
    },
  );
}

/** @deprecated Firebase移行後に削除します */
export type ApiAccessTokenPayload = {
  tokenUse: "api";
  userId: string;
  walletAddress?: string;
  locked: boolean;
};

export type RoviGamePlayTokenPayload = {
  token_use: "rovi";
  sub: string; // playId=uuid
  data: string;
};

export type FirebaseIdTokenPayload = {
  uid: string;
  admin: boolean;
  akiverseId: string;
  walletAddress?: string;
  locked: boolean;
};

/** @deprecated Firebase移行後に削除します */
export function verifyToken(token: string): ApiAccessTokenPayload {
  try {
    const decoded = jwt.verify(
      token,
      ACCESS_TOKEN_SECRET,
      verifyOptions,
    ) as any;
    if (decoded.token_use) {
      if (decoded.token_use === "api") {
        return {
          tokenUse: "api",
          userId: decoded.sub,
          walletAddress: decoded.wallet_address,
          locked: decoded.locked,
        };
      }
    }
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new TokenExpiredUseCaseError();
    }
    if (e instanceof JsonWebTokenError) {
      throw new InvalidArgumentUseCaseError("accessToken is invalid");
    }
    if (e instanceof AbstractUseCaseError) {
      throw e;
    }
    throw new UnhandledUseCaseError("verify access token failed", e);
  }
  throw new UnhandledUseCaseError("tokenUseType unknown");
}

export function verifyRoviGamePlayToken(
  token: string,
): RoviGamePlayTokenPayload {
  try {
    const decoded = jwt.verify(
      token,
      ROVI_PLAY_TOKEN_SECRET,
      verifyOptions,
    ) as any;
    if (decoded.token_use) {
      if (decoded.token_use === "rovi") {
        return {
          sub: decoded.sub,
          data: decoded.data,
          token_use: "rovi",
        };
      }
    }
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      throw new TokenExpiredUseCaseError();
    }
    if (e instanceof JsonWebTokenError) {
      throw new InvalidArgumentUseCaseError("accessToken is invalid");
    }
    if (e instanceof AbstractUseCaseError) {
      throw e;
    }
    throw new UnhandledUseCaseError("verify access token failed", e);
  }
  throw new UnhandledUseCaseError("tokenUseType unknown");
}
