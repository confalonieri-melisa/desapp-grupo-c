import { describe, expect, it, vi } from "vitest";
import { HealthController } from "@/backend/controllers/health.controller";
import { HEALTH_CHECK, HEALTH_STATUS } from "@/backend/models/health";
import { HealthService } from "@/backend/services/health.service";

describe("HealthController", () => {
  it("delegates health queries to the health service", async () => {
    const service = {
      getHealth: vi.fn(() => ({ status: HEALTH_STATUS.OK })),
      getLiveness: vi.fn(() => ({ status: HEALTH_STATUS.OK, check: HEALTH_CHECK.LIVE })),
      getReadiness: vi.fn(async () => ({
        status: HEALTH_STATUS.OK,
        check: HEALTH_CHECK.READY,
        database: HEALTH_STATUS.OK,
      })),
    };
    const controller = new HealthController(service as unknown as HealthService);

    expect(controller.getHealth()).toEqual({ status: HEALTH_STATUS.OK });
    expect(controller.getLiveness()).toEqual({
      status: HEALTH_STATUS.OK,
      check: HEALTH_CHECK.LIVE,
    });
    await expect(controller.getReadiness()).resolves.toEqual({
      status: HEALTH_STATUS.OK,
      check: HEALTH_CHECK.READY,
      database: HEALTH_STATUS.OK,
    });

    expect(service.getHealth).toHaveBeenCalledOnce();
    expect(service.getLiveness).toHaveBeenCalledOnce();
    expect(service.getReadiness).toHaveBeenCalledOnce();
  });
});
