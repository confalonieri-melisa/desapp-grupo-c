/** Base error for violations of a domain invariant. */
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainValidationError";
  }
}

/** Raised when a player is assigned to an unsupported league. */
export class InvalidLeagueError extends DomainValidationError {
  constructor(league: string) {
    super(`Unsupported league: ${league}`);
    this.name = "InvalidLeagueError";
  }
}
