import { AuthChecker } from "type-graphql";
import { Context } from "../../context";
import { ApolloError } from "apollo-server-errors";
import { InternalServerResolverError } from "./apis/resolvers/errors";

export enum ROLES {
  ADMIN = "ADMIN",
}

export class AuthenticationError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "UNAUTHENTICATED", extensions);

    Object.defineProperty(this, "name", { value: "AuthenticationError" });
  }
}

export class UserLockedError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "USER_LOCKED", extensions);

    Object.defineProperty(this, "name", { value: "UserLockedError" });
  }
}

/**
 * リゾルバーに @Authorized(),@Authorized("RoleName")のような形で指定し、認証状態を返す.
 * @param userId AkiverseのUserId
 * @param locked ロック状態
 * @param isAdmin アドミン権限持ちかどうか
 * @param roles 許可ロール
 */
export const authChecker: AuthChecker<Context> = (
  { context: { userId, locked, isAdmin } },
  roles,
) => {
  if (!userId) {
    throw new AuthenticationError("user not authenticated");
  }

  if (locked) {
    throw new UserLockedError("user locked");
  }

  if (roles.length === 0) {
    // ロール指定なし=認証されていればOK
    return true;
  }
  if (roles.includes(ROLES.ADMIN)) {
    return isAdmin;
  }

  // ここまできたら実装がおかしい
  throw new InternalServerResolverError("unknown role type");
};
