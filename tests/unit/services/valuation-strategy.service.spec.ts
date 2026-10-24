import { describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/backend/errors/http.error";
import { ValuationStrategyService, buildValuationConfig } from "@/backend/services/valuation-strategy.service";

describe("ValuationStrategyService", () => {
  it("builds the individual strategy without a team share", () => {
    const config = buildValuationConfig("INDIVIDUAL_PERFORMANCE");

    expect(config.individualShare).toBe(1);
    expect(config.teamShare).toBe(0);
    expect(config.teamMetrics).toHaveLength(4);
    expect(config.individualMetrics.every((metric) => metric.minimum !== undefined)).toBe(true);
  });

  it("activates a version with the generated configuration", async () => {
    const activateStrategyVersion = vi.fn().mockResolvedValue({ id: "version-1" });
    const service = new ValuationStrategyService({ activateStrategyVersion } as never);

    await expect(service.activate("INDIVIDUAL_PLUS_TEAM_CONTEXT", "admin-1"))
      .resolves.toEqual({
        strategyCode: "INDIVIDUAL_PLUS_TEAM_CONTEXT",
        version: "1.0.0",
        isActive: true,
      });

    expect(activateStrategyVersion).toHaveBeenCalledWith(
      "INDIVIDUAL_PLUS_TEAM_CONTEXT",
      "1.0.0",
      expect.objectContaining({ individualShare: 0.75, teamShare: 0.25 }),
      "admin-1",
    );
  });

  it("reports a conflict when activation does not return a version", async () => {
    const service = new ValuationStrategyService({
      activateStrategyVersion: vi.fn().mockResolvedValue(null),
    } as never);

    await expect(service.activate("INDIVIDUAL_PERFORMANCE", "admin-1"))
      .rejects.toBeInstanceOf(ConflictError);
  });
});
