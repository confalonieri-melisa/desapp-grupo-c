import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { PORTFOLIO_UPDATED_EVENT, type PortfolioUpdate } from "@/frontend/services/client/portfolio-events";
import { createHookHarness, deferred, flushPromises } from "./hook-harness";

const mocks = vi.hoisted(() => ({ get: vi.fn(), buy: vi.fn(), sell: vi.fn(), state: vi.fn(), ref: vi.fn(), effect: vi.fn() }));
vi.mock("react", () => ({ useState: mocks.state, useRef: mocks.ref, useEffect: mocks.effect }));
vi.mock("@/frontend/services/client/player-trading.service", () => ({
  getPortfolio: mocks.get, buyPlayerTokens: mocks.buy, sellPlayerTokens: mocks.sell,
}));
import { usePlayerTrading } from "@/frontend/features/profile/hooks/usePlayerTrading";

const snapshot: PortfolioSnapshot = {
  creditBalance: 100,
  items: [{ playerId: "player-a", quantity: 3, averagePurchasePrice: 5,
    currentQuoteValue: 7, currentValue: 21, unrealizedPnl: 6 }],
};
const receipt = {
  operation: { id: "op-1", type: "BUY" as const, userId: "user-1", playerId: "player-a",
    quantity: 2, quoteValue: 8, total: 16, createdAt: "2026-10-25T10:00:00.000Z" },
  account: { creditBalance: 84 },
  holding: { quantity: 5, averagePurchasePrice: 6.2 },
};
const sellReceipt = {
  operation: { ...receipt.operation, id: "op-sell", type: "SELL" as const, quantity: 2, total: 16 },
  account: { creditBalance: 116 },
  holding: { quantity: 1, averagePurchasePrice: 5 },
};

function setup(token: string | null = "token", playerId = "player-a") {
  const harness = createHookHarness();
  mocks.state.mockImplementation(harness.useState);
  mocks.ref.mockImplementation(harness.useRef);
  mocks.effect.mockImplementation(harness.useEffect);
  const unauthorized = vi.fn();
  const render = (t = token, id = playerId, callback = unauthorized) =>
    harness.render(() => usePlayerTrading(t, id, callback));
  render(); harness.commit();
  return { ...harness, render, unauthorized };
}

