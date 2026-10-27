import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHookHarness, deferred, flushPromises } from "./hook-harness";
import { history, playerA, playerB } from "./fixtures/player-quotes";
import type { PlayerQuotesResponse } from "@/frontend/services/client/player-quotes.service";

const mocks = vi.hoisted(() => ({ get: vi.fn(), state: vi.fn(), ref: vi.fn(), effect: vi.fn() }));
vi.mock("react", () => ({ useState: mocks.state, useRef: mocks.ref, useEffect: mocks.effect }));
vi.mock("@/frontend/services/client/player-quotes.service", () => ({ getPlayerQuotes: mocks.get }));
import { usePlayerQuotes } from "@/frontend/features/profile/hooks/usePlayerQuotes";

function setup(token: string | null = "token", playerId = playerA) {
  const harness = createHookHarness();
  mocks.state.mockImplementation(harness.useState);
  mocks.ref.mockImplementation(harness.useRef);
  mocks.effect.mockImplementation(harness.useEffect);
  const unauthorized = vi.fn();
  const render = (t = token, id = playerId, callback = unauthorized) => harness.render(() => usePlayerQuotes(t, id, callback));
  render(); harness.commit();
  return { ...harness, render, unauthorized };
}

describe("usePlayerQuotes history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not read without a confirmed identity/token", () => {
    const h = setup(null); expect(h.render().history.status).toBe("idle");
    expect(mocks.get).not.toHaveBeenCalled(); h.cleanup();
    setup("token", ""); expect(mocks.get).not.toHaveBeenCalled();
  });

  it("loads once, preserves history and takes current exclusively from items[0]", async () => {
    mocks.get.mockResolvedValue(history);
    const h = setup(); expect(h.render().history.status).toBe("loading");
    await flushPromises();
    expect(h.render().history.items).toBe(history.items);
    expect(h.render().current).toBe(history.items[0]);
    h.render("token", playerA, vi.fn()); h.commit();
    expect(mocks.get).toHaveBeenCalledOnce(); h.cleanup();
  });

  it("distinguishes empty history and recoverable error and permits retry", async () => {
    mocks.get.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ items: [] });
    const h = setup(); await flushPromises();
    expect(h.render().history).toMatchObject({ status: "error", error: "Offline" });
    h.render().retryHistory(); await flushPromises();
    expect(h.render().history.status).toBe("empty");
    expect(h.render().current).toBeUndefined(); h.cleanup();
  });

  it("keeps every duplicate in order, changes dataset generation and never fetches per row", async () => {
    mocks.get.mockResolvedValue(history);
    const h = setup(); await flushPromises();
    const initial = h.render();
    expect(initial.history.items).toEqual(history.items);
    expect(initial.history.items[0]).toBe(initial.history.items[2]);
    expect(mocks.get).toHaveBeenCalledOnce();
    initial.retryHistory(); await flushPromises();
    expect(h.render().history.generation).toBeGreaterThan(initial.history.generation);
    expect(h.render().history.items).toEqual(history.items);
    expect(mocks.get).toHaveBeenCalledTimes(2); h.cleanup();
  });

  it.each(["success", "error", "401"])("ignores overlapping history retry's late %s/finally", async (outcome) => {
    const first = deferred<PlayerQuotesResponse>(); const second = deferred<PlayerQuotesResponse>();
    mocks.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const h = setup(); h.render().retryHistory();
    if (outcome === "success") first.resolve(history);
    else first.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    expect(h.render().history.status).toBe("loading"); expect(h.unauthorized).not.toHaveBeenCalled();
    second.resolve(history); await flushPromises();
    expect(h.render().history.status).toBe("success"); h.cleanup();
  });

  it.each(["success", "error", "401"])("hides identities before effects and ignores late %s after player/token changes", async (outcome) => {
    const old = deferred<PlayerQuotesResponse>(); const next = deferred<PlayerQuotesResponse>();
    mocks.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const h = setup();
    expect(h.render("new", playerB).current).toBeUndefined(); h.commit();
    if (outcome === "success") old.resolve(history);
    else old.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    expect(h.render("new", playerB).history.status).toBe("loading");
    expect(h.unauthorized).not.toHaveBeenCalled();
    next.resolve({ items: [] }); await flushPromises();
    expect(h.render("new", playerB).history.status).toBe("empty"); h.cleanup();
  });

  it("uses the latest callback for a current 401, clears data and ignores requests after cleanup", async () => {
    const pending = deferred<PlayerQuotesResponse>(); mocks.get.mockReturnValue(pending.promise);
    const h = setup(); const callback = vi.fn();
    h.render("token", playerA, callback); h.commit();
    pending.reject(Object.assign(new Error("expired"), { status: 401 })); await flushPromises();
    expect(callback).toHaveBeenCalledOnce(); expect(h.render().current).toBeUndefined();
    h.cleanup();
    const late = deferred<PlayerQuotesResponse>(); mocks.get.mockReturnValue(late.promise);
    const unmounted = setup(); unmounted.cleanup(); late.reject(Object.assign(new Error("late"), { status: 401 }));
    await flushPromises(); expect(unmounted.unauthorized).not.toHaveBeenCalled();
  });

  it.each([[400, "Invalid player id"], [404, "Player not found"]])("treats player failure %s as fatal, not empty", async (status, message) => {
    mocks.get.mockRejectedValue(Object.assign(new Error(message), { status }));
    const h = setup(); await flushPromises();
    expect(h.render().playerError).toBeTruthy(); expect(h.render().current).toBeUndefined(); h.cleanup();
  });
});

