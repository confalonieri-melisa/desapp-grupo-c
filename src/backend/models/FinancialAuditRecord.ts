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

export interface FinancialAuditRecordProps {
  id?: string;
  operationId: string;
  actorUserId: string;
  action: "TOKEN_BUY" | "TOKEN_SELL";
  previousState: FinancialStateSnapshot;
  newState: FinancialStateSnapshot;
  correlationId?: string;
  createdAt?: Date;
}

export class FinancialAuditRecord {
  readonly id: string;
  readonly operationId: string;
  readonly actorUserId: string;
  readonly action: "TOKEN_BUY" | "TOKEN_SELL";
  readonly previousState: FinancialStateSnapshot;
  readonly newState: FinancialStateSnapshot;
  readonly correlationId?: string;
  readonly createdAt: Date;

  constructor(props: FinancialAuditRecordProps) {
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
