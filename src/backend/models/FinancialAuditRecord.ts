export interface FinancialStateSnapshot {
  investor: {
    creditBalance: number;
    quantity: number;
    averagePurchasePrice: number;
  };
  pool: {
    creditBalance: number;
    quantity: number;
  };
}

export interface P2PFinancialStateSnapshot {
  buyer: {
    creditBalance: number;
    quantity: number;
    averagePurchasePrice: number;
  };
  seller: {
    creditBalance: number;
    quantity: number;
    averagePurchasePrice: number;
  };
}

export type AuditStateSnapshot = FinancialStateSnapshot | P2PFinancialStateSnapshot;

export interface FinancialAuditRecordProps<T extends AuditStateSnapshot = FinancialStateSnapshot> {
  id?: string;
  operationId: string;
  actorUserId: string;
  action: "TOKEN_BUY" | "TOKEN_SELL" | "P2P_TRADE";
  previousState: T;
  newState: T;
  correlationId?: string;
  createdAt?: Date;
}

export class FinancialAuditRecord<T extends AuditStateSnapshot = FinancialStateSnapshot> {
  readonly id: string;
  readonly operationId: string;
  readonly actorUserId: string;
  readonly action: "TOKEN_BUY" | "TOKEN_SELL" | "P2P_TRADE";
  readonly previousState: T;
  readonly newState: T;
  readonly correlationId?: string;
  readonly createdAt: Date;

  constructor(props: FinancialAuditRecordProps<T>) {
    this.id = props.id ?? crypto.randomUUID();
    this.operationId = props.operationId;
    this.actorUserId = props.actorUserId;
    this.action = props.action;
    this.previousState = props.previousState;
    this.newState = props.newState;
    this.correlationId = props.correlationId;
    this.createdAt = props.createdAt ?? new Date();
  }
}
