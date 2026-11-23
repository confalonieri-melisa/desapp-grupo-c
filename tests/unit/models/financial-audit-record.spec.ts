import { describe, expect, it } from "vitest";
import { FinancialAuditRecord } from "@/backend/models/FinancialAuditRecord";

describe("FinancialAuditRecord", () => {
  it("represents one P2P transition with buyer and seller snapshots", () => {
    const audit = new FinancialAuditRecord({
      operationId: "operation-id",
      actorUserId: "buyer-id",
      action: "P2P_TRADE",
      previousState: {
        buyer: { creditBalance: 100, quantity: 0, averagePurchasePrice: 0 },
        seller: { creditBalance: 50, quantity: 4, averagePurchasePrice: 8 },
      },
      newState: {
        buyer: { creditBalance: 80, quantity: 2, averagePurchasePrice: 10 },
        seller: { creditBalance: 70, quantity: 2, averagePurchasePrice: 8 },
      },
    });

    expect(audit.action).toBe("P2P_TRADE");
    expect(audit.previousState.buyer.quantity).toBe(0);
    expect(audit.newState.seller.creditBalance).toBe(70);
  });
});
