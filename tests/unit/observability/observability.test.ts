import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpMetrics } from "@/backend/observability/http-metrics";
import { RequestAudit, sanitizeAuditValue } from "@/backend/observability/request-audit";
import { RequestObservation } from "@/backend/observability/request-observation";

describe("HttpMetrics", () => {
  it("aggregates requests by method, operation and status", () => {
    const metrics = new HttpMetrics();

    metrics.record({ method: "GET", operation: "/api/players", status: 200, durationMs: 10 });
    metrics.record({ method: "GET", operation: "/api/players", status: 200, durationMs: 30 });
    metrics.record({ method: "GET", operation: "/api/players", status: 404, durationMs: 5 });

    const output = metrics.toPrometheus();

    expect(output).toContain(
      'http_requests_total{method="GET",operation="/api/players",status="200"} 2',
    );
    expect(output).toContain(
      'http_requests_total{method="GET",operation="/api/players",status="404"} 1',
    );
    expect(output).toContain('http_errors_total{status_class="4xx"} 1');
    expect(output).toContain(
      'http_request_duration_ms_sum{method="GET",operation="/api/players"} 45',
    );
  });

  it("resets volatile state", () => {
    const metrics = new HttpMetrics();
    metrics.record({ method: "GET", operation: "/api/players", status: 200, durationMs: 10 });

    metrics.reset();

    expect(metrics.toPrometheus()).not.toContain('http_requests_total{method="GET"');
  });
});

describe("RequestAudit", () => {
  it("redacts sensitive fields recursively", () => {
    expect(
      sanitizeAuditValue({
        email: "user@example.com",
        password: "secret",
        nested: { accessToken: "jwt" },
      }),
    ).toEqual({
      email: "user@example.com",
      password: "[REDACTED]",
      nested: { accessToken: "[REDACTED]" },
    });
  });

  it("writes structured JSON events", () => {
    const write = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const audit = new RequestAudit();

    audit.record({
      timestamp: new Date().toISOString(),
      user: "anonymous",
      method: "GET",
      operation: "/api/players",
      parameters: {},
      status: 200,
      durationMs: 12,
      correlationId: "correlation-1",
    });

    expect(write).toHaveBeenCalledWith(expect.stringContaining('"operation":"/api/players"'));
    write.mockRestore();
  });
});

describe("RequestObservation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("propagates a correlation ID and records the response", async () => {
    const metrics = new HttpMetrics();
    const write = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const observation = new RequestObservation(metrics, new RequestAudit());

    const response = await observation.observe(
      new Request("http://localhost/api/players?league=Premier%20League", {
        headers: { "x-correlation-id": "correlation-1" },
      }),
      "/api/players",
      () => Response.json({ ok: true }),
    );

    expect(response.headers.get("x-correlation-id")).toBe("correlation-1");
    expect(metrics.toPrometheus()).toContain('status="200"');
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"correlationId":"correlation-1"'));
    write.mockRestore();
  });

  it("generates a correlation ID when the request does not provide one", async () => {
    const observation = new RequestObservation(new HttpMetrics(), new RequestAudit());
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const response = await observation.observe(
      new Request("http://localhost/api/health/live"),
      "/api/health/live",
      () => Response.json({ status: "ok" }),
    );

    expect(response.headers.get("x-correlation-id")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("audits JSON body parameters without exposing sensitive values", async () => {
    const metrics = new HttpMetrics();
    const write = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const observation = new RequestObservation(metrics, new RequestAudit());

    await observation.observe(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "secret" }),
      }),
      "/api/auth/register",
      () => Response.json({ status: "created" }, { status: 201 }),
    );

    const audit = String(write.mock.calls[0]?.[0]);
    expect(audit).toContain('"email":"user@example.com"');
    expect(audit).toContain('"password":"[REDACTED]"');
    expect(metrics.toPrometheus()).toContain('status="201"');
  });

  it("audits failed actions as server errors and propagates the failure", async () => {
    const metrics = new HttpMetrics();
    const write = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const observation = new RequestObservation(metrics, new RequestAudit());

    await expect(
      observation.observe(
        new Request("http://localhost/api/orders/buy", {
          method: "POST",
          headers: {
            authorization: "Bearer invalid-token",
            "content-type": "application/json",
          },
          body: "not-json",
        }),
        "/api/orders/buy",
        () => Promise.reject(new Error("unexpected failure")),
      ),
    ).rejects.toThrow("unexpected failure");

    expect(write).toHaveBeenCalledWith(expect.stringContaining('"status":500'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"user":"anonymous"'));
    expect(metrics.toPrometheus()).toContain('status="500"');
  });
});
