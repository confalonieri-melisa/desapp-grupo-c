import { DomainValidationError } from "./errors";
import { isUserRole, UserRole } from "./enums";

export const INVESTOR_INITIAL_CREDITS = 1000;

export interface UserProps {
  id?: string;
  name: string;
  email: string;
  role?: UserRole;
  creditBalance?: number;
  password: string;
  createdAt?: Date;
}

/** User aggregate with account and balance invariants. */
export class User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly password: string;
  readonly createdAt: Date;
  private _creditBalance: number;

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
    this.password = props.password;
    this._creditBalance = creditBalance;
    this.createdAt = props.createdAt ?? new Date();
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
  }

  credit(amount: number): void {
    User.validatePositiveAmount(amount);
    this._creditBalance += amount;
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
