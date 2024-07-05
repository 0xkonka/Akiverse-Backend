import pino from "pino";
import { Context } from "./context";
import { MiddlewareFn } from "type-graphql";
import { v4 as uuid } from "uuid";
import { GraphQLResolveInfo } from "graphql";

const REQUEST_ID_HEADER_NAME = "X-Amzn-Trace-Id";

// container内で吐くのでsyncで出力する
export const globalLogger = pino(
  {
    // refreshTokenが流出すると不正アクセスされる可能性があるのでログに出さない
    redact: ["args.refreshToken"],
  },
  pino.destination({ sync: true }),
);

// log level
// LOG_LEVEL環境変数で上書き可能
globalLogger.level = process.env.LOG_LEVEL || "info";

export function getContextLogBindings(
  req: any,
  country: any,
  ipAddress: any,
): {} {
  const requestId = getRequestId(req);
  return { requestId: requestId, country: country, ipAddress: ipAddress };
}

function getRequestId(req: any): string {
  if (req.headers[REQUEST_ID_HEADER_NAME]) {
    return req.headers[REQUEST_ID_HEADER_NAME];
  }
  return uuid();
}

/**
 * graphQLAccessLogMiddlewareFn.
 * GraphQLのメソッド単位でdurationと成否をログ出力するミドルウェア.
 * @param context Context
 * @param args ArgsDictionary
 * @param info GraphQLResolverIndo
 * @param root Root
 * @param next NextFn
 */
export const graphQLAccessLogMiddlewareFn: MiddlewareFn<Context> = async (
  { context, args, info, root },
  next,
) => {
  /*
   * globalMiddlewareとして設定するが、その場合、Fieldにもすべてミドルウェアが設定されてしまう。
   * rootが存在する時はフィールドに対して動作しているので何もしない。
   * rootが存在しない時はQuery/Mutationのメソッド呼び出し時なのでアクセスログを出力する。
   */
  if (root) {
    return next();
  }

  const start = Date.now();
  let success = true;
  try {
    return await next();
  } catch (e) {
    success = false;
    throw e;
  } finally {
    const duration = Date.now() - start;
    const bindings = getCommonLoggerFields(info);
    context.log.info({ ...bindings, success, duration, args }, "ACCESS_LOG");
  }
};

export function getCommonLoggerFields(info: GraphQLResolveInfo): pino.Bindings {
  return {
    operationType: info.parentType.name,
    methodName: info.fieldName,
  };
}
