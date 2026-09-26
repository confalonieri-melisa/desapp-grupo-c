import { DomainValidationError } from "./errors";

export const INITIAL_TOKEN_QUANTITY = 100;
export const INITIAL_TOKEN_PRICE = 1;

export interface TokenHoldingProps {
  id?: string;
  userId: string;
  playerId: string;
  quantity?: number;
  averagePurchasePrice?: number;
  updatedAt?: Date;
}

/** A user's quantity of one player's tokens. */
export class TokenHolding {
  readonly id: string;
  readonly userId: string;
  readonly playerId: string;
  readonly quantity: number;
  readonly averagePurchasePrice: number;
  readonly updatedAt: Date;

  constructor(props: TokenHoldingProps) {
    const quantity = props.quantity ?? 0;
    const averagePurchasePrice =
      props.averagePurchasePrice ?? INITIAL_TOKEN_PRICE;

    TokenHolding.validateQuantity(quantity);
    TokenHolding.validatePrice(averagePurchasePrice);

    this.id = props.id ?? crypto.randomUUID();
    this.userId = props.userId;
    this.playerId = props.playerId;
    this.quantity = quantity;
    this.averagePurchasePrice = averagePurchasePrice;
    this.updatedAt = props.updatedAt ?? new Date();
  }

  /** Creates the initial superuser holding for one player at t0. */
  static initialSeed(userId: string, playerId: string): TokenHolding {
    return new TokenHolding({
      userId,
      playerId,
      quantity: INITIAL_TOKEN_QUANTITY,
      averagePurchasePrice: INITIAL_TOKEN_PRICE,
    });
  }

  private static validateQuantity(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new DomainValidationError(
        "Token quantity must be a non-negative integer",
      );
    }
  }

  private static validatePrice(price: number): void {
    if (!Number.isFinite(price) || price < 0) {
      throw new DomainValidationError(
        "Average purchase price cannot be negative",
      );
    }
  }
}
