import { describe, expect, it, vi } from "vitest";
import { League, Position } from "@/models/enums";
import { WhoScoredAdapter } from "@/adapters/whoscored.adapter";

const rawPlayer = {
  externalId: "42",
  player: " Kylian Mbappé ",
  team: "Real Madrid",
  league: League.LA_LIGA,
  position: Position.FORWARD,
  appearances: "12",
  minutesPlayed: 900,
  rating: 7.8,
  goals: 10,
  assists: 3,
  shotsPerGame: 4.2,
  tacklesPerGame: 0.4,
  interceptionsPerGame: 0.1,
  foulsPerGame: 0.6,
  yellowCards: 1,
  redCards: 0,
};

describe("WhoScoredAdapter", () => {
  it("normalizes only the minimal statistics contract", async () => {
    const adapter = new WhoScoredAdapter(vi.fn().mockResolvedValue([rawPlayer]));

    await expect(adapter.fetchPlayers()).resolves.toEqual([
      {
        externalId: "42",
        name: "Kylian Mbappé",
        team: "Real Madrid",
        league: League.LA_LIGA,
        position: Position.FORWARD,
        statistics: {
          appearances: 12,
          minutesPlayed: 900,
          rating: 7.8,
          goals: 10,
          assists: 3,
          shotsPerGame: 4.2,
          tacklesPerGame: 0.4,
          interceptionsPerGame: 0.1,
          foulsPerGame: 0.6,
          yellowCards: 1,
          redCards: 0,
        },
      },
    ]);
  });

  it("rejects invalid normalized statistics", async () => {
    const adapter = new WhoScoredAdapter(
      vi.fn().mockResolvedValue([{ ...rawPlayer, goals: "-1" }]),
    );

    await expect(adapter.fetchPlayers()).rejects.toThrow(
      "Invalid WhoScored statistic: goals",
    );
  });

  it("delegates scraping to the injected scraper", async () => {
    const scraper = vi.fn().mockResolvedValue([rawPlayer]);
    const adapter = new WhoScoredAdapter(scraper);

    await adapter.fetchPlayers();

    expect(scraper).toHaveBeenCalledOnce();
  });
});
