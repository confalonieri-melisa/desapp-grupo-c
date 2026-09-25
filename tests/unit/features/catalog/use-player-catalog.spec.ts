import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerCatalogFilters } from "@/catalog/player-catalog";
import type { PlayerApiItem } from "@/services/client/player.service";
import { League, Position } from "@/models/enums";

const { getPlayersMock, useEffectMock, useStateMock } = vi.hoisted(() => ({
  getPlayersMock: vi.fn(),
  useEffectMock: vi.fn(),
  useStateMock: vi.fn(),
}));

vi.mock("react", () => ({
  useEffect: useEffectMock,
  useState: useStateMock,
}));

vi.mock("@/services/client/player.service", () => ({
  getPlayers: getPlayersMock,
}));

import { usePlayerCatalog } from "@/features/catalog/hooks/usePlayerCatalog";

const filters: PlayerCatalogFilters = {
  league: "",
  team: "",
  position: "",
};

const player: PlayerApiItem = {
  id: "player-1",
  name: "Player",
  team: "Team",
  league: League.LA_LIGA,
  position: Position.FORWARD,
  statistics: { rating: 80 },
  currentQuote: 1,
  totalTokens: 100,
};

function useTestHook(token: string | null = "token") {
  const state = [[], false, null, {
    total: 0,
    page: 1,
    limit: 18,
    totalPages: 0,
  }] as [
    PlayerApiItem[],
    boolean,
    string | null,
    {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    },
  ];

  useStateMock
    .mockImplementationOnce(() => [state[0], (value: PlayerApiItem[]) => {
      state[0] = value;
    }])
    .mockImplementationOnce(() => [state[1], (value: boolean) => {
      state[1] = value;
    }])
    .mockImplementationOnce(() => [state[2], (value: string | null) => {
      state[2] = value;
    }])
    .mockImplementationOnce(() => [state[3], (value: typeof state[3]) => {
      state[3] = value;
    }]);

  const unauthorized = vi.fn();
  const result = usePlayerCatalog(token, filters, 1, unauthorized);
  const effect = useEffectMock.mock.calls.at(-1)?.[0] as () => void | (() => void);

  return { effect, result, state, unauthorized };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("usePlayerCatalog", () => {
  beforeEach(() => {
    getPlayersMock.mockReset();
    useEffectMock.mockReset();
    useStateMock.mockReset();
  });

  it("does not start a request without a token", () => {
    const { effect } = useTestHook(null);

    effect();

    expect(getPlayersMock).not.toHaveBeenCalled();
  });

  it("loads players and toggles loading state", async () => {
    getPlayersMock.mockResolvedValue({
      data: [player],
      pagination: { total: 1, page: 1, limit: 18, totalPages: 1 },
    });
    const { effect, state } = useTestHook();

    effect();
    await flushPromises();

    expect(getPlayersMock).toHaveBeenCalledWith("token", filters, 1, expect.any(AbortSignal));
    expect(state[0]).toEqual([player]);
    expect(state[1]).toBe(false);
    expect(state[2]).toBeNull();
  });

  it("redirects when the API rejects with Unauthorized", async () => {
    getPlayersMock.mockRejectedValue(new Error("Unauthorized"));
    const { effect, state, unauthorized } = useTestHook();

    effect();
    await flushPromises();

    expect(unauthorized).toHaveBeenCalledOnce();
    expect(state[2]).toBeNull();
    expect(state[1]).toBe(false);
  });

  it("stores API errors and fallback errors", async () => {
    getPlayersMock.mockRejectedValueOnce(new Error("Unavailable"));
    const first = useTestHook();
    first.effect();
    await flushPromises();
    expect(first.state[2]).toBe("Unavailable");

    getPlayersMock.mockRejectedValueOnce("failure");
    const second = useTestHook();
    second.effect();
    await flushPromises();
    expect(second.state[2]).toBe("No se pudieron cargar los jugadores");
  });

  it("ignores aborted requests and aborts on cleanup", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    getPlayersMock.mockRejectedValue(abortError);
    const { effect, state } = useTestHook();

    const cleanup = effect();
    const signal = getPlayersMock.mock.calls[0][3] as AbortSignal;
    cleanup?.();
    await flushPromises();

    expect(state[2]).toBeNull();
    expect(signal.aborted).toBe(true);
  });
});
