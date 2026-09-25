import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerApiDetail } from "@/services/client/player.service";
import { League, Position } from "@/models/enums";

const { getPlayerMock, useEffectMock, useStateMock } = vi.hoisted(() => ({
  getPlayerMock: vi.fn(),
  useEffectMock: vi.fn(),
  useStateMock: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: useEffectMock,
  useState: useStateMock,
}));

vi.mock("@/services/client/player.service", () => ({
  getPlayer: getPlayerMock,
}));

import { usePlayerProfile } from "@/features/profile/hooks/usePlayerProfile";

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
  const state = [null, false, null] as [
    PlayerApiDetail | null,
    boolean,
    string | null,
  ];

  useStateMock
    .mockImplementationOnce(() => [state[0], (value: PlayerApiDetail | null) => {
      state[0] = value;
    }])
    .mockImplementationOnce(() => [state[1], (value: boolean) => {
      state[1] = value;
    }])
    .mockImplementationOnce(() => [state[2], (value: string | null) => {
      state[2] = value;
    }]);

  const unauthorized = vi.fn();
  const result = usePlayerProfile(token, playerId, unauthorized);
  const effect = useEffectMock.mock.calls.at(-1)?.[0] as () => void | (() => void);

  return { effect, result, state, unauthorized };
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
});
