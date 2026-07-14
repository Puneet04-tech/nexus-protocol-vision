export class ConflictResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictResolutionError';
    Object.setPrototypeOf(this, ConflictResolutionError.prototype);
  }
}

export class ConflictNotFoundError extends ConflictResolutionError {
  constructor(conflictId: string) {
    super(`Conflict with ID '${conflictId}' not found.`);
    this.name = 'ConflictNotFoundError';
    Object.setPrototypeOf(this, ConflictNotFoundError.prototype);
  }
}

export class VersionNotFoundError extends ConflictResolutionError {
  constructor(nodeId: string, version: number) {
    super(`Version ${version} of node '${nodeId}' not found in history.`);
    this.name = 'VersionNotFoundError';
    Object.setPrototypeOf(this, VersionNotFoundError.prototype);
  }
}

export class InvalidStrategyError extends ConflictResolutionError {
  constructor(strategy: string) {
    super(`Resolution strategy '${strategy}' is invalid or not supported in this context.`);
    this.name = 'InvalidStrategyError';
    Object.setPrototypeOf(this, InvalidStrategyError.prototype);
  }
}

export class ValidationError extends ConflictResolutionError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class UnauthorizedError extends ConflictResolutionError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
