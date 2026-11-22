import { describe, expect, it } from "vitest";
import { HEALTH_CHECK, HEALTH_STATUS } from "@/backend/models/health";
import { SystemHealthRepository } from "@/backend/repositories/system-health.repository";
import { HealthService } from "@/backend/services/health.service";

describe("HealthService", () => {
  it("builds the basic and liveness health responses", () => {
    const repository = {
      checkDatabase: async () => ({ dependency: "database", status: HEALTH_STATUS.OK }),
    };
    const service = new HealthService(repository as unknown as SystemHealthRepository);

    expect(service.getHealth()).toEqual({ status: HEALTH_STATUS.OK });
    expect(service.getLiveness()).toEqual({ status: HEALTH_STATUS.OK, check: HEALTH_CHECK.LIVE });
  });

  it("builds a healthy readiness response from the database status", async () => {
    const repository = {
      checkDatabase: async () => ({ dependency: "database", status: HEALTH_STATUS.OK }),
    };
    const service = new HealthService(repository as unknown as SystemHealthRepository);

    await expect(service.getReadiness()).resolves.toEqual({
      status: HEALTH_STATUS.OK,
      check: HEALTH_CHECK.READY,
      database: HEALTH_STATUS.OK,
    });
  });

  it("builds an unhealthy readiness response from the database status", async () => {
    const repository = {
      checkDatabase: async () => ({ dependency: "database", status: HEALTH_STATUS.UNHEALTHY }),
    };
    const service = new HealthService(repository as unknown as SystemHealthRepository);

    await expect(service.getReadiness()).resolves.toEqual({
      status: HEALTH_STATUS.UNHEALTHY,
      check: HEALTH_CHECK.READY,
      database: HEALTH_STATUS.UNHEALTHY,
    });
  });
});
