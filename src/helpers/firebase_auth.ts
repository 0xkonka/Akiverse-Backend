import { auth } from "firebase-admin";
import {
  NotFoundUseCaseError,
  SameEmailUserExistsUseCaseError,
  TokenClaimUpdatedUseCaseError,
  TokenExpiredUseCaseError,
  TokenInvalidUseCaseErrorr,
  TokenLockedUseCaseError,
} from "../use_cases/errors";
import { Context } from "../context";
import UserRecord = auth.UserRecord;
import { User } from "@prisma/client";
import { getAuth } from "./firebase";

export async function verifyIdTokenForCreateUser(ctx: Context, token: string) {
  return await getAuth().verifyIdToken(token, false);
}

/**
 * トークンを認証します.
 * 認証エラーの場合、ハンドリングすべきエラーはToken〜UseCaseErrorにして返します
 * @param ctx
 * @param token
 */
export async function verifyIdToken(ctx: Context, token: string) {
  try {
    const decoded = await getAuth().verifyIdToken(token, false);
    if (decoded.version < CLAIM_VERSION) {
      // クレーム更新してエラーを返し、FEからリトライしてもらう
      await setUserClaims(ctx, decoded.akiverseId, decoded.uid);
      throw new TokenClaimUpdatedUseCaseError();
    }
    if (!decoded.akiverseId) {
      // メアドでユーザーが存在したらクレームセットする
      const email = decoded.email;
      if (email) {
        const akiverseUser = await ctx.prisma.user.findUnique({
          where: { email: email },
          select: { id: true },
        });
        if (akiverseUser) {
          await setUserClaims(ctx, akiverseUser.id, decoded.uid);
          throw new TokenClaimUpdatedUseCaseError();
        }
      }
      throw new NotFoundUseCaseError("user", "user");
    }
    // decodedのままだとカスタムクレームの型情報がないため置き換える
    const custom: AkiverseIdTokenPayload = {
      uid: decoded.uid,
      locked: decoded.locked,
      akiverseId: decoded.akiverseId,
      walletAddress: decoded.walletAddress,
      admin: decoded.admin,
      email: decoded.email!,
    };
    return custom;
  } catch (e: any) {
    if ("code" in e) {
      switch (e.code) {
        case "auth/id-token-expired":
          throw new TokenExpiredUseCaseError();
        case "auth/id-token-revoked":
          throw new TokenLockedUseCaseError();
        case "auth/invalid-id-token":
          // TODO 独自認証がなくなるまではこのエラーが発生したら独自認証を通す
          throw new TokenInvalidUseCaseErrorr();
      }
    }
    throw e;
  }
}

/**
 * uidで指定されたユーザーのカスタムログイン認証用トークンを生成します
 * @param uid
 * @param override
 */
export async function createCustomToken(uid: string, override = {}) {
  return getAuth().createCustomToken(uid, override);
}

/**
 * firebaseのIDトークンにカスタムクレームを登録します
 * @param ctx
 * @param userId AkiverseUserID
 * @param firebaseId
 */
export async function setUserClaims(
  ctx: Context,
  userId: string,
  firebaseId: string,
): Promise<void> {
  const user = await ctx.prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  return await getAuth().setCustomUserClaims(firebaseId, getClaimsInfo(user));
}

/**
 * メアドからFirebaseのユーザーを作成します
 * @param email
 */
export async function createFirebaseUser(email: string): Promise<string> {
  try {
    const fUser = await getAuth().createUser({
      email: email,
      emailVerified: true,
    });
    return fUser.uid;
  } catch (e: any) {
    if ("code" in e && e.code === "auth/email-already-exists") {
      throw new SameEmailUserExistsUseCaseError();
    }
    throw e;
  }
}

/**
 * メールアドレスからFirebaseのUserRecordを返します
 * @param email
 */
export async function getFirebaseUserByEmail(
  email: string,
): Promise<UserRecord | undefined> {
  try {
    return await getAuth().getUserByEmail(email);
  } catch (e: any) {
    if ("code" in e && e.code === "auth/user-not-found") {
      return;
    }
    throw e;
  }
}

export type AkiverseIdTokenPayload = {
  uid: string; // firebase uid
  admin: boolean;
  akiverseId: string; // akiverseのUsersテーブルのID
  walletAddress?: string;
  locked: boolean;
  email: string;
};

// Claimに値を追加した場合はFEからupdateClaims叩いてもらうためにインクリメントする
export const CLAIM_VERSION = 1;

// Custom Claims
type Claims = {
  version: number;
  admin: boolean;
  akiverseId: string;
  walletAddress?: string;
  locked: boolean;
};

function getClaimsInfo(user: User): Claims {
  return {
    version: CLAIM_VERSION,
    admin: user.admin,
    akiverseId: user.id,
    walletAddress: user.walletAddress ? user.walletAddress : undefined,
    locked: user.lockedAt !== null,
  };
}
