export class GovernanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GovernanceError';
  }
}

export class ValidationError extends GovernanceError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends GovernanceError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends GovernanceError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