describe("usePlayerQuotes date channel", () => {
  beforeEach(() => vi.clearAllMocks());
  async function loaded() {
    mocks.get.mockResolvedValue(history);
    const h = setup(); await flushPromises(); return h;
  }

  it("edits without fetching, validates and requests exact date independently", async () => {
    const h = await loaded(); const original = h.render().history;
    h.render().queryDate();
    expect(h.render().dateError).toBeTruthy(); expect(mocks.get).toHaveBeenCalledOnce();
    h.render().setSelectedDate("2026-10-20");
    expect(h.render().selectedDate).toBe("2026-10-20"); expect(h.render().requestedDate).toBe("");
    expect(mocks.get).toHaveBeenCalledOnce();
    h.render().queryDate(); expect(h.render().dated.status).toBe("loading");
    await flushPromises();
    expect(mocks.get).toHaveBeenLastCalledWith("token", playerA, "2026-10-20", expect.any(AbortSignal));
    expect(h.render().dated.status).toBe("success"); expect(h.render().requestedDate).toBe("2026-10-20");
    expect(h.render().history).toBe(original); h.cleanup();
  });

  it.each(["success", "error", "401"])("changing date discards pending %s and preserves history", async (outcome) => {
    const h = await loaded(); const pending = deferred<PlayerQuotesResponse>(); mocks.get.mockReturnValueOnce(pending.promise);
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate();
    h.render().setSelectedDate("2026-10-21");
    if (outcome === "success") pending.resolve(history);
    else pending.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    expect(h.render().dated.status).toBe("idle"); expect(h.render().requestedDate).toBe("");
    expect(h.render().current).toBe(history.items[0]); expect(h.unauthorized).not.toHaveBeenCalled(); h.cleanup();
  });

  it.each(["loading", "success", "error"])("clears date during %s and never resurrects a result", async (phase) => {
    const h = await loaded(); const pending = deferred<PlayerQuotesResponse>(); mocks.get.mockReturnValueOnce(pending.promise);
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate();
    if (phase === "success") pending.resolve(history);
    if (phase === "error") pending.reject(new Error("Offline"));
    await flushPromises();
    h.render().clearDate();
    if (phase === "loading") pending.resolve(history);
    await flushPromises();
    expect(h.render()).toMatchObject({ selectedDate: "", requestedDate: "", dateError: null, dated: { status: "idle", items: [] } });
    expect(h.render().history.items).toBe(history.items); h.cleanup();
  });

  it.each(["success", "error", "401"])("B remains current when A finishes later with %s", async (outcome) => {
    const h = await loaded(); const a = deferred<PlayerQuotesResponse>(); const b = deferred<PlayerQuotesResponse>();
    mocks.get.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate();
    h.render().setSelectedDate("2026-10-21"); h.render().queryDate();
    b.resolve({ items: [history.items[1]] }); await flushPromises();
    if (outcome === "success") a.resolve(history);
    else a.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    expect(h.render().dated.items).toEqual([history.items[1]]); expect(h.render().requestedDate).toBe("2026-10-21");
    expect(h.unauthorized).not.toHaveBeenCalled(); h.cleanup();
  });

  it.each([
    [404, "Quote not available for the requested date", "empty"],
    [400, "Invalid date", "error"],
    [404, "unknown error", "error"],
    [500, "Server failure", "error"],
  ])("classifies only recognized absence (%i %s)", async (status, message, expected) => {
    const h = await loaded(); mocks.get.mockRejectedValueOnce(Object.assign(new Error(message), { status }));
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate(); await flushPromises();
    expect(h.render().dated.status).toBe(expected);
    if (message === "Invalid date") expect(h.render().dateError).toBeTruthy();
    expect(h.render().current).toBe(history.items[0]); h.cleanup();
  });

  it("retries current criterion and keeps partial failure independent", async () => {
    const h = await loaded(); mocks.get.mockRejectedValueOnce(new Error("Offline"));
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate(); await flushPromises();
    expect(h.render().current).toBe(history.items[0]);
    h.render().setSelectedDate("2026-10-22"); h.render().queryDate(); await flushPromises();
    expect(mocks.get).toHaveBeenLastCalledWith("token", playerA, "2026-10-22", expect.any(AbortSignal)); h.cleanup();
  });

  it("renews only the changed surface dataset and hides all datasets on identity changes", async () => {
    const h = await loaded(); const initial = h.render().history.generation;
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate(); await flushPromises();
    const dateGeneration = h.render().dated.generation;
    expect(h.render().history.generation).toBe(initial);
    h.render().queryDate(); await flushPromises();
    expect(h.render().dated.generation).toBeGreaterThan(dateGeneration);
    expect(h.render().history.generation).toBe(initial);
    h.render().retryHistory(); await flushPromises();
    expect(h.render().history.generation).toBeGreaterThan(initial);
    expect(h.render().dated.status).toBe("success");
    expect(h.render("other", playerB)).toMatchObject({ current: undefined, dated: { status: "idle" }, selectedDate: "" });
    h.commit(); h.cleanup();
  });

  it.each(["success", "error", "401"])("discards date %s after identity change/unmount", async (outcome) => {
    const h = await loaded(); const pending = deferred<PlayerQuotesResponse>();
    mocks.get.mockReturnValueOnce(pending.promise);
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate();
    h.render("other", playerB); h.commit(); h.cleanup();
    if (outcome === "success") pending.resolve(history);
    else pending.reject(Object.assign(new Error("old"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises(); expect(h.unauthorized).not.toHaveBeenCalled();
  });

  it.each([[401, "Unauthorized"], [404, "Player not found"], [400, "Invalid player id"]])("clears all quotes for current fatal %i", async (status, message) => {
    const h = await loaded(); mocks.get.mockRejectedValueOnce(Object.assign(new Error(message), { status }));
    h.render().setSelectedDate("2026-10-20"); h.render().queryDate(); await flushPromises();
    expect(h.render().current).toBeUndefined(); expect(h.render().dated.items).toEqual([]);
    if (status === 401) expect(h.unauthorized).toHaveBeenCalledOnce(); else expect(h.render().playerError).toBeTruthy(); h.cleanup();
  });
});
