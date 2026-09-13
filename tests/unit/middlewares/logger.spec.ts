import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "@/middlewares/logger";

describe("Logger Utility (logger.ts)", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should generate a valid correlation ID string", () => {
    const correlationId = Logger.generateCorrelationId();
    expect(correlationId).toBeDefined();
    expect(typeof correlationId).toBe("string");
    expect(correlationId.length).toBeGreaterThan(5);
  });

  it("should format structured info log correctly", () => {
    const correlationId = "test-corr-id-123";
    const payload = Logger.info("User logged in", correlationId, { userId: "u123" });

    expect(payload.level).toBe("info");
    expect(payload.message).toBe("User logged in");
    expect(payload.correlationId).toBe(correlationId);
    expect(payload.data).toEqual({ userId: "u123" });
    expect(payload.timestamp).toBeDefined();
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it("should format structured warn log correctly", () => {
    const payload = Logger.warn("High credit usage warning");

    expect(payload.level).toBe("warn");
    expect(payload.message).toBe("High credit usage warning");
    expect(console.warn).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it("should format structured error log with Error object details", () => {
    const err = new Error("Database connection timeout");
    const correlationId = "err-corr-id-456";
    const payload = Logger.error("Database query failed", correlationId, err);

    expect(payload.level).toBe("error");
    expect(payload.message).toBe("Database query failed");
    expect(payload.correlationId).toBe(correlationId);
    expect(payload.error).toBeDefined();
    expect(payload.error?.message).toBe("Database connection timeout");
    expect(payload.error?.name).toBe("Error");
    expect(console.error).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it("should format structured debug log correctly", () => {
    const payload = Logger.debug("Debugging query parameters", undefined, { query: "LA_LIGA" });

    expect(payload.level).toBe("debug");
    expect(payload.message).toBe("Debugging query parameters");
    expect(payload.data).toEqual({ query: "LA_LIGA" });
    expect(console.debug).toHaveBeenCalledWith(JSON.stringify(payload));
  });
});
