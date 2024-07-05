import { NotFoundUseCaseError } from "../../../../use_cases/errors";

export abstract class HandlerError extends Error {
  abstract readonly statusCode: number;
}

export class InvalidArgumentHandlerError extends HandlerError {
  readonly statusCode = 400;
  constructor(msg: string, cause?: any) {
    super(msg, cause);
  }
}

export class NotFoundHandlerError extends HandlerError {
  readonly statusCode = 404;
  constructor(msg: string, resource: string) {
    super(msg + " resource:" + resource);
  }
}

export function toHandlerError(e: any): any {
  if (e instanceof NotFoundUseCaseError) {
    return new NotFoundHandlerError("resource not found", e.resource);
  }
  return e;
}
