import { TransientTransactionError } from "@/backend/errors/application.error";

const RETRYABLE_SQL_STATES = new Set(["40P01", "40001"]);

export class FinancialTransactionRunner {
  constructor(private readonly wait: (milliseconds: number) => Promise<void> = delay) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableTransactionError(error)) throw error;
      await this.wait(50);
      try {
        return await operation();
      } catch (retryError) {
        if (isRetryableTransactionError(retryError)) {
          throw new TransientTransactionError("Financial operation temporarily unavailable");
        }
        throw retryError;
      }
    }
  }
}

export function isRetryableTransactionError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;

  return RETRYABLE_SQL_STATES.has(String(error.code));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