describe("usePlayerTrading portfolio", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("publishes the same loading, success and failure state for the navbar", async () => {
    vi.stubGlobal("window", new EventTarget());
    const updates: PortfolioUpdate[] = [];
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, (event) => {
      updates.push((event as CustomEvent<PortfolioUpdate>).detail);
    });
    mocks.get.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("Offline"));
    const h = setup();
    expect(updates).toEqual([{ token: "token", status: "loading", snapshot: null }]);
    await flushPromises();
    expect(updates.at(-1)).toEqual({ token: "token", status: "success", snapshot });
    h.render().retryPortfolio(); await flushPromises();
    expect(updates.slice(-2)).toEqual([
      { token: "token", status: "loading", snapshot: null },
      { token: "token", status: "error", snapshot: null },
    ]);
    h.cleanup();
  });

  it("stays idle without confirmed token and player", () => {
    const withoutToken = setup(null);
    expect(withoutToken.render().portfolio).toMatchObject({ status: "idle", snapshot: null });
    expect(mocks.get).not.toHaveBeenCalled(); withoutToken.cleanup();
    const withoutPlayer = setup("token", "");
    expect(withoutPlayer.render().portfolio.status).toBe("idle");
    expect(mocks.get).not.toHaveBeenCalled(); withoutPlayer.cleanup();
  });

  it("reads once per identity with AbortSignal and exposes the unchanged snapshot", async () => {
    mocks.get.mockResolvedValue(snapshot);
    const h = setup();
    expect(h.render().portfolio).toMatchObject({ status: "loading", snapshot: null });
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith("token", expect.any(AbortSignal));
    await flushPromises();
    expect(h.render().portfolio).toMatchObject({ status: "success", snapshot });
    h.render("token", "player-a", vi.fn()); h.commit();
    expect(mocks.get).toHaveBeenCalledOnce(); h.cleanup();
  });

  it("distinguishes empty portfolio and recoverable failure", async () => {
    mocks.get.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ creditBalance: 0, items: [] });
    const h = setup(); await flushPromises();
    expect(h.render().portfolio).toMatchObject({ status: "error", error: "Offline", snapshot: null });
    h.render().retryPortfolio();
    expect(h.render().portfolio.status).toBe("loading");
    await flushPromises();
    expect(h.render().portfolio).toMatchObject({ status: "empty", snapshot: { creditBalance: 0, items: [] } });
    h.cleanup();
  });

  it("marks old figures stale during a refresh and uses only the new GET result", async () => {
    mocks.get.mockResolvedValueOnce(snapshot);
    const next = deferred<PortfolioSnapshot>(); mocks.get.mockReturnValueOnce(next.promise);
    const h = setup(); await flushPromises();
    h.render().retryPortfolio();
    expect(h.render().portfolio).toMatchObject({ status: "refreshing", snapshot: null });
    next.resolve({ creditBalance: 70, items: [] }); await flushPromises();
    expect(h.render().portfolio).toMatchObject({ status: "empty", snapshot: { creditBalance: 70, items: [] } });
    h.cleanup();
  });

  it.each(["success", "error", "401"])("ignores an overlapped request's late %s and finally", async (outcome) => {
    const first = deferred<PortfolioSnapshot>(); const second = deferred<PortfolioSnapshot>();
    mocks.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const h = setup(); const firstSignal = mocks.get.mock.calls[0][1] as AbortSignal;
    h.render().retryPortfolio();
    expect(firstSignal.aborted).toBe(true);
    if (outcome === "success") first.resolve(snapshot);
    else first.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    expect(h.render().portfolio.status).toBe("loading");
    expect(h.unauthorized).not.toHaveBeenCalled();
    second.resolve({ creditBalance: 20, items: [] }); await flushPromises();
    expect(h.render().portfolio.snapshot?.creditBalance).toBe(20);
    h.cleanup();
  });

  it.each([
    ["player", "token", "player-b", "success"],
    ["player", "token", "player-b", "error"],
    ["player", "token", "player-b", "401"],
    ["token", "other-token", "player-a", "success"],
    ["token", "other-token", "player-a", "error"],
    ["token", "other-token", "player-a", "401"],
  ])("hides prior identity on %s change to %s/%s and ignores late %s", async (_kind, nextToken, nextPlayer, outcome) => {
    const old = deferred<PortfolioSnapshot>(); const next = deferred<PortfolioSnapshot>();
    mocks.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const h = setup();
    expect(h.render(nextToken, nextPlayer).portfolio).toMatchObject({ status: "idle", snapshot: null });
    h.commit();
    if (outcome === "success") old.resolve(snapshot);
    else old.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    expect(h.render(nextToken, nextPlayer).portfolio).toMatchObject({ status: "loading", snapshot: null });
    expect(h.unauthorized).not.toHaveBeenCalled();
    next.resolve({ creditBalance: 40, items: [] }); await flushPromises();
    expect(h.render(nextToken, nextPlayer).portfolio.snapshot?.creditBalance).toBe(40);
    h.cleanup();
  });

  it("hides data and invokes the latest callback on a current 401", async () => {
    mocks.get.mockResolvedValueOnce(snapshot);
    const h = setup(); await flushPromises();
    const pending = deferred<PortfolioSnapshot>(); mocks.get.mockReturnValueOnce(pending.promise);
    const latest = vi.fn(); h.render("token", "player-a", latest); h.commit();
    h.render().retryPortfolio();
    pending.reject(Object.assign(new Error("Expired"), { status: 401 })); await flushPromises();
    expect(latest).toHaveBeenCalledOnce();
    expect(h.render().portfolio.snapshot).toBeNull();
    h.cleanup();
  });

  it("aborts on cleanup and discards a late 401", async () => {
    const pending = deferred<PortfolioSnapshot>(); mocks.get.mockReturnValue(pending.promise);
    const h = setup(); const signal = mocks.get.mock.calls[0][1] as AbortSignal;
    h.cleanup(); expect(signal.aborted).toBe(true);
    pending.reject(Object.assign(new Error("Expired"), { status: 401 })); await flushPromises();
    expect(h.unauthorized).not.toHaveBeenCalled();
  });
});

