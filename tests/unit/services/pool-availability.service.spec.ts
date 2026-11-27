import { expect, it, vi } from "vitest";
import { PoolAvailabilityService } from "@/backend/services/pool-availability.service";
import type { PlayerRepository } from "@/backend/repositories/player.repository";
import type { PoolAvailabilityRepository } from "@/backend/repositories/pool-availability.repository";
it.each([0, 8])("returns only player and quantity %i without quotes", async (quantity) => {
  const p = { findById: vi.fn().mockResolvedValue({ id: "player" }) };
  const r = { getAvailableQuantity: vi.fn().mockResolvedValue(quantity) };
  const s = new PoolAvailabilityService(
    p as unknown as PlayerRepository,
    r as unknown as PoolAvailabilityRepository,
  );
  expect(await s.getAvailability("player")).toEqual({
    playerId: "player",
    availableQuantity: quantity,
  });
});
it("rejects missing player", async () => {
  const s = new PoolAvailabilityService({
    findById: vi.fn().mockResolvedValue(null),
  } as unknown as PlayerRepository);
  await expect(s.getAvailability("missing")).rejects.toMatchObject({ status: 404 });
});
