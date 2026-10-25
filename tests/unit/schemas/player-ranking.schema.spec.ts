import { describe, expect, it } from "vitest";
import { playerRankingQuerySchema } from "@/backend/schemas/player-ranking.schema";

describe("player ranking query schema", () => {
  it("applies pagination defaults and trims the team filter", () => {
    expect(playerRankingQuerySchema.parse({ team: " Arsenal " })).toEqual({
      team: "Arsenal",
      page: 1,
      limit: 20,
    });
  });

  it("accepts valid filters and pagination", () => {
    expect(playerRankingQuerySchema.parse({
      league: "PREMIER_LEAGUE",
      position: "FORWARD",
      page: "2",
      limit: "50",
    })).toEqual({
      league: "PREMIER_LEAGUE",
      position: "FORWARD",
      page: 2,
      limit: 50,
    });
  });

  it.each([
    { page: "0" },
    { limit: "0" },
    { limit: "101" },
    { team: "   " },
    { unknown: "value" },
  ])("rejects invalid or unknown query data: %j", (input) => {
    expect(() => playerRankingQuerySchema.parse(input)).toThrow();
  });
});
