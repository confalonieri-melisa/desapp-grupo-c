import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/backend/errors/http.error";

const requireSuperuser = vi.hoisted(() => vi.fn());
const activate = vi.hoisted(() => vi.fn());
const runManualRecalculation = vi.hoisted(() => vi.fn());

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireSuperuser }));
vi.mock("@/backend/services/valuation-strategy.service", () => ({
  ValuationStrategyService: class {
    activate = activate;
  },
}));
vi.mock("@/backend/services/batch-execution.service", () => ({
  BatchExecutionService: class {
    runManualRecalculation = runManualRecalculation;
  },
}));

import { POST as activateRoute } from "@/app/api/valuation/active/route";
import { POST as recalculateRoute } from "@/app/api/quotes/recalculate/route";

describe("valuation routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSuperuser.mockReturnValue({ sub: "admin-1" });
    activate.mockResolvedValue({ strategyCode: "INDIVIDUAL_PERFORMANCE", version: "1.0.0" });
    runManualRecalculation.mockResolvedValue({ status: "COMPLETED", calculated: 0, rejected: 0 });
  });

  it("requires a superuser to activate a strategy", async () => {
    requireSuperuser.mockImplementation(() => {
      throw new UnauthorizedError();
    });

    const response = await activateRoute(
      new Request("http://localhost/api/valuation/active", {
        method: "POST",
        body: JSON.stringify({ strategyCode: "INDIVIDUAL_PERFORMANCE" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(activate).not.toHaveBeenCalled();
  });

  it("delegates strategy activation to the domain service", async () => {
    const response = await activateRoute(
      new Request("http://localhost/api/valuation/active", {
        method: "POST",
        body: JSON.stringify({ strategyCode: "INDIVIDUAL_PERFORMANCE" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(activate).toHaveBeenCalledWith("INDIVIDUAL_PERFORMANCE", "admin-1");
  });

  it("rejects non-superusers from recalculating quotes", async () => {
    requireSuperuser.mockImplementation(() => {
      throw new ForbiddenError();
    });

    const response = await recalculateRoute(
      new Request("http://localhost/api/quotes/recalculate", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(runManualRecalculation).not.toHaveBeenCalled();
  });

  it("validates the recalculation request before delegating", async () => {
    const response = await recalculateRoute(
      new Request("http://localhost/api/quotes/recalculate", {
        method: "POST",
        body: JSON.stringify({ season: 2026 }),
      }),
    );

    expect(response.status).toBe(400);
    expect(runManualRecalculation).not.toHaveBeenCalled();
  });

  it("preserves the successful recalculation response and correlation ID", async () => {
    const response = await recalculateRoute(
      new Request("http://localhost/api/quotes/recalculate", {
        method: "POST",
        headers: { "x-correlation-id": "request-1" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("request-1");
    expect(runManualRecalculation).toHaveBeenCalledWith("request-1");
    expect(await response.json()).toMatchObject({
      status: "COMPLETED",
      calculated: 0,
      rejected: 0,
    });
  });

  it("returns conflict when another batch is running", async () => {
    runManualRecalculation.mockRejectedValue(new ConflictError("Another batch is running"));
    const response = await recalculateRoute(
      new Request("http://localhost/api/quotes/recalculate", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "Another batch is running" });
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });
});
