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

/** Raised when a holding cannot cover a requested sale. */
export class InsufficientTokenHoldingError extends DomainValidationError {
  constructor() {
    super("Insufficient token holding");
    this.name = "InsufficientTokenHoldingError";
  }
}

/** Raised when an offer cannot transition because it is no longer open. */
export class OfferNotOpenError extends DomainValidationError {
  constructor() {
    super("Offer is no longer open");
    this.name = "OfferNotOpenError";
  }
}
