import "reflect-metadata";

import { User } from "@prisma/client";
import { Context } from "../context";
import {
  getIssuerByToken,
  getMetadataByToken,
  hashSessionToken,
  validateMagicToken,
} from "../helpers/auth";
import {
  AbstractUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  RefreshTokenInvalidUseCaseError,
  UnhandledUseCaseError,
} from "./errors";
import Moralis from "moralis";
import { Service } from "typedi";
import { generateAccessToken, generateRefreshToken } from "../helpers/token";
import { Prisma } from "@prisma/client";
import {
  PRISMA_INCONSISTENT_COLUMN,
  PRISMA_NOT_FOUND_ERROR_CODE,
} from "../prisma";
import { validate } from "uuid";
import {
  createCustomToken,
  createFirebaseUser,
  getFirebaseUserByEmail,
  setUserClaims,
} from "../helpers/firebase_auth";

export interface LoginUseCase {
  /** @deprecated Firebaseログイン実装後に削除します*/
  emailLogin(ctx: Context, didToken: string): Promise<LoginResponse>;
  walletLogin(
    ctx: Context,
    message: string,
    signature: string,
  ): Promise<LoginResponse>;

  tokenRefresh(
    ctx: Context,
    refreshToken: string,
    requestFirebase: boolean,
  ): Promise<TokenRefreshResponse>;
  updateClaims(ctx: Context): Promise<void>;
}
export type LoginResponse = {
  user: User;
  /** @deprecated Firebaseログイン実装後に削除 */
  accessToken: string;
  /** @deprecated Firebaseログイン実装後に削除 */
  refreshToken: string;
  firebaseCustomToken: string;
};
@Service("login.useCase")
export class LoginUseCaseImpl implements LoginUseCase {
  /** @deprecated Firebase移行後に削除します*/
  async emailLogin(ctx: Context, didToken: string): Promise<LoginResponse> {
    if (!validateMagicToken(didToken)) {
      throw new InvalidArgumentUseCaseError("didToken is invalid");
    }
    try {
      const { email, issuedAt } = await getMetadataByToken(didToken);
      if (!email) {
        throw new InvalidArgumentUseCaseError(
          "didToken not include email address",
        );
      }
      const issuer = getIssuerByToken(didToken);
      const user = await ctx.prisma.user.findUnique({ where: { email } });
      if (user) {
        const upsertedSession = await ctx.prisma.magicSession.upsert({
          create: {
            issuer: issuer,
            userId: user.id,
            lastLoginAt: issuedAt,
          },
          update: { lastLoginAt: issuedAt },
          where: { issuer: issuer },
          select: { user: true },
        });
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);
        return {
          user: upsertedSession.user!,
          accessToken: accessToken,
          refreshToken: refreshToken,
          // FEにFirebaseログインが実装された状態でここにくることは想定していないので空文字を返す
          firebaseCustomToken: "",
        };
      } else {
        // ユーザーが存在しないのでエラーを返す
        throw new NotFoundUseCaseError("user not found", "User");
      }
    } catch (e: unknown) {
      if (e instanceof AbstractUseCaseError) {
        throw e;
      }
      throw new UnhandledUseCaseError("login failed", e);
    }
  }
  async walletLogin(
    ctx: Context,
    message: string,
    signature: string,
  ): Promise<LoginResponse> {
    let verifiedData;
    try {
      verifiedData = await Moralis.Auth.verify({
        message,
        signature,
        network: "evm",
      });
    } catch (e) {
      throw new UnhandledUseCaseError("moraris throw error", e);
    }

    const { id, version, nonce } = verifiedData.raw;
    try {
      // Save version and nonce
      const session = await ctx.prisma.moralisSession.update({
        where: { challengeId: id },
        data: { version, nonce, verified: true },
      });
      const user = await ctx.prisma.user.findUnique({
        where: { walletAddress: session.walletAddress },
      });
      if (user) {
        const accessToken = generateAccessToken(user);
        const refreshToken = await generateRefreshToken(user);
        // firebase
        const fUser = await getFirebaseUserByEmail(user.email);
        let uid;
        if (!fUser) {
          // ユーザー移行は行わないので、FEのFirebase対応デプロイ後でもFirebaseユーザーが存在しない状態でウォレットログインにくることはあり得るため、
          // 存在しなかったらFirebaseのユーザーも作成してから返す
          uid = await createFirebaseUser(user.email);
          await setUserClaims(ctx, user.id, uid);
        } else {
          uid = fUser.uid;
        }
        const firebaseCustomToken = await createCustomToken(uid);
        return {
          user: user,
          accessToken: accessToken,
          refreshToken: refreshToken,
          firebaseCustomToken: firebaseCustomToken,
        };
      } else {
        throw new NotFoundUseCaseError("user not found", "User");
      }
    } catch (e: unknown) {
      if (e instanceof AbstractUseCaseError) {
        throw e;
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === PRISMA_NOT_FOUND_ERROR_CODE) {
          throw new IllegalStateUseCaseError("session not found");
        }
      }
      throw new UnhandledUseCaseError("wallet login failed", e);
    }
  }

  /** @deprecated Firebase移行後に削除します */
  async tokenRefresh(
    ctx: Context,
    refreshToken: string,
    requestFirebase: boolean,
  ): Promise<TokenRefreshResponse> {
    let record;
    try {
      if (validate(refreshToken)) {
        // refreshTokenがUUID形式だったら古いバージョン
        // TODO true側のロジックは古いリフレッシュトークンを持つ端末がいなくなったら削除すること
        record = await ctx.prisma.refreshToken.findUniqueOrThrow({
          where: {
            id: refreshToken,
            expiresAt: {
              gt: new Date(), // 期限切れは見つからないようにする
            },
          },
          select: {
            tokenHash: true,
            user: true,
          },
        });
        if (record.tokenHash !== null) {
          throw new RefreshTokenInvalidUseCaseError();
        }
      } else {
        // refreshTokenがUUID以外だったら新しいバージョン
        const hashed = hashSessionToken(refreshToken);
        record = await ctx.prisma.refreshToken.findUniqueOrThrow({
          where: {
            tokenHash: hashed,
            expiresAt: {
              gt: new Date(), // 期限切れは見つからないようにする
            },
          },
          select: {
            user: true,
          },
        });
      }
      if (requestFirebase) {
        // Firebase認証に乗り換えるためのロジック
        const fUser = await getFirebaseUserByEmail(record.user.email);
        let uid;
        if (!fUser) {
          // Firebaseのユーザーが存在してない場合は登録する
          uid = await createFirebaseUser(record.user.email);
          await setUserClaims(ctx, record.user.id, uid);
        } else {
          uid = fUser.uid;
        }
        const firebaseCustomAuthToken = await createCustomToken(uid);
        return {
          accessToken: generateAccessToken(record.user),
          firebaseCustomToken: firebaseCustomAuthToken,
        };
      } else {
        return {
          accessToken: generateAccessToken(record.user),
          firebaseCustomToken: "",
        };
      }
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === PRISMA_NOT_FOUND_ERROR_CODE) {
          throw new IllegalStateUseCaseError(
            "refresh token expired or not found",
          );
        }
        if (e.code === PRISMA_INCONSISTENT_COLUMN) {
          throw new RefreshTokenInvalidUseCaseError();
        }
      }
      if (e instanceof RefreshTokenInvalidUseCaseError) {
        throw e;
      }
      throw new UnhandledUseCaseError("token refresh failed", e);
    }
  }

  /**
   * カスタムクレームを更新します
   * @param ctx
   */
  async updateClaims(ctx: Context): Promise<void> {
    await setUserClaims(ctx, ctx.userId!, ctx.firebaseId);
  }
}

export type TokenRefreshResponse = {
  accessToken: string;
  firebaseCustomToken: string;
};
