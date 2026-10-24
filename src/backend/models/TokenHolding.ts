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

  buy(quantity: number, price: number): TokenHolding {
    TokenHolding.validateQuantity(quantity, false);
    TokenHolding.validatePrice(price);

    const nextQuantity = this.quantity + quantity;
    const nextAverage = calculateWeightedPurchasePrice(
      this.quantity,
      this.averagePurchasePrice,
      quantity,
      price,
      nextQuantity,
    );

    return new TokenHolding({
      id: this.id,
      userId: this.userId,
      playerId: this.playerId,
      quantity: nextQuantity,
      averagePurchasePrice: nextAverage,
    });
  }

  sell(quantity: number): TokenHolding {
    TokenHolding.validateQuantity(quantity, false);
    if (quantity > this.quantity) {
      throw new DomainValidationError("Insufficient token holding");
    }

    const nextQuantity = this.quantity - quantity;
    return new TokenHolding({
      id: this.id,
      userId: this.userId,
      playerId: this.playerId,
      quantity: nextQuantity,
      averagePurchasePrice: nextQuantity === 0 ? 0 : this.averagePurchasePrice,
    });
  }

  currentValueAt(price: number): number {
    TokenHolding.validatePrice(price);
    return roundMoney(this.quantity * price);
  }

  unrealizedPnlAt(price: number): number {
    const currentValue = this.currentValueAt(price);
    const investedValue = this.quantity * this.averagePurchasePrice;
    return roundMoney(currentValue - investedValue);
  }

  private static validateQuantity(quantity: number, allowZero = true): void {
    const isInvalid = !Number.isInteger(quantity) || (allowZero ? quantity < 0 : quantity <= 0);
    if (isInvalid) {
      throw new DomainValidationError(
        allowZero
          ? "Token quantity must be a non-negative integer"
          : "Token quantity must be a positive integer",
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

function calculateWeightedPurchasePrice(
  currentQuantity: number,
  currentAveragePrice: number,
  addedQuantity: number,
  purchasePrice: number,
  nextQuantity: number,
): number {
  if (currentQuantity === 0) return purchasePrice;

  const currentPositionValue = currentQuantity * currentAveragePrice;
  const newPurchaseValue = addedQuantity * purchasePrice;
  const combinedPositionValue = currentPositionValue + newPurchaseValue;
  const weightedAveragePrice = combinedPositionValue / nextQuantity;

  return roundMoney(weightedAveragePrice);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
