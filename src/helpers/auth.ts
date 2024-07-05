import { User } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import prisma from "../prisma";
import {
  MAGIC_SESSION_PREFIX,
  MORALIS_SESSION_PREFIX,
  SESSION_TOKEN_SALT,
} from "../constants";
import { Magic } from "@magic-sdk/admin";
import { warn } from "../utils";

export const magic = new Magic(process.env.MAGIC_SECRET_KEY);

// セッショントークンを認証して関連のユーザーを返却する
export async function validateToken(hexToken: string): Promise<User | null> {
  // トークンの種類を区別する
  const tokenPrefix = hexToken.slice(0, 2);
  if (tokenPrefix === MORALIS_SESSION_PREFIX) {
    // Moralisの場合
    const tokenHash = hashSessionToken(hexToken);
    // TODO: joinを使ってクエリーを減らす
    const session = await prisma.moralisSession.findUnique({
      where: { tokenHash },
    });
    if (session?.verified) {
      const { walletAddress } = session;
      return prisma.user.findUnique({ where: { walletAddress } });
    }
  } else if (tokenPrefix === MAGIC_SESSION_PREFIX) {
    // Magic(mail)の場合
    const magicToken = hexToken.substring(2);
    try {
      if (!validateMagicToken(magicToken)) {
        return null;
      }
      const decodedToken = magic.token.decode(magicToken);
      const session = await prisma.magicSession.findUnique({
        where: { issuer: decodedToken[1].iss },
        include: { user: true },
      });
      if (!session) {
        return null;
      }
      const issuedAt = unixSecondToDate(decodedToken[1].iat);
      if (issuedAt < session.lastLoginAt) {
        // Replay attack protection
        // 最終ログインより古いTokenでのアクセスは未認証扱い
        // 複数の端末でログインすると後勝ちになる

        // TODO MagicのクライアントSDKで連続してDidTokenを発行すると、前のDidTokenより古いDidTokenが発行されることがあることがわかった。
        // そのため、暫定的に最終ログインより2秒古いDidTokenまで許容する実装を入れる
        const lastLoginAtMinus2Seconds = new Date(session.lastLoginAt);
        lastLoginAtMinus2Seconds.setSeconds(
          lastLoginAtMinus2Seconds.getSeconds() - 2,
        );
        if (issuedAt < lastLoginAtMinus2Seconds) {
          return null;
        }
        warn({
          msg: `old didToken issuedAt:[${issuedAt}] lastLoginAt:[${session.lastLoginAt}] userId:[${session.user?.id}]`,
        });
      }
      return session.user ? session.user : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function unixSecondToDate(sec: number): Date {
  return new Date(sec * 1000);
}

export function hashSessionToken(hexToken: string): string {
  const saltedToken = hexToken + SESSION_TOKEN_SALT;
  return createHash("sha256").update(saltedToken).digest("hex");
}

export function randomSessionToken(prefix: string): string {
  const bytes: Buffer = randomBytes(16);
  const tokenBody: string = bytes.toString("hex");
  return prefix + tokenBody;
}

export function validateMagicToken(didToken: string): boolean {
  try {
    magic.token.validate(didToken);
    return true;
  } catch (e) {
    return false;
  }
}

export function getIssuerByToken(didToken: string): string {
  return magic.token.getIssuer(didToken);
}

export type LoginMetadata = {
  email: string | undefined;
  issuedAt: Date;
};

export async function getMetadataByToken(
  didToken: string,
): Promise<LoginMetadata> {
  const parsedDidToken = magic.token.decode(didToken);
  const userMetadata = await magic.users.getMetadataByToken(didToken);
  return {
    email: userMetadata.email ? userMetadata.email : undefined,
    issuedAt: unixSecondToDate(parsedDidToken[1].iat),
  };
}
