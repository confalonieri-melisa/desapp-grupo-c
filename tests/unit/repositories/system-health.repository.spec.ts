import { describe, expect, it, vi } from "vitest";
import { HEALTH_STATUS } from "@/backend/models/health";
import { SystemHealthRepository } from "@/backend/repositories/system-health.repository";

describe("SystemHealthRepository", () => {
  it("reports an available database", async () => {
    const execute = vi.fn(async () => undefined);
    const repository = new SystemHealthRepository({ execute } as never);

    await expect(repository.checkDatabase()).resolves.toEqual({
      dependency: "database",
      status: HEALTH_STATUS.OK,
    });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("reports an unavailable database", async () => {
    const execute = vi.fn(async () => Promise.reject(new Error("down")));
    const repository = new SystemHealthRepository({ execute } as never);

    await expect(repository.checkDatabase()).resolves.toEqual({
      dependency: "database",
      status: HEALTH_STATUS.UNHEALTHY,
    });
  });
});
