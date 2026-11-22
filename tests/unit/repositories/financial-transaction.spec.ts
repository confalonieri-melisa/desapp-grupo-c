import { describe, expect, it, vi } from "vitest";
import { TransientTransactionError } from "@/backend/errors/application.error";
import {
  FinancialTransactionRunner,
  isRetryableTransactionError,
} from "@/backend/repositories/financial-transaction";

describe("financial transaction retry", () => {
  it.each(["40P01", "40001"])("recognizes PostgreSQL state %s", (code) => {
    expect(isRetryableTransactionError({ code })).toBe(true);
  });

  it("retries one transient failure with a short backoff", async () => {
    const operation = vi.fn().mockRejectedValueOnce({ code: "40P01" }).mockResolvedValue("ok");
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(new FinancialTransactionRunner(wait).run(operation)).resolves.toBe("ok");
    expect(wait).toHaveBeenNthCalledWith(1, 50);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry business errors and maps exhausted retries to 503", async () => {
    const businessError = new Error("conflict");
    const operation = vi.fn().mockRejectedValue(businessError);
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(new FinancialTransactionRunner(wait).run(operation)).rejects.toBe(businessError);
    expect(operation).toHaveBeenCalledOnce();

    const exhausted = vi.fn().mockRejectedValue({ code: "40001" });
    await expect(new FinancialTransactionRunner(wait).run(exhausted)).rejects.toBeInstanceOf(
      TransientTransactionError,
    );
    expect(exhausted).toHaveBeenCalledTimes(2);
  });
});
