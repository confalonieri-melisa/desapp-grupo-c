import { DomainValidationError } from "./errors";

export type MarketOperationType = "BUY" | "SELL";

export interface MarketOperationProps {
  id?: string;
  type: MarketOperationType;
  investorId: string;
  playerId: string;
  quoteId: string;
  quoteValue: number;
  quantity: number;
  unit?: string;
  correlationId?: string;
  createdAt?: Date;
}

export class MarketOperation {
  readonly id: string;
  readonly type: MarketOperationType;
  readonly investorId: string;
  readonly playerId: string;
  readonly quoteId: string;
  readonly quoteValue: number;
  readonly quantity: number;
  readonly total: number;
  readonly unit: string;
  readonly correlationId?: string;
  readonly createdAt: Date;

  constructor(props: MarketOperationProps) {
    if (props.type !== "BUY" && props.type !== "SELL") {
      throw new DomainValidationError("Invalid market operation type");
    }
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new DomainValidationError("Operation quantity must be positive");
    }
    if (!Number.isFinite(props.quoteValue) || props.quoteValue <= 0) {
      throw new DomainValidationError("Operation quote must be positive");
    }

    this.id = props.id ?? crypto.randomUUID();
    this.type = props.type;
    this.investorId = props.investorId;
    this.playerId = props.playerId;
    this.quoteId = props.quoteId;
    this.quoteValue = props.quoteValue;
    this.quantity = props.quantity;
    this.total = roundMoney(this.quantity * this.quoteValue);
    this.unit = props.unit ?? "CREDIT_PER_TOKEN";
    this.correlationId = props.correlationId;
    this.createdAt = props.createdAt ?? new Date();
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