describe("usePlayerTrading BUY", () => {
  beforeEach(() => vi.clearAllMocks());

  async function ready() {
    mocks.get.mockResolvedValue(snapshot);
    const h = setup(); await flushPromises();
    return h;
  }

  it("keeps draft text, freezes confirmation values and cancels without POST", async () => {
    const h = await ready();
    h.render().setDraftQuantity("2");
    expect(h.render().draftQuantity).toBe("2");
    h.render().openBuyConfirmation("Jugador A", 8);
    expect(h.render().confirmation).toEqual({
      type: "BUY", playerId: "player-a", playerName: "Jugador A", quantity: 2,
      quoteValue: 8, estimatedTotal: 16,
    });
    h.render().setDraftQuantity("3");
    expect(h.render().confirmation?.quantity).toBe(2);
    h.render().cancelConfirmation();
    expect(h.render().confirmation).toBeNull();
    expect(h.render().draftQuantity).toBe("3");
    expect(mocks.buy).not.toHaveBeenCalled();
    h.cleanup();
  });

  it("rejects confirmation without current portfolio or when visible balance is insufficient", async () => {
    const pending = deferred<PortfolioSnapshot>(); mocks.get.mockReturnValueOnce(pending.promise);
    const h = setup(); h.render().setDraftQuantity("2");
    h.render().openBuyConfirmation("Jugador A", 8);
    expect(h.render().confirmation).toBeNull();
    pending.resolve(snapshot); await flushPromises();
    h.render().setDraftQuantity("99"); h.render().openBuyConfirmation("Jugador A", 8);
    expect(h.render().confirmation).toBeNull();
    expect(mocks.buy).not.toHaveBeenCalled(); h.cleanup();
  });

  it("blocks repeated confirm synchronously, sends frozen fields once and refreshes after 201", async () => {
    const order = deferred<typeof receipt>(); mocks.buy.mockReturnValue(order.promise);
    const fresh = { creditBalance: 84, items: [{ ...snapshot.items[0], quantity: 5 }] };
    mocks.get.mockResolvedValueOnce(snapshot).mockResolvedValueOnce(fresh);
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8);
    const confirm = h.render().confirmOrder;
    confirm(8); confirm(8);
    expect(mocks.buy).toHaveBeenCalledExactlyOnceWith("token", { playerId: "player-a", quantity: 2 });
    expect(h.render().order.status).toBe("submitting");
    expect(mocks.get).toHaveBeenCalledOnce();
    order.resolve(receipt); await flushPromises();
    expect(h.render().order).toMatchObject({ status: "succeeded", receipt, playerId: "player-a", playerName: "Jugador A" });
    expect(h.render().draftQuantity).toBe("");
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(h.render().portfolio.snapshot).toEqual(fresh);
    h.cleanup();
  });

  it("keeps receipt but marks figures stale when GET after 201 fails", async () => {
    mocks.buy.mockResolvedValue(receipt);
    mocks.get.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("GET failed"));
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order).toMatchObject({ status: "succeeded", receipt });
    expect(h.render().portfolio).toMatchObject({ status: "error", error: "GET failed", snapshot: null });
    h.cleanup();
  });

  it("clears a receipt if the GET after 201 discovers an expired session", async () => {
    mocks.buy.mockResolvedValue(receipt);
    mocks.get.mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(Object.assign(new Error("Unauthorized"), { status: 401 }));
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.unauthorized).toHaveBeenCalledOnce();
    expect(h.render().order).toMatchObject({ status: "idle", receipt: null });
    expect(h.render().portfolio.snapshot).toBeNull(); h.cleanup();
  });

  it("requires reviewing a changed quote before sending the frozen confirmation", async () => {
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8);
    h.render().confirmOrder(9);
    expect(mocks.buy).not.toHaveBeenCalled();
    expect(h.render().confirmation).toBeNull();
    expect(h.render().draftError).toMatch(/cotización/i); h.cleanup();
  });

  it("blocks confirmation when the current quote has disappeared", async () => {
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8);
    h.render().confirmOrder(undefined);
    expect(mocks.buy).not.toHaveBeenCalled();
    expect(h.render().confirmation).toBeNull();
    expect(h.render().draftError).toMatch(/cotización/i); h.cleanup();
  });

  it.each([
    [409, "Insufficient credit balance"],
    [400, "Invalid quantity"],
    [404, "Current quote not available"],
  ])("keeps editable quantity on explicit rejection %i", async (status, message) => {
    mocks.buy.mockRejectedValue(Object.assign(new Error(message), { status }));
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order.status).toBe("rejected");
    expect(h.render().draftQuantity).toBe("2");
    expect(h.render().order.receipt).toBeNull();
    expect(mocks.get).toHaveBeenCalledOnce(); h.cleanup();
  });

  it.each([
    new TypeError("Network unavailable"),
    Object.assign(new Error("Server failure"), { status: 500 }),
  ])("marks an unconfirmed POST as uncertain and does not retry it automatically", async (failure) => {
    mocks.buy.mockRejectedValue(failure);
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order.status).toBe("uncertain");
    expect(h.render().order.receipt).toBeNull();
    expect(mocks.buy).toHaveBeenCalledOnce();
    expect(mocks.get).toHaveBeenCalledOnce();
    h.render().retryPortfolio(); await flushPromises();
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.buy).toHaveBeenCalledOnce(); h.cleanup();
  });

  it("clears protected data and invokes logout on a current POST 401", async () => {
    mocks.buy.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.unauthorized).toHaveBeenCalledOnce();
    expect(h.render().portfolio.snapshot).toBeNull();
    expect(h.render().order.receipt).toBeNull(); h.cleanup();
  });

  it("keeps a late same-session receipt labelled with its original player and refreshes the new profile", async () => {
    const order = deferred<typeof receipt>(); mocks.buy.mockReturnValue(order.promise);
    const refresh = deferred<PortfolioSnapshot>();
    mocks.get.mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce({ creditBalance: 30, items: [] })
      .mockReturnValueOnce(refresh.promise);
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    h.render("token", "player-b"); h.commit(); await flushPromises();
    expect(h.render("token", "player-b").portfolio.snapshot?.creditBalance).toBe(30);
    order.resolve(receipt); await flushPromises();
    expect(h.render("token", "player-b").order).toMatchObject({ status: "succeeded", playerId: "player-a", playerName: "Jugador A", receipt });
    expect(h.render("token", "player-b").portfolio).toMatchObject({ status: "refreshing", snapshot: null });
    refresh.resolve({ creditBalance: 46, items: [] }); await flushPromises();
    expect(h.render("token", "player-b").portfolio.snapshot?.creditBalance).toBe(46);
    expect(mocks.get).toHaveBeenCalledTimes(3); h.cleanup();
  });

  it("aborts B's earlier GET and ignores its late error after A's POST succeeds", async () => {
    const order = deferred<typeof receipt>(); mocks.buy.mockReturnValue(order.promise);
    const oldB = deferred<PortfolioSnapshot>();
    mocks.get.mockResolvedValueOnce(snapshot).mockReturnValueOnce(oldB.promise)
      .mockResolvedValueOnce({ creditBalance: 46, items: [] });
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    h.render("token", "player-b"); h.commit();
    const oldSignal = mocks.get.mock.calls[1][1] as AbortSignal;
    order.resolve(receipt); await flushPromises();
    expect(oldSignal.aborted).toBe(true);
    expect(h.render("token", "player-b").portfolio.snapshot?.creditBalance).toBe(46);
    oldB.reject(Object.assign(new Error("Old GET failure"), { status: 401 })); await flushPromises();
    expect(h.unauthorized).not.toHaveBeenCalled();
    expect(h.render("token", "player-b").portfolio.snapshot?.creditBalance).toBe(46);
    h.cleanup();
  });

  it("does not reveal a late receipt or rejection after the session token changes", async () => {
    const order = deferred<typeof receipt>(); mocks.buy.mockReturnValue(order.promise);
    mocks.get.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ creditBalance: 30, items: [] });
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    h.render("new-token", "player-b"); h.commit(); await flushPromises();
    order.resolve(receipt); await flushPromises();
    expect(h.render("new-token", "player-b").order).toMatchObject({ status: "idle", receipt: null });
    expect(h.render("new-token", "player-b").draftQuantity).toBe("");
    expect(mocks.get).toHaveBeenCalledTimes(2); h.cleanup();
  });

  it("does not resurrect an old receipt when the token changes A to B to A", async () => {
    mocks.buy.mockResolvedValue(receipt);
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order.status).toBe("succeeded");
    h.render("token-b", "player-a"); h.commit(); await flushPromises();
    expect(h.render("token-b", "player-a").order.status).toBe("idle");
    h.render("token", "player-a"); h.commit(); await flushPromises();
    expect(h.render("token", "player-a").order).toMatchObject({ status: "idle", receipt: null });
    expect(h.render("token", "player-a").draftQuantity).toBe(""); h.cleanup();
  });

  it("clears receipt, draft and confirmation across logout and return to the same token", async () => {
    mocks.buy.mockResolvedValue(receipt);
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    h.render().setDraftQuantity("3"); h.render().openBuyConfirmation("Jugador A", 8);
    expect(h.render().order.status).toBe("succeeded");
    expect(h.render().confirmation).not.toBeNull();
    h.render(null, "player-a"); h.commit();
    expect(h.render(null, "player-a").order.status).toBe("idle");
    h.render("token", "player-a"); h.commit(); await flushPromises();
    expect(h.render("token", "player-a").order).toMatchObject({ status: "idle", receipt: null });
    expect(h.render("token", "player-a").draftQuantity).toBe("");
    expect(h.render("token", "player-a").confirmation).toBeNull(); h.cleanup();
  });

  it("drops an old submitting state and its late result across logout and return", async () => {
    const oldOrder = deferred<typeof receipt>(); mocks.buy.mockReturnValue(oldOrder.promise);
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    expect(h.render().order.status).toBe("submitting");
    h.render(null, "player-a"); h.commit();
    h.render("token", "player-a"); h.commit(); await flushPromises();
    oldOrder.resolve(receipt); await flushPromises();
    expect(h.render("token", "player-a").order).toMatchObject({ status: "idle", receipt: null });
    expect(mocks.get).toHaveBeenCalledTimes(2); h.cleanup();
  });

  it("invalidates an unsubmitted confirmation when player changes", async () => {
    mocks.get.mockResolvedValue(snapshot);
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openBuyConfirmation("Jugador A", 8);
    h.render("token", "player-b"); h.commit();
    h.render("token", "player-b").confirmOrder();
    expect(mocks.buy).not.toHaveBeenCalled();
    expect(h.render("token", "player-b").confirmation).toBeNull(); h.cleanup();
  });
});

