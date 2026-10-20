import { describe, expect, it } from "vitest";
import { League } from "@/backend/models/enums";
import { normalizeStandings } from "@/backend/schemas/football-data.schema";

describe("football-data schema", () => {
  it("normalizes only collective standings fields", () => {
    const result = normalizeStandings({
      standings: [{
        table: [{
          position: 1, playedGames: 4, points: 10, goalDifference: -1,
          team: { id: 7, name: "Example FC" },
          form: "WWDL", extraRating: 99,
        }],
      }],
      scorers: [{ goals: 99 }],
    }, League.PREMIER_LEAGUE, 2026);
    expect(result[0]).toEqual({
      league: League.PREMIER_LEAGUE, season: 2026, teamExternalId: "7",
      teamName: "Example FC", position: 1, playedGames: 4, points: 10,
      goalDifference: -1,
    });
  });

  it("rejects incomplete rows and multiple tables", () => {
    expect(() => normalizeStandings({ standings: [{ table: [] }] }, League.SERIE_A, 2026)).toThrow();
    expect(() => normalizeStandings({ standings: [{ table: [] }, { table: [] }] }, League.SERIE_A, 2026)).toThrow();
  });
});
