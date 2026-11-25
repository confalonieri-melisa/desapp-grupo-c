import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getLiveness } from "@/app/api/health/live/route";
import { GET as getMetrics } from "@/app/api/metrics/route";
import { MetricsController } from "@/backend/controllers/metrics.controller";
import { HttpMetrics, httpMetrics } from "@/backend/observability/http-metrics";
import { MetricsService } from "@/backend/services/metrics.service";

describe("observability routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    httpMetrics.reset();
  });

  it("returns public liveness and propagates a correlation id", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await getLiveness(
      new Request("http://localhost/api/health/live", {
        headers: { "x-correlation-id": "route-correlation" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("route-correlation");
    await expect(response.json()).resolves.toMatchObject({ status: "ok", check: "live" });
  });

  it("exposes observed requests without counting the metrics endpoint itself", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await getLiveness(new Request("http://localhost/api/health/live"));
    const response = await getMetrics(new Request("http://localhost/api/metrics"));
    const output = await response.text();

    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(output).toContain(
      'http_requests_total{method="GET",operation="/api/health/live",status="200"} 1',
    );
    expect(output).not.toContain('operation="/api/metrics"');
  });

  it("returns aggregate advanced metrics without individual portfolio data", async () => {
    const controller = new MetricsController(
      new MetricsService(
        { findAll: vi.fn(async () => [{ id: "p1" }, { id: "p2" }]) } as never,
        {
          findActiveStrategyVersion: vi.fn(async () => ({
            strategyCode: "INDIVIDUAL_PERFORMANCE",
            version: "1",
          })),
        } as never,
      ),
      new HttpMetrics(),
    );

    const response = await controller.getAdvancedMetrics();

    expect(response).toMatchObject({
      players: 2,
      strategy: { code: "INDIVIDUAL_PERFORMANCE", version: "1" },
    });
    expect(response).not.toHaveProperty("creditBalance");
    expect(response).not.toHaveProperty("portfolio");
  });
});
