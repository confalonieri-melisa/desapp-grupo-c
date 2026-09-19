import { describe, expect, it } from "vitest";
import { toPlayer } from "@/repositories/player.repository";
import { toUser } from "@/repositories/user.repository";
import { League, Position, UserRole } from "@/models/enums";

describe("persistence domain mappings", () => {
  it("maps a user row to the User aggregate", () => {
    const user = toUser({
      id: "00000000-0000-0000-0000-000000000001",
      email: "alice@example.com",
      password: "secret",
      name: "Alice",
      role: UserRole.INVESTOR,
      creditBalance: "1000.00",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(user.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(user.creditBalance).toBe(1000);
    expect(user.password).toBe("secret");
  });

  it("maps a player row to the Player aggregate", () => {
    const row = {
      id: "00000000-0000-0000-0000-000000000002",
      source: "WHOSCORED",
      externalId: "42",
      name: "Player",
      team: "Team",
      league: League.PREMIER_LEAGUE,
      position: Position.FORWARD,
      statistics: { goals: 2 },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const player = toPlayer(row);
    expect(player.statistics).toEqual({ goals: 2 });
  });
});
