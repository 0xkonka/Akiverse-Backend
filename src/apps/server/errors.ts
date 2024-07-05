import { GraphQLError, GraphQLFormattedError } from "graphql";
import { ValidationError } from "apollo-server-express";
import { INCLUDE_ERROR_DETAIL } from "../../constants";
import { Context } from "../../context";
import { MiddlewareFn } from "type-graphql";
import {
  InternalServerResolverError,
  toResolverError,
} from "./apis/resolvers/errors";
import { Prisma } from "@prisma/client";

/**
 * GraphQLErrorを成形するFunction
 */
export function formatErrorFunc(error: GraphQLError): GraphQLFormattedError {
  // Auto suggestionでカラム名が推測される可能性があるため、エラー詳細を表示しない場合は内容を置き換えてエラーを返す
  if (error instanceof ValidationError) {
    if (INCLUDE_ERROR_DETAIL) {
      return error;
    }
    return new ValidationError("Invalid query");
  }
  return error;
}

/**
 * errorInterceptor.
 * 全てのエラーをキャッチし、Resolver層のエラーとしてハンドリングして投げ返すインターセプター.
 * UseCase系エラー->Resolverエラーへの置き換え.
 * Prismaのスキーマが漏れ出す系エラーの置き換え.
 * ログ出力を実施する.
 *
 * @param context
 * @param next
 */
export const errorInterceptor: MiddlewareFn<Context> = async (
  { context },
  next,
) => {
  try {
    return await next();
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      // スキーマ情報の隠蔽
      const newError = new ValidationError("Invalid query");
      if (INCLUDE_ERROR_DETAIL) {
        newError.originalError = e;
      }
      context.log.warn(e);
      throw newError;
    } else if (
      // キャッチされていないPrisma系エラーの隠蔽
      e instanceof Prisma.PrismaClientKnownRequestError ||
      e instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      const newError = new InternalServerResolverError("database error");
      if (INCLUDE_ERROR_DETAIL) {
        newError.originalError = e;
      }
      context.log.warn(e);
      throw newError;
    } else {
      throw toResolverError(context, e);
    }
  }
};
