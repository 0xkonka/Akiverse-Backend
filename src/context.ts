import { PrismaClient } from "@prisma/client";
import pino from "pino";
import { GraphQLResolveInfo } from "graphql";
import {
  getCommonLoggerFields,
  getContextLogBindings,
  globalLogger,
} from "./logger";
import { Request } from "express";
import prisma from "./prisma";
import { incrementAccessCount } from "./helpers/increment_access_count";
import {
  AbstractUseCaseError,
  InternalServerUseCaseError,
  NotFoundUseCaseError,
  TokenClaimUpdatedUseCaseError,
  TokenExpiredUseCaseError,
  TokenInvalidUseCaseErrorr,
} from "./use_cases/errors";
import {
  ApiAccessTokenPayload,
  FirebaseIdTokenPayload,
  verifyToken,
} from "./helpers/token";
import { verifyIdToken } from "./helpers/firebase_auth";
import { toResolverError } from "./apps/server/apis/resolvers/errors";

type HasOwner = { userId: string | null };

export interface Context {
  currentUserOwns(...items: HasOwner[]): boolean;

  getChildContext(info: GraphQLResolveInfo): Context;

  set accessToken(token: ApiAccessTokenPayload | FirebaseIdTokenPayload);

  get prisma(): PrismaClient;

  get log(): pino.Logger;

  get tokenType(): ContextType;

  get userId(): string | undefined;

  set userId(userId: string | undefined);

  get walletAddress(): string | undefined;

  get locked(): boolean | undefined;

  get country(): string | undefined;

  get ipAddress(): string | undefined;

  get email(): string;

  get firebaseId(): string;

  get isAdmin(): boolean;
}

type ContextType = "api" | "none" | "firebase";

export class ContextImpl implements Context {
  prisma: PrismaClient;
  private _log: pino.Logger;
  private _accessToken?: ApiAccessTokenPayload | FirebaseIdTokenPayload;
  private _userId?: string;
  private _tokenType: ContextType = "none"; //初期はnone
  private _walletAddress?: string;
  private _locked?: boolean;
  private readonly _country?: string;
  private readonly _ipAddress?: string;
  private _email?: string;
  private _claimVersion: number;
  private _firebaseId?: string;
  private _admin?: boolean;

  get log(): pino.Logger {
    return this._log;
  }

  private parent?: Context;

  constructor(
    prisma: PrismaClient,
    bindings = {},
    country?: string,
    ipAddress?: string,
  ) {
    this.prisma = prisma;
    this._log = globalLogger.child(bindings);
    this._country = country;
    this._ipAddress = ipAddress;
    this._claimVersion = 0;
  }

  currentUserOwns(...items: HasOwner[]): boolean {
    // Contextにユーザーがない
    if (!this._userId) {
      return false;
    }

    for (const item of items) {
      if (!item.userId) {
        return false;
      }
      if (this._userId !== item.userId) {
        return false;
      }
    }

    return true;
  }

  /*
   * オペレーション/メソッド名を含んだロガーをセットしたContext(おおよそThreadContext)を返す
   *
   * type-graphqlを利用するとリゾルバーメソッド実行時にContextを生成してくれるが、
   * 1クエリに複数のメソッド呼び出しがかかれているとContextが共有されてしまう(RequestContextが渡される)ため、
   * ログにメソッド名を事前設定できない。
   * そのため、メソッド先頭でこのメソッドを呼び出してThreadContextを作り、以後は生成したContextをもとに
   * 処理をすることで、ログにどのメソッドで出たログかわかるようになる。
   * */
  getChildContext(info: GraphQLResolveInfo): Context {
    const bindings = {
      ...this._log.bindings(),
      ...getCommonLoggerFields(info),
    };
    const ctx = new ContextImpl(
      this.prisma,
      bindings,
      this._country,
      this._ipAddress,
    );
    if (this._accessToken) {
      ctx.accessToken = this._accessToken;
    }
    ctx.parent = this;
    return ctx;
  }

  get userId(): string | undefined {
    return this._userId;
  }

