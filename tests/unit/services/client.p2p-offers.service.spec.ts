import { afterEach, expect, it, vi } from "vitest";
import { getP2POffers } from "@/frontend/services/client/p2p-offers.service";
import { offer, playerId } from "../features/profile/fixtures/p2p-ui";
afterEach(() => vi.unstubAllGlobals());
it("reads only OPEN offers for the requested player with bearer auth", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json([offer]));
  vi.stubGlobal("fetch", fetcher);
  expect(await getP2POffers("jwt", playerId)).toEqual([offer]);
  expect(fetcher).toHaveBeenCalledWith(
    `/api/p2p/offers?playerId=${playerId}`,
    expect.objectContaining({ headers: { Authorization: "Bearer jwt" } }),
  );
});
it.each([{}, [{ ...offer, status: "CANCELLED" }], [{ ...offer, playerId: "other" }]])(
  "rejects malformed list %j",
  async (body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
    await expect(getP2POffers("jwt", playerId)).rejects.toThrow();
  },
);
it("preserves real API errors and status", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ error: "Expired" }, { status: 401 })),
  );
  await expect(getP2POffers("jwt", playerId)).rejects.toMatchObject({
    status: 401,
    message: "Expired",
  });
});
