export abstract class AbstractUseCaseError extends Error {}

export class NotFoundUseCaseError extends AbstractUseCaseError {
  readonly resource: string;
  constructor(message: string, resource: string) {
    super(message);
    this.resource = resource;

    Object.defineProperty(this, "name", { value: "NotFoundUseCaseError" });
  }
}

export class IllegalStateUseCaseError extends AbstractUseCaseError {
  constructor(message: string) {
    super(message);

    Object.defineProperty(this, "name", { value: "IllegalStateUseCaseError" });
  }
}

export class ConflictUseCaseError extends AbstractUseCaseError {
  constructor(message: string) {
    super(message);

    Object.defineProperty(this, "name", { value: "ConflictUseCaseError" });
  }
}

export class InternalServerUseCaseError extends AbstractUseCaseError {
  constructor(message: string) {
    super(message);

    Object.defineProperty(this, "name", {
      value: "InternalServerUseCaseError",
    });
  }
}

export class InvalidArgumentUseCaseError extends AbstractUseCaseError {
  constructor(message: string) {
    super(message);

    Object.defineProperty(this, "name", {
      value: "InvalidArgumentUseCaseError",
    });
  }
}

export class UnhandledUseCaseError extends AbstractUseCaseError {
  readonly cause?: Error | unknown;

  constructor(message: string, cause?: Error | unknown) {
    super(message);
    this.cause = cause;

    Object.defineProperty(this, "name", { value: "UnhandledUseCaseError" });
  }
}

export class PermissionDeniedUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", {
      value: "PermissionDeniedUseCaseError",
    });
  }
}

export class TokenExpiredUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", { value: "TokenExpiredUseCaseError" });
  }
}

export class TokenLockedUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", { value: "TokenLockedUseCaseError" });
  }
}

export class TokenInvalidUseCaseErrorr extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", { value: "TokenInvalidUseCaseErrorr" });
  }
}

export class SameEmailUserExistsUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", {
      value: "SameEmailUserExistsUseCaseError",
    });
  }
}

export class TokenClaimUpdatedUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", {
      value: "TokenClaimUpdatedUseCaseError",
    });
  }
}

export class StateChangeUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", { value: "StateChangeUseCaseError" });
  }
}

export class ExtractItemInsufficientUseCaseError extends AbstractUseCaseError {
  constructor() {
    super();

    Object.defineProperty(this, "name", {
      value: "ExtractItemInsufficientUseCaseError",
    });
  }
}

export class RefreshTokenInvalidUseCaseError extends AbstractUseCaseError {
  message = "refresh token is invalid";
  constructor() {
    super();

    Object.defineProperty(this, "name", {
      value: "RefreshTokenInvalidUseCaseError",
    });
  }
}
