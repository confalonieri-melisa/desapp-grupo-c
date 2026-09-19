import { describe, expect, it } from "vitest";
import { Player } from "@/models/Player";
import { League, Position } from "@/models/enums";
import { DomainValidationError, InvalidLeagueError } from "@/models/errors";

describe("Player", () => {
  const validPlayer = () =>
    new Player({
      name: "Erling Haaland",
      team: "Manchester City",
      league: League.PREMIER_LEAGUE,
      position: Position.FORWARD,
      statistics: { goals: 20, assists: 4, minutes: 1800 },
    });

  it("creates a player from an official league", () => {
    const player = validPlayer();

    expect(player.league).toBe(League.PREMIER_LEAGUE);
    expect(player.position).toBe(Position.FORWARD);
    expect(player.statistics.goals).toBe(20);
  });

  it("rejects a league outside the official five", () => {
    expect(
      () =>
        new Player({
          name: "Player",
          team: "Team",
          league: "EREDIVISIE" as League,
          position: Position.MIDFIELDER,
        }),
    ).toThrow(InvalidLeagueError);
  });

  it("rejects negative or non-numeric statistics", () => {
    expect(
      () =>
        new Player({
          name: "Player",
          team: "Team",
          league: League.SERIE_A,
          position: Position.DEFENDER,
          statistics: { tackles: -1 },
        }),
    ).toThrow(DomainValidationError);

    expect(
      () =>
        new Player({
          name: "Player",
          team: "Team",
          league: League.LIGUE_1,
          position: Position.DEFENDER,
          statistics: { tackles: "many" as unknown as number },
        }),
    ).toThrow(DomainValidationError);
  });

  it("rejects incomplete player identity data", () => {
    expect(
      () =>
        new Player({
          name: " ",
          team: "Team",
          league: League.SERIE_A,
          position: Position.DEFENDER,
        }),
    ).toThrow(DomainValidationError);

    expect(
      () =>
        new Player({
          name: "Player",
          team: "Team",
          league: League.SERIE_A,
          position: "INVALID" as Position,
        }),
    ).toThrow(DomainValidationError);
  });
});
