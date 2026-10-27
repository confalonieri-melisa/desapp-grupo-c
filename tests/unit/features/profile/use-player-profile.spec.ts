import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerApiDetail } from "@/frontend/services/client/player.service";
import { League, Position } from "@/backend/models/enums";
import { createHookHarness, deferred } from "./hook-harness";

const { getPlayerMock, useEffectMock, useStateMock, useRefMock } = vi.hoisted(() => ({
  getPlayerMock: vi.fn(),
  useEffectMock: vi.fn(),
  useStateMock: vi.fn(),
  useRefMock: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: useEffectMock,
  useState: useStateMock,
  useRef: useRefMock,
}));

vi.mock("@/frontend/services/client/player.service", () => ({
  getPlayer: getPlayerMock,
}));

import { usePlayerProfile } from "@/frontend/features/profile/hooks/usePlayerProfile";

const player: PlayerApiDetail = {
  id: "player-1",
  name: "Player",
  team: "Team",
  league: League.LA_LIGA,
  position: Position.FORWARD,
  statistics: { rating: 80 },
  currentQuote: 1,
  totalTokens: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

function useTestHook(token: string | null = "token", playerId = "player-1") {
  const harness = createHookHarness();
  useStateMock.mockImplementation(harness.useState);
  useRefMock.mockImplementation(harness.useRef);
  useEffectMock.mockImplementation(harness.useEffect);
  const unauthorized = vi.fn();
  const render = (nextToken = token, nextId = playerId, callback = unauthorized) => {
    function TestHook() { return usePlayerProfile(nextToken, nextId, callback); }
    return harness.render(TestHook);
  };
  const result = render();
  const state = {
    get 0() { return render().player; },
    get 1() { return render().isLoading; },
    get 2() { return render().error; },
  };
  const effect = () => { harness.commit(); return () => harness.cleanup(); };
  return { effect, result, state, unauthorized, render, harness };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("usePlayerProfile", () => {
  beforeEach(() => {
    getPlayerMock.mockReset();
    useEffectMock.mockReset();
    useStateMock.mockReset();
    useRefMock.mockReset();
  });

  it("does not request without token or player id", () => {
    const withoutToken = useTestHook(null);
    withoutToken.effect();
    expect(getPlayerMock).not.toHaveBeenCalled();

    useEffectMock.mockReset();
    useStateMock.mockReset();
    const withoutPlayer = useTestHook("token", "");
    withoutPlayer.effect();
    expect(getPlayerMock).not.toHaveBeenCalled();
  });

  it("loads the player and clears loading state", async () => {
    getPlayerMock.mockResolvedValue(player);
    const { effect, state } = useTestHook();

    effect();
    await flushPromises();

    expect(getPlayerMock).toHaveBeenCalledWith("token", "player-1", expect.any(AbortSignal));
    expect(state[0]).toEqual(player);
    expect(state[1]).toBe(false);
    expect(state[2]).toBeNull();
  });

  it("redirects on unauthorized errors", async () => {
    getPlayerMock.mockRejectedValue(new Error("Unauthorized"));
    const { effect, unauthorized, state } = useTestHook();

    effect();
    await flushPromises();

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(state[1]).toBe(false);
    expect(state[2]).toBeNull();
  });

  it("stores API and fallback errors", async () => {
    getPlayerMock.mockRejectedValueOnce(new Error("Unavailable"));
    const first = useTestHook();
    first.effect();
    await flushPromises();
    expect(first.state[2]).toBe("Unavailable");

    useEffectMock.mockReset();
    useStateMock.mockReset();
    getPlayerMock.mockRejectedValueOnce("failure");
    const second = useTestHook();
    second.effect();
    await flushPromises();
    expect(second.state[2]).toBe("No se pudo cargar el jugador");
  });

  it("ignores aborted requests and aborts on cleanup", async () => {
    getPlayerMock.mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const { effect, state } = useTestHook();

    const cleanup = effect();
    const signal = getPlayerMock.mock.calls[0][2] as AbortSignal;
    cleanup?.();
    await flushPromises();

    expect(signal.aborted).toBe(true);
    expect(state[2]).toBeNull();
  });

  it.each(["success", "error", "401"])("hides prior identity immediately and ignores stale %s/finally", async (outcome) => {
    const old = deferred<PlayerApiDetail>();
    const current = deferred<PlayerApiDetail>();
    getPlayerMock.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const h = useTestHook();
    h.effect();
    expect(h.render("new-token", "player-2").player).toBeNull();
    h.harness.commit();
    if (outcome === "success") old.resolve(player);
    else old.reject(Object.assign(new Error("Unauthorized"), { status: outcome === "401" ? 401 : 500 }));
    await flushPromises();
    const result = h.render("new-token", "player-2");
    expect(result.player).toBeNull();
    expect(result.error).toBeNull();
    expect(result.isLoading).toBe(true);
    expect(h.unauthorized).not.toHaveBeenCalled();
    current.resolve({ ...player, id: "player-2" });
    await flushPromises();
    expect(h.render("new-token", "player-2").player?.id).toBe("player-2");
    expect(h.render("other-token", "player-2").player).toBeNull();
    h.harness.cleanup();
  });

  it("uses latest unauthorized callback without reloading on callback identity", async () => {
    const pending = deferred<PlayerApiDetail>();
    getPlayerMock.mockReturnValue(pending.promise);
    const h = useTestHook(); h.effect();
    const callback = vi.fn();
    h.render("token", "player-1", callback); h.harness.commit();
    expect(getPlayerMock).toHaveBeenCalledOnce();
    pending.reject(Object.assign(new Error("Expired"), { status: 401 }));
    await flushPromises();
    expect(callback).toHaveBeenCalledOnce();
    expect(h.unauthorized).not.toHaveBeenCalled();
    expect(h.state[0]).toBeNull();
  });
});
