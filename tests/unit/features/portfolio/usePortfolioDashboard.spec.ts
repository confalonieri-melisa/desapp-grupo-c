import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortfolioSnapshot } from "@/frontend/services/client/player-trading.service";
import { PORTFOLIO_UPDATED_EVENT, type PortfolioUpdate } from "@/frontend/services/client/portfolio-events";
import { createHookHarness, deferred, flushPromises } from "../profile/hook-harness";

const mocks = vi.hoisted(() => ({ get: vi.fn(), player: vi.fn(), state: vi.fn(), ref: vi.fn(), effect: vi.fn(), callback: vi.fn() }));
vi.mock("react", () => ({ useState: mocks.state, useRef: mocks.ref, useEffect: mocks.effect, useCallback: mocks.callback }));
vi.mock("@/frontend/services/client/player-trading.service", () => ({ getPortfolio: mocks.get }));
vi.mock("@/frontend/services/client/player.service", () => ({ getPlayer: mocks.player }));
import { usePortfolioDashboard } from "@/frontend/features/portfolio/hooks/usePortfolioDashboard";

const snapshot: PortfolioSnapshot = { creditBalance: 100, items: [{
  playerId: "a", quantity: 2, averagePurchasePrice: 5, currentQuoteValue: 7, currentValue: 14, unrealizedPnl: 4,
}] };
function setup(token: string | null = "one") {
  const harness = createHookHarness();
  mocks.state.mockImplementation(harness.useState);
  mocks.ref.mockImplementation(harness.useRef);
  mocks.effect.mockImplementation(harness.useEffect);
  mocks.callback.mockImplementation(harness.useCallback);
  const unauthorized = vi.fn();
  const render = (value = token) => harness.render(() => usePortfolioDashboard(value, unauthorized));
  render(); harness.commit();
  return { ...harness, render, unauthorized };
}
function update(status: PortfolioUpdate["status"], next: PortfolioSnapshot | null, token = "one") {
  window.dispatchEvent(new CustomEvent<PortfolioUpdate>(PORTFOLIO_UPDATED_EVENT, { detail: { status, snapshot: next, token } }));
}

describe("portfolio dashboard lifecycle", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("window", new EventTarget()); mocks.player.mockResolvedValue({ name: "Jugador A" }); });
  afterEach(() => vi.unstubAllGlobals());

  it("loads, retries an initial failure and falls back to the id when a name fails", async () => {
    mocks.get.mockRejectedValueOnce(new Error("Sin conexión")).mockResolvedValueOnce(snapshot);
    mocks.player.mockRejectedValue(new Error("missing"));
    const h = setup(); await flushPromises();
    expect(h.render()).toMatchObject({ phase: "initial-error", snapshot: null, error: "Sin conexión" });
    h.render().retry(); await flushPromises();
    expect(h.render()).toMatchObject({ phase: "content", snapshot, names: {} });
    expect(mocks.player).toHaveBeenCalledOnce(); h.cleanup();
  });

  it("keeps the prior snapshot marked stale after refresh failure and accepts retry", async () => {
    mocks.get.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("Offline"))
      .mockResolvedValueOnce({ creditBalance: 80, items: [] });
    const h = setup(); await flushPromises();
    h.render().retry();
    expect(h.render()).toMatchObject({ phase: "refreshing", snapshot });
    await flushPromises();
    expect(h.render()).toMatchObject({ phase: "stale-error", snapshot, error: "Offline" });
    h.render().retry(); await flushPromises();
    expect(h.render()).toMatchObject({ phase: "empty", snapshot: { creditBalance: 80, items: [] } });
    h.cleanup();
  });

  it("uses matching update events and prevents an old GET from overwriting a newer snapshot", async () => {
    const pending = deferred<PortfolioSnapshot>(); mocks.get.mockReturnValue(pending.promise);
    const h = setup();
    update("success", { creditBalance: 999, items: [] }, "other");
    expect(h.render().phase).toBe("initial-loading");
    update("success", snapshot);
    pending.resolve({ creditBalance: 1, items: [] }); await flushPromises();
    expect(h.render()).toMatchObject({ phase: "content", snapshot });
    update("loading", null);
    expect(h.render()).toMatchObject({ phase: "refreshing", snapshot });
    update("error", null);
    expect(h.render()).toMatchObject({ phase: "stale-error", snapshot });
    h.cleanup();
  });

  it("removes protected data on token change and ignores a late response", async () => {
    const old = deferred<PortfolioSnapshot>();
    mocks.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ creditBalance: 3, items: [] });
    const h = setup();
    h.render("two"); h.commit(); await flushPromises();
    old.resolve(snapshot); await flushPromises();
    expect(h.render("two")).toMatchObject({ phase: "empty", snapshot: { creditBalance: 3, items: [] } });
    h.render(null); h.commit();
    expect(h.render(null).snapshot).toBeNull(); h.cleanup();
  });

  it("logs out on a current 401 and removes figures", async () => {
    mocks.get.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(Object.assign(new Error("Unauthorized"), { status: 401 }));
    const h = setup(); await flushPromises();
    h.render().retry(); await flushPromises();
    expect(h.unauthorized).toHaveBeenCalledOnce();
    expect(h.render().snapshot).toBeNull(); h.cleanup();
  });
});
