import { afterEach, expect, it, vi } from "vitest";
import { getPoolAvailability } from "@/frontend/services/client/pool-availability.service";
afterEach(() => vi.unstubAllGlobals());
it.each([0, 5])("reads authenticated stock %i", async (availableQuantity) => {
  const f = vi.fn().mockResolvedValue(Response.json({ playerId: "p", availableQuantity }));
  vi.stubGlobal("fetch", f);
  expect(await getPoolAvailability("jwt", "p")).toEqual({ playerId: "p", availableQuantity });
  expect(f).toHaveBeenCalledWith(
    "/api/players/p/pool-availability",
    expect.objectContaining({ headers: { Authorization: "Bearer jwt" } }),
  );
});
it.each([
  {},
  { playerId: "p", availableQuantity: -1 },
  { playerId: "other", availableQuantity: 1 },
  { playerId: "p", availableQuantity: 1.5 },
])("rejects malformed stock %j", async (body) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
  await expect(getPoolAvailability("jwt", "p")).rejects.toThrow();
});
