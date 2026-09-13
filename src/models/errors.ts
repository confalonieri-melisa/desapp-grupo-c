/**
 * Base abstract class for all domain errors in the system.
 */
export abstract class DomainError extends Error {
  public abstract readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when business validation or domain invariants fail. (HTTP 400)
 */
export class DomainValidationError extends DomainError {
  public readonly statusCode = 400;
}

/**
 * Thrown when an invalid league is provided. (HTTP 400)
 */
export class InvalidLeagueError extends DomainValidationError {
  constructor(league: string, validLeagues: readonly string[]) {
    super(
      `Invalid league: '${league}'. Allowed leagues are: ${validLeagues.join(", ")}.`,
      { league, validLeagues }
    );
  }
}

/**
 * Thrown when authentication fails or Bearer token is missing/invalid. (HTTP 401)
 */
export class UnauthorizedError extends DomainError {
  public readonly statusCode = 401;

  constructor(message: string = "Unauthorized access", details?: unknown) {
    super(message, details);
  }
}

/**
 * Thrown when a requested resource is not found. (HTTP 404)
 */
export class NotFoundError extends DomainError {
  public readonly statusCode = 404;

  constructor(resource: string, identifier: string | number) {
    super(`${resource} with id '${identifier}' was not found.`, {
      resource,
      identifier,
    });
  }
}

/**
 * Thrown when a resource conflict occurs (e.g. email already exists). (HTTP 409)
 */
export class ConflictError extends DomainError {
  public readonly statusCode = 409;

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

/**
 * Formats any caught error into a standardized HTTP error response payload.
 */
export function toHttpErrorResponse(error: unknown): {
  statusCode: number;
  payload: { error: string; statusCode: number; details?: unknown };
} {
  if (error instanceof DomainError) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: error.message,
        statusCode: error.statusCode,
        ...(error.details !== undefined && { details: error.details }),
      },
    };
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  return {
    statusCode: 500,
    payload: {
      error: message,
      statusCode: 500,
    },
  };
}
