import { describe, expect, it } from "vitest";
import { League } from "@/backend/models/enums";
import {
  competitionContextRequestSchema,
  normalizeStandings,
} from "@/backend/schemas/football-data.schema";

describe("football-data schema", () => {
  it("coerces a valid season request and rejects invalid seasons", () => {
    expect(competitionContextRequestSchema.parse({ season: "2026" }))
      .toEqual({ season: 2026 });
    expect(() => competitionContextRequestSchema.parse({ season: 1999 }))
      .toThrow();
    expect(() => competitionContextRequestSchema.parse({ season: "invalid" }))
      .toThrow();
  });

  it("normalizes only collective standings fields", () => {
    const result = normalizeStandings({
      standings: [{
        type: "TOTAL",
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

  it("prefers the total standings table when the provider returns home and away tables", () => {
    const result = normalizeStandings({
      standings: [
        {
          type: "HOME",
          table: [{
            position: 1, playedGames: 2, points: 6, goalDifference: 5,
            team: { id: 7, name: "Example FC" },
          }],
        },
        {
          type: "TOTAL",
          table: [{
            position: 3, playedGames: 4, points: 7, goalDifference: 1,
            team: { id: 7, name: "Example FC" },
          }],
        },
      ],
    }, League.PREMIER_LEAGUE, 2026);

    expect(result[0]).toMatchObject({
      position: 3,
      playedGames: 4,
      points: 7,
      goalDifference: 1,
    });
  });

  it("rejects payloads that only contain home or away standings", () => {
    expect(() => normalizeStandings({
      standings: [{
        type: "HOME",
        table: [{
          position: 1, playedGames: 2, points: 6, goalDifference: 5,
          team: { id: 7, name: "Example FC" },
        }],
      }, {
        type: "AWAY",
        table: [{
          position: 2, playedGames: 2, points: 4, goalDifference: 1,
          team: { id: 7, name: "Example FC" },
        }],
      }],
    }, League.PREMIER_LEAGUE, 2026)).toThrow(/TOTAL/);
  });
});
