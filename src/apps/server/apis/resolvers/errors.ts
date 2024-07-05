import { ApolloError, toApolloError } from "apollo-server-errors";
import { Context } from "../../../../context";
import {
  ConflictUseCaseError,
  ExtractItemInsufficientUseCaseError,
  IllegalStateUseCaseError,
  InvalidArgumentUseCaseError,
  NotFoundUseCaseError,
  PermissionDeniedUseCaseError,
  StateChangeUseCaseError,
  TokenClaimUpdatedUseCaseError,
  TokenExpiredUseCaseError,
} from "../../../../use_cases/errors";

export class NotFoundResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "NOT_FOUND", extensions);

    Object.defineProperty(this, "name", { value: "NotFoundError" });
  }
}

export class IllegalStateResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "ILLEGAL_STATE", extensions);

    Object.defineProperty(this, "name", { value: "IllegalStateError" });
  }
}

export class ConflictResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "CONFLICT", extensions);

    Object.defineProperty(this, "name", { value: "ConflictError" });
  }
}

export class PermissionDeniedResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "PERMISSION_DENIED", extensions);

    Object.defineProperty(this, "name", { value: "PermissionDeniedError" });
  }
}

export class InvalidArgumentResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "INVALID_ARGUMENT", extensions);

    Object.defineProperty(this, "name", { value: "InvalidArgumentError" });
  }
}

export class InternalServerResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "INTERNAL_SERVER_ERROR", extensions);

    Object.defineProperty(this, "name", { value: "InternalServerError" });
  }
}

export class StateChangeResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "STATE_CHANGE", extensions);

    Object.defineProperty(this, "name", { value: "StateChangeError" });
  }
}

export class ExtractItemInsufficientResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "EXTRACT_ITEM_INSUFFICIENT", extensions);

    Object.defineProperty(this, "name", {
      value: "ExtractItemInsufficientError",
    });
  }
}

export class TokenExpiredResolverError extends ApolloError {
  constructor(message: string, extensions?: Record<string, any>) {
    super(message, "TOKEN_EXPIRED", extensions);

    Object.defineProperty(this, "name", {
      value: "TokenExpiredResolverError",
    });
  }
}

export class TokenClaimUpdatedResolverError extends ApolloError {
  constructor(extensions?: Record<string, any>) {
    super("Claim updated.Please force refresh", "CLAIM_UPDATED", extensions);

    Object.defineProperty(this, "name", {
      value: "TokenClaimUpdatedResolverError",
    });
  }
}

export function toResolverError(ctx: Context, e: any): any {
  let returnError;
  let putErrorLog = false;
  if (e instanceof NotFoundUseCaseError) {
    returnError = new NotFoundResolverError("resource not found", {
      resource_name: e.resource,
    });
    returnError.originalError = e;
  } else if (e instanceof IllegalStateUseCaseError) {
    returnError = new IllegalStateResolverError(e.message);
    returnError.originalError = e;
  } else if (e instanceof InvalidArgumentUseCaseError) {
    returnError = new InvalidArgumentResolverError(e.message);
    returnError.originalError = e;
  } else if (e instanceof ConflictUseCaseError) {
    returnError = new ConflictResolverError(e.message);
    returnError.originalError = e;
  } else if (e instanceof PermissionDeniedUseCaseError) {
    returnError = new PermissionDeniedResolverError(e.message);
    returnError.originalError = e;
  } else if (e instanceof StateChangeUseCaseError) {
    returnError = new StateChangeResolverError(e.message);
    returnError.originalError = e;
  } else if (e instanceof ExtractItemInsufficientUseCaseError) {
    returnError = new ExtractItemInsufficientResolverError(e.message);
    returnError.originalError = e;
  } else if (e instanceof TokenExpiredUseCaseError) {
    returnError = new TokenExpiredResolverError("Token expired");
    returnError.originalError = e;
  } else if (e instanceof TokenClaimUpdatedUseCaseError) {
    returnError = new TokenClaimUpdatedResolverError();
    returnError.originalError = e;
  } else if (e instanceof ApolloError) {
    returnError = e;
  } else {
    // 想定していないエラーなのでエラーログに出す
    returnError = toApolloError(e);
    putErrorLog = true;
  }

  if (putErrorLog) {
    ctx.log.error(returnError, "handled error");
  } else {
    ctx.log.warn(returnError, "handled error");
  }

  return returnError;
}