  set userId(userId: string | undefined) {
    this._userId = userId;
  }

  // JWTをでコードしたPayloadを引数にもらい、Contextに詰める
  set accessToken(payload: ApiAccessTokenPayload | FirebaseIdTokenPayload) {
    this._accessToken = payload;
    if ("akiverseId" in payload) {
      // Firebaseのトークン
      this._tokenType = "firebase";
      this._userId = payload.akiverseId;
      this._walletAddress = payload.walletAddress;
      this._locked = payload.locked;
      this._firebaseId = payload.uid;
      this._admin = payload.admin;
    } else {
      // akiverse発行のトークン
      this._tokenType = "api";
      const { userId, walletAddress, locked } = payload;
      this._userId = userId;
      this._walletAddress = walletAddress;
      this._locked = locked;
      this._admin = false;
    }
  }

  get tokenType(): ContextType {
    return this._tokenType;
  }

  get walletAddress(): string | undefined {
    return this._walletAddress;
  }

  get locked(): boolean | undefined {
    return this._locked;
  }

  get country(): string | undefined {
    return this._country;
  }

  get ipAddress(): string | undefined {
    return this._ipAddress;
  }

  get email(): string {
    return this._email || "";
  }

  get firebaseId(): string {
    return this._firebaseId || "";
  }

  get isAdmin(): boolean {
    return this._admin || false;
  }
}

export const createContext: ({
  req,
}: {
  req: Request;
}) => Promise<Context> = async ({ req }) => {
  const token = req.headers.authorization;
  // HttpレイヤーでRequestに格納されたContextを取得
  const ctx = getContext(req);
  if (!ctx) {
    throw new InternalServerUseCaseError("Context not found");
  }

  if (!token) {
    return ctx;
  }
  const split = token.split(" ");
  if (split.length !== 2 || split[0] !== "Bearer") {
    return ctx;
  }

  try {
    // 新 Firebase
    try {
      ctx.accessToken = await verifyIdToken(ctx, split[1]);
      await incrementAccessCount(ctx);
      return ctx;
    } catch (e) {
      if (e instanceof TokenClaimUpdatedUseCaseError) {
        // クレームバージョンが変わったのでクライアントでリフレッシュ後に再度投げてもらう
        throw e;
      }
      if (
        e instanceof TokenExpiredUseCaseError ||
        e instanceof NotFoundUseCaseError
      ) {
        // 未認証のContextを返す
        return ctx;
      }
      if (e instanceof TokenInvalidUseCaseErrorr) {
        // TODO Firebaseのトークンじゃなかった時に発生するため、独自認証へ
      }
      if (e instanceof AbstractUseCaseError) {
        throw e;
      }
    }
    // 旧 独自のセッション認証
    // 十分にこちらを使わなくなったら実装を消してFirebase認証のtry-catchも消す
    ctx.accessToken = verifyToken(split[1]);
    await incrementAccessCount(ctx);
    return ctx;
  } catch (e: unknown) {
    if (e instanceof TokenExpiredUseCaseError) {
      return ctx;
    }
    throw toResolverError(ctx, e);
  }
};

// RequestContextを保持するMap
const _bindings = new WeakMap<Request, Context>();
export default function getContext(req: Request): Context | null {
  return _bindings.get(req) || null;
}

const WAF_COUNTRY_HEADER_NAME = "x-amzn-waf-country-code";
const CF_COUNTRY_HEADER_NAME = "cloudfront-viewer-country";

function bindContext(req: Request): void {
  const countryWaf = req.get(WAF_COUNTRY_HEADER_NAME);
  const countryCf = req.get(CF_COUNTRY_HEADER_NAME);
  const country = countryWaf || countryCf;
  const ipAddress = req.ip;
  _bindings.set(
    req,
    new ContextImpl(
      prisma,
      getContextLogBindings(req, country, ipAddress),
      country,
      ipAddress,
    ),
  );
}

export function bindRequestContext(req: Request, res: any, next: any): void {
  bindContext(req);
  next();
}
