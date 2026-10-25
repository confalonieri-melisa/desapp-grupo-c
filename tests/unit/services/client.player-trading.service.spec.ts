import { afterEach, describe, expect, it, vi } from "vitest";
import { buyPlayerTokens, getPortfolio, sellPlayerTokens } from "@/frontend/services/client/player-trading.service";

describe("getPortfolio", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gets the authenticated portfolio once, forwards the signal and preserves its values", async () => {
    const signal = new AbortController().signal;
    const snapshot = {
      creditBalance: 0,
      items: [
        {
          playerId: "player-1", quantity: 2, averagePurchasePrice: 12.5,
          currentQuoteValue: null, currentValue: null, unrealizedPnl: null,
        },
        {
          playerId: "player-2", quantity: 1, averagePurchasePrice: 11,
          currentQuoteValue: 0, currentValue: 0, unrealizedPnl: -11,
        },
      ],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(snapshot));

    await expect(getPortfolio("jwt", signal)).resolves.toEqual(snapshot);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/portfolio", {
      method: "GET", headers: { Authorization: "Bearer jwt" }, signal,
    });
  });

  it("does not send a user id or a body when no signal is provided", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ creditBalance: 20, items: [] }));
    await getPortfolio("jwt");
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/portfolio", {
      method: "GET", headers: { Authorization: "Bearer jwt" }, signal: undefined,
    });
  });

  it.each([401, 400, 404, 409, 500])("keeps HTTP status and the real error text for %i", async (status) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "API message" }, { status }));
    await expect(getPortfolio("jwt")).rejects.toMatchObject({ status, message: "API message" });
  });

  it("reports unreadable JSON with its HTTP status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("invalid JSON", { status: 502 }));
    await expect(getPortfolio("jwt")).rejects.toMatchObject({ status: 502, message: "No se pudo cargar el portfolio" });
  });

  it("does not treat a malformed successful response as an empty portfolio", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("invalid JSON", { status: 200 }));
    await expect(getPortfolio("jwt")).rejects.toMatchObject({ status: 200, message: "No se pudo cargar el portfolio" });
  });

  it("propagates network failures", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network unavailable"));
    await expect(getPortfolio("jwt")).rejects.toThrow("Network unavailable");
  });
});

describe("sellPlayerTokens", () => {
  afterEach(() => vi.restoreAllMocks());

  const order = { playerId: "player-1", quantity: 2 };
  const result = {
    operation: {
      id: "operation-2", type: "SELL", userId: "server-user", playerId: "player-1",
      quantity: 2, quoteValue: 14, total: 28, createdAt: "2026-10-25T12:10:00.000Z",
    },
    account: { creditBalance: 128 },
    holding: { quantity: 0, averagePurchasePrice: 0 },
  };

  it("posts exactly the player and quantity using bearer auth, and returns the server receipt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(result, { status: 201 }));
    await expect(sellPlayerTokens("jwt", order)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/orders/sell", {
      method: "POST",
      headers: { Authorization: "Bearer jwt", "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(Object.keys(body).sort()).toEqual(["playerId", "quantity"]);
    expect(body).not.toHaveProperty("userId");
  });

  it.each([400, 401, 404, 409, 500, 503])("preserves status and API error at %i, with one request", async (status) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: `Rejected ${status}` }, { status }));
    await expect(sellPlayerTokens("jwt", order)).rejects.toMatchObject({ status, message: `Rejected ${status}` });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([201, 502])("does not confirm an unreadable response at HTTP %i", async (status) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not JSON", { status }));
    await expect(sellPlayerTokens("jwt", order)).rejects.toMatchObject({ status, message: "No se pudo confirmar la venta" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not confirm a 201 without the actual SELL receipt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...result, operation: { ...result.operation, type: "BUY" } }, { status: 201 }));
    await expect(sellPlayerTokens("jwt", order)).rejects.toMatchObject({ status: 201, message: "No se pudo confirmar la venta" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("propagates network failure without retrying a potentially executed sale", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network unavailable"));
    await expect(sellPlayerTokens("jwt", order)).rejects.toThrow("Network unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("buyPlayerTokens", () => {
  afterEach(() => vi.restoreAllMocks());

  const order = { playerId: "player-1", quantity: 3 };
  const result = {
    operation: {
      id: "operation-1", type: "BUY", userId: "server-user", playerId: "player-1",
      quantity: 3, quoteValue: 12.25, total: 36.75, createdAt: "2026-10-25T12:00:00.000Z",
    },
    account: { creditBalance: 63.25 },
    holding: { quantity: 3, averagePurchasePrice: 12.25 },
  };

  it("posts exactly playerId and quantity with the session bearer token, returning the effective receipt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(result, { status: 201 }));
    await expect(buyPlayerTokens("jwt", order)).resolves.toEqual(result);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/orders/buy", {
      method: "POST",
      headers: { Authorization: "Bearer jwt", "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(Object.keys(body).sort()).toEqual(["playerId", "quantity"]);
    expect(body).not.toHaveProperty("userId");
  });

  it.each([400, 401, 404, 409, 500, 503])("preserves status and API error at %i without retry", async (status) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: `Rejected ${status}` }, { status }));
    await expect(buyPlayerTokens("jwt", order)).rejects.toMatchObject({ status, message: `Rejected ${status}` });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([201, 502])("does not confirm unreadable JSON at HTTP %i", async (status) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not JSON", { status }));
    await expect(buyPlayerTokens("jwt", order)).rejects.toMatchObject({ status, message: "No se pudo confirmar la compra" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not confirm a 201 response without an operation receipt", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ account: result.account }, { status: 201 }));
    await expect(buyPlayerTokens("jwt", order)).rejects.toMatchObject({ status: 201, message: "No se pudo confirmar la compra" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("leaves network failure unresolved and never retries the order", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network unavailable"));
    await expect(buyPlayerTokens("jwt", order)).rejects.toThrow("Network unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
