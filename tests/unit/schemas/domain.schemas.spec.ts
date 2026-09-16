import { describe, expect, it } from "vitest";
import { League, Position } from "@/models/enums";
import { playerSchema } from "@/schemas/player.schema";
import { tokenHoldingSchema } from "@/schemas/token-holding.schema";
import { userRegistrationSchema } from "@/schemas/user.schema";

describe("domain input schemas", () => {
  it("normalizes and validates user registration input", () => {
    const result = userRegistrationSchema.parse({
      name: "  Alice  ",
      email: "  alice@example.com  ",
      password: "secret",
    });

    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@example.com");
    expect(() =>
      userRegistrationSchema.parse({
        name: "Alice",
        email: "invalid",
        password: "secret",
      }),
    ).toThrow();
  });

  it("validates player input at the API boundary", () => {
    const result = playerSchema.parse({
      name: "  Player  ",
      team: "  Team  ",
      league: League.LA_LIGA,
      position: Position.FORWARD,
      statistics: { goals: 10 },
    });

    expect(result.name).toBe("Player");
    expect(() =>
      playerSchema.parse({
        name: "Player",
        team: "Team",
        league: "EREDIVISIE",
        position: Position.FORWARD,
      }),
    ).toThrow();
  });

  it("validates holding identifiers and token values", () => {
    const valid = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      playerId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      quantity: 10,
      averagePurchasePrice: 1.25,
    };

    expect(tokenHoldingSchema.parse(valid).quantity).toBe(10);
    expect(() =>
      tokenHoldingSchema.parse({ ...valid, quantity: 1.5 }),
    ).toThrow();
  });
});
