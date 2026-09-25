import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlayer, getPlayers } from "@/services/client/player.service";
import { League, Position } from "@/models/enums";

describe("client player service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests a player detail with the authentication token", async () => {
    const response = {
      id: "player-1",
      name: "Raphinha",
      team: "Barcelona",
      league: League.LA_LIGA,
      position: Position.FORWARD,
      statistics: { goals: 5 },
      currentQuote: 1,
      totalTokens: 100,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    await expect(getPlayer("token", "player-1")).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/players/player-1",
      expect.objectContaining({ signal: undefined }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).has("Authorization")).toBe(true);
  });

  it("requests players with the authentication token and filters", async () => {
    const response = {
      data: [],
      pagination: { total: 0, page: 1, limit: 18, totalPages: 0 },
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    await expect(getPlayers("token", {
      league: League.BUNDESLIGA,
      team: "Schalke",
      position: Position.DEFENDER,
    }, 1)).resolves.toEqual(response);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/players?page=1&limit=18&league=BUNDESLIGA&team=Schalke&position=DEFENDER",
      {
        headers: { Authorization: "Bearer token" },
        signal: undefined,
      },
    );
  });

  it("throws the API error message when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    await expect(getPlayers("expired-token", {
      league: "",
      team: "",
      position: "",
    }, 1)).rejects.toThrow("Unauthorized");
  });

  it("prefers the message field from an API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Players unavailable" }), { status: 500 }),
    );

    await expect(getPlayers("token", {
      league: "",
      team: "",
      position: "",
    }, 1)).rejects.toThrow("Players unavailable");
  });

  it("uses the fallback message for non-JSON API errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("server error", { status: 500 }),
    );

    await expect(getPlayers("token", {
      league: "",
      team: "",
      position: "",
    }, 1)).rejects.toThrow("No se pudieron cargar los jugadores");
  });

  it("ignores unknown non-object API error payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify("server error"), { status: 500 }),
    );

    await expect(getPlayers("token", {
      league: "",
      team: "",
      position: "",
    }, 1)).rejects.toThrow("No se pudieron cargar los jugadores");
  });
});
