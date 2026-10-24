import { describe, expect, it } from "vitest";
import { FinancialAuditRecord } from "@/backend/models/FinancialAuditRecord";
import { MarketOperation } from "@/backend/models/MarketOperation";
import { DomainValidationError } from "@/backend/models/errors";

describe("market financial records", () => {
  it("creates an immutable market operation", () => {
    const operation = new MarketOperation({
      type: "BUY",
      investorId: "investor-id",
      playerId: "player-id",
      quoteId: "quote-id",
      quoteValue: 10,
      quantity: 3,
    });

    expect(operation.type).toBe("BUY");
    expect(operation.total).toBe(30);
  });

  it("rejects invalid operation values", () => {
    expect(() => new MarketOperation({
      type: "BUY",
      investorId: "investor-id",
      playerId: "player-id",
      quoteId: "quote-id",
      quoteValue: 10,
      quantity: 0,
    })).toThrow(DomainValidationError);
  });

  it("keeps the before and after financial snapshots", () => {
    const audit = new FinancialAuditRecord({
      operationId: "operation-id",
      actorUserId: "investor-id",
      action: "TOKEN_BUY",
      previousState: {
        investor: { creditBalance: 100, quantity: 0, averagePurchasePrice: 0 },
        pool: { creditBalance: 500, quantity: 100 },
      },
      newState: {
        investor: { creditBalance: 70, quantity: 3, averagePurchasePrice: 10 },
        pool: { creditBalance: 530, quantity: 97 },
      },
    });

    expect(audit.previousState.investor.quantity).toBe(0);
    expect(audit.newState.pool.quantity).toBe(97);
  });
});
