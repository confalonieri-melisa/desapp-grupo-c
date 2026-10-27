import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlayerQuotes } from "@/frontend/services/client/player-quotes.service";
import { history } from "../features/profile/fixtures/player-quotes";

describe("getPlayerQuotes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads authenticated history with encoded id, signal and unchanged payload/order", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(history));
    await expect(getPlayerQuotes("token", "a/b", undefined, signal)).resolves.toEqual(history);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/players/a%2Fb/quotes", {
      method: "GET", headers: { Authorization: "Bearer token" }, signal,
    });
  });

  it.each(["2026-10-20", "2028-02-29", "2026-12-31"])("sends exact calendar date %s", async (date) => {
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [] }));
    await getPlayerQuotes("token", "a", date);
    expect(mock.mock.calls[0][0]).toBe(`/api/players/a/quotes?date=${date}`);
  });

  it.each([400, 401, 404, 500])("keeps Error compatibility, status and API message %i", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "API message" }, { status }));
    const request = getPlayerQuotes("token", "a");
    await expect(request).rejects.toBeInstanceOf(Error);
    await expect(request).rejects.toMatchObject({ status, message: "API message" });
  });

  it("handles non-JSON and network failures without claiming empty history", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("bad gateway", { status: 502 }))
      .mockRejectedValueOnce(new TypeError("Network unavailable"));
    await expect(getPlayerQuotes("token", "a")).rejects.toMatchObject({ status: 502, message: "No se pudieron cargar las cotizaciones" });
    await expect(getPlayerQuotes("token", "a")).rejects.toThrow("Network unavailable");
  });
});
