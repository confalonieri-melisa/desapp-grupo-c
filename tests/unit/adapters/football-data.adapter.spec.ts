import { describe, expect, it, vi } from "vitest";
import { FootballDataAdapter } from "@/backend/adapters/football-data.adapter";
import { League } from "@/backend/models/enums";

const configuration = {
  FOOTBALL_DATA_BASE_URL: "https://fixture.test",
  FOOTBALL_DATA_TOKEN: "secret",
  FOOTBALL_DATA_TIMEOUT_MS: 100,
  FOOTBALL_DATA_MAX_RETRIES: 1,
} as never;

const payload = {
  standings: [{ table: [{
    position: 1, playedGames: 1, points: 3, goalDifference: 2,
    team: { id: 1, name: "Example" },
  }] }],
};

describe("football-data adapter", () => {
  it("uses only the standings endpoint and provider header", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const adapter = new FootballDataAdapter(configuration, { fetch });
    const result = await adapter.getStandings(League.PREMIER_LEAGUE, 2026);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("https://fixture.test/v4/competitions/PL/standings?season=2026");
    expect(fetch.mock.calls[0][1].headers["X-Auth-Token"]).toBe("secret");
    expect(result.standings).toHaveLength(1);
  });

  it("retries transient failures finitely but does not retry unauthorized responses", async () => {
    const retryingFetch = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200 }));
    await new FootballDataAdapter(configuration, { fetch: retryingFetch })
      .getStandings(League.BUNDESLIGA, 2026);
    expect(retryingFetch).toHaveBeenCalledTimes(2);

    const unauthorizedFetch = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(new FootballDataAdapter(configuration, { fetch: unauthorizedFetch })
      .getStandings(League.BUNDESLIGA, 2026)).rejects.toThrow();
    expect(unauthorizedFetch).toHaveBeenCalledTimes(1);
  });
});