describe("usePlayerTrading SELL", () => {
  beforeEach(() => vi.clearAllMocks());

  async function ready() {
    mocks.get.mockResolvedValue(snapshot);
    const h = setup(); await flushPromises();
    return h;
  }

  it("freezes a valid sale and cancels without POST while retaining the draft", async () => {
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8);
    expect(h.render().confirmation).toEqual({
      type: "SELL", playerId: "player-a", playerName: "Jugador A", quantity: 2,
      quoteValue: 8, estimatedTotal: 16,
    });
    h.render().cancelConfirmation();
    expect(h.render().confirmation).toBeNull();
    expect(h.render().draftQuantity).toBe("2");
    expect(mocks.sell).not.toHaveBeenCalled(); h.cleanup();
  });

  it("blocks selling zero or more than the current holding and cannot sell another player's position", async () => {
    const h = await ready();
    h.render().setDraftQuantity("0"); h.render().openSellConfirmation("Jugador A", 8);
    expect(h.render().confirmation).toBeNull();
    h.render().setDraftQuantity("4"); h.render().openSellConfirmation("Jugador A", 8);
    expect(h.render().confirmation).toBeNull();
    h.render("token", "player-b"); h.commit(); await flushPromises();
    h.render("token", "player-b").setDraftQuantity("1");
    h.render("token", "player-b").openSellConfirmation("Jugador B", 8);
    expect(h.render("token", "player-b").confirmation).toBeNull();
    expect(mocks.sell).not.toHaveBeenCalled(); h.cleanup();
  });

  it("submits one frozen SELL despite double activation and accepts a total sale after GET", async () => {
    const order = deferred<typeof sellReceipt>(); mocks.sell.mockReturnValue(order.promise);
    mocks.get.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ creditBalance: 116, items: [] });
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("3"); h.render().openSellConfirmation("Jugador A", 8);
    const confirm = h.render().confirmOrder;
    confirm(8); confirm(8);
    expect(mocks.sell).toHaveBeenCalledExactlyOnceWith("token", { playerId: "player-a", quantity: 3 });
    expect(mocks.buy).not.toHaveBeenCalled();
    expect(h.render().order.status).toBe("submitting");
    order.resolve({ ...sellReceipt, operation: { ...sellReceipt.operation, quantity: 3 } });
    await flushPromises();
    expect(h.render().order).toMatchObject({ status: "succeeded", receipt: { operation: { type: "SELL", quantity: 3 } } });
    expect(h.render().portfolio).toMatchObject({ status: "empty", snapshot: { creditBalance: 116, items: [] } });
    expect(mocks.get).toHaveBeenCalledTimes(2); h.cleanup();
  });

  it("preserves the SELL receipt when the GET after 201 fails", async () => {
    mocks.sell.mockResolvedValue(sellReceipt);
    mocks.get.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("GET failed"));
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order).toMatchObject({ status: "succeeded", receipt: sellReceipt });
    expect(h.render().portfolio).toMatchObject({ status: "error", snapshot: null }); h.cleanup();
  });

  it.each([
    ["Insufficient token holding", /tenencia/i],
    ["Insufficient central pool balance", /pool/i],
    ["Unknown conflict", /rechazada|rechazó/i],
  ])("rejects 409 %s without inventing a successful sale", async (message, expectedMessage) => {
    mocks.sell.mockRejectedValue(Object.assign(new Error(message), { status: 409 }));
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order.status).toBe("rejected");
    expect(h.render().order.error).toMatch(expectedMessage);
    expect(h.render().order.receipt).toBeNull();
    expect(h.render().draftQuantity).toBe("2");
    expect(mocks.get).toHaveBeenCalledOnce(); h.cleanup();
  });

  it.each([
    new TypeError("Network unavailable"),
    Object.assign(new Error("Server failure"), { status: 503 }),
  ])("marks an unconfirmed SELL uncertain and never retries POST automatically", async (failure) => {
    mocks.sell.mockRejectedValue(failure);
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.render().order.status).toBe("uncertain");
    expect(h.render().order.receipt).toBeNull();
    expect(mocks.sell).toHaveBeenCalledOnce();
    expect(mocks.get).toHaveBeenCalledOnce(); h.cleanup();
  });

  it("clears financial data and logs out on SELL 401", async () => {
    mocks.sell.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }));
    const h = await ready();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    await flushPromises();
    expect(h.unauthorized).toHaveBeenCalledOnce();
    expect(h.render().portfolio.snapshot).toBeNull();
    expect(h.render().order.receipt).toBeNull(); h.cleanup();
  });

  it("labels a late SELL with its original player and refreshes the newly opened profile", async () => {
    const order = deferred<typeof sellReceipt>(); mocks.sell.mockReturnValue(order.promise);
    mocks.get.mockResolvedValueOnce(snapshot)
      .mockResolvedValueOnce({ creditBalance: 30, items: [] })
      .mockResolvedValueOnce({ creditBalance: 46, items: [] });
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    h.render("token", "player-b"); h.commit(); await flushPromises();
    order.resolve(sellReceipt); await flushPromises();
    expect(h.render("token", "player-b").order).toMatchObject({
      status: "succeeded", playerId: "player-a", playerName: "Jugador A", receipt: sellReceipt,
    });
    expect(h.render("token", "player-b").portfolio.snapshot?.creditBalance).toBe(46);
    expect(mocks.get).toHaveBeenCalledTimes(3); h.cleanup();
  });

  it("drops a late SELL result after a session change", async () => {
    const order = deferred<typeof sellReceipt>(); mocks.sell.mockReturnValue(order.promise);
    mocks.get.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({ creditBalance: 30, items: [] });
    const h = setup(); await flushPromises();
    h.render().setDraftQuantity("2"); h.render().openSellConfirmation("Jugador A", 8); h.render().confirmOrder(8);
    h.render("new-token", "player-b"); h.commit(); await flushPromises();
    order.resolve(sellReceipt); await flushPromises();
    expect(h.render("new-token", "player-b").order).toMatchObject({ status: "idle", receipt: null });
    expect(mocks.get).toHaveBeenCalledTimes(2); h.cleanup();
  });
});
