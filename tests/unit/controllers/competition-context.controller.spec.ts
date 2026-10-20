import { describe, expect, it, vi } from "vitest";
import { CompetitionContextController } from "@/backend/controllers/competition-context.controller";
import { CompetitionContextService } from "@/backend/services/competition-context.service";

describe("CompetitionContextController", () => {
  it("validates the season and delegates the authorized request", async () => {
    const service = {
      update: vi.fn().mockResolvedValue({
        updateId: "update-1",
        season: 2026,
        status: "VALID",
        competitions: [],
      }),
    } as unknown as CompetitionContextService;

    await expect(new CompetitionContextController(service).update(
      { season: "2026" },
      "superuser-1",
    )).resolves.toMatchObject({
      updateId: "update-1",
      season: 2026,
      status: "VALID",
    });

    expect(service.update).toHaveBeenCalledWith(2026, "superuser-1");
  });

  it("rejects an invalid season before calling the service", async () => {
    const service = {
      update: vi.fn(),
    } as unknown as CompetitionContextService;

    await expect(new CompetitionContextController(service).update(
      { season: 1999 },
      "superuser-1",
    )).rejects.toThrow();
    expect(service.update).not.toHaveBeenCalled();
  });
});
