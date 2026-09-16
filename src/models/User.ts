import { DomainValidationError } from "./errors";
import { isUserRole, UserRole } from "./enums";

export const INVESTOR_INITIAL_CREDITS = 1000;

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  role?: UserRole;
  creditBalance?: number;
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** User aggregate with account and balance invariants. */
export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly passwordHash?: string;
  readonly createdAt: Date;
  private _creditBalance: number;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    const role = props.role ?? UserRole.INVESTOR;
    const creditBalance = props.creditBalance ?? INVESTOR_INITIAL_CREDITS;

    if (!isUserRole(role)) {
      throw new DomainValidationError("Invalid user role");
    }

    User.validateBalance(creditBalance);

    this.id = props.id ?? crypto.randomUUID();
    this.name = props.name;
    this.email = props.email;
    this.role = role;
    this.passwordHash = props.passwordHash;
    this._creditBalance = creditBalance;
    this.createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? this.createdAt;
  }

  get creditBalance(): number {
    return this._creditBalance;
  }

  hasSufficientBalance(amount: number): boolean {
    User.validatePositiveAmount(amount);
    return this._creditBalance >= amount;
  }

  debit(amount: number): void {
    User.validatePositiveAmount(amount);

    if (!this.hasSufficientBalance(amount)) {
      throw new DomainValidationError("Insufficient credit balance");
    }

    this._creditBalance -= amount;
    this.touch();
  }

  credit(amount: number): void {
    User.validatePositiveAmount(amount);
    this._creditBalance += amount;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  private static validateBalance(balance: number): void {
    if (!Number.isFinite(balance) || balance < 0) {
      throw new DomainValidationError("Credit balance cannot be negative");
    }
  }

  private static validatePositiveAmount(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new DomainValidationError("Amount must be greater than zero");
    }
  }
}
