import { DomainValidationError, OfferNotOpenError } from "./errors";

export type P2POfferStatus = "OPEN" | "FILLED" | "CANCELLED";

export interface P2POfferProps {
  id?: string;
  sellerId: string;
  playerId: string;
  quantity: number;
  unitPrice: number;
  status?: P2POfferStatus;
  createdAt?: Date;
  completedAt?: Date;
}

export class P2POffer {
  readonly id: string;
  readonly sellerId: string;
  readonly playerId: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly status: P2POfferStatus;
  readonly createdAt: Date;
  readonly completedAt?: Date;

  constructor(props: P2POfferProps) {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new DomainValidationError("Offer quantity must be a positive integer");
    }
    if (!Number.isFinite(props.unitPrice) || props.unitPrice <= 0) {
      throw new DomainValidationError("Offer price must be positive");
    }
    if (!P2POffer.isValidUnitPrice(props.unitPrice)) {
      throw new DomainValidationError("Offer price must have at most two decimals");
    }
    if (props.status && !["OPEN", "FILLED", "CANCELLED"].includes(props.status)) {
      throw new DomainValidationError("Invalid offer status");
    }

    this.id = props.id ?? crypto.randomUUID();
    this.sellerId = props.sellerId;
    this.playerId = props.playerId;
    this.quantity = props.quantity;
    this.unitPrice = roundMoney(props.unitPrice);
    this.status = props.status ?? "OPEN";
    this.createdAt = props.createdAt ?? new Date();
    this.completedAt = props.completedAt;
  }

  static isValidUnitPrice(value: number): boolean {
    return Number.isFinite(value) && Number(value.toFixed(2)) === value;
  }

  complete(at = new Date()): P2POffer {
    this.ensureOpen();
    return new P2POffer({ ...this, status: "FILLED", completedAt: at });
  }

  cancel(at = new Date()): P2POffer {
    this.ensureOpen();
    return new P2POffer({ ...this, status: "CANCELLED", completedAt: at });
  }

  private ensureOpen(): void {
    if (this.status !== "OPEN") {
      throw new OfferNotOpenError();
    }
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
