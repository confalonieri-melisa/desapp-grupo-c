import { describe, expect, it } from "vitest";
import { League, Position } from "@/backend/models/enums";
import { Player } from "@/backend/models/Player";
import { normalizeMetricValue, ValuationEngine } from "@/backend/services/valuation-engine";
import { buildValuationConfig } from "@/backend/services/valuation-strategy.service";
import type { IndividualMetricConfig } from "@/backend/models/valuation";

const player = new Player({
  id: "00000000-0000-0000-0000-000000000001",
  name: "Test Player",
  team: "Test FC",
  league: League.PREMIER_LEAGUE,
  position: Position.FORWARD,
  statistics: { appearances: 10, goals: 5, foulsPerGame: 1 },
});

const individualMetrics = [
  { metric: "appearances", polarity: "POSITIVE" as const, weight: 1, minimum: 0, maximum: 20 },
  { metric: "goals", polarity: "POSITIVE" as const, weight: 1, minimum: 0, maximum: 10 },
  { metric: "foulsPerGame", polarity: "NEGATIVE" as const, weight: 1, minimum: 0, maximum: 2 },
] satisfies IndividualMetricConfig[];

const configFor = (strategy: "INDIVIDUAL_PERFORMANCE" | "INDIVIDUAL_PLUS_TEAM_CONTEXT") => ({
  ...buildValuationConfig(strategy),
  individualMetrics,
});

describe("ValuationEngine", () => {
  it("normalizes negative metrics and calculates a quote", () => {
    const result = new ValuationEngine().calculate(
      player,
      "INDIVIDUAL_PERFORMANCE",
      configFor("INDIVIDUAL_PERFORMANCE"),
    );
    expect(result.individualScore).toBeCloseTo((0.5 + 0.5 + 0.5) / 3);
    expect(result.teamScore).toBeNull();
    expect(result.quoteValue).toBe(50.5);
  });

  it("keeps the individual score and adds bounded team context", () => {
    const result = new ValuationEngine().calculate(
      player,
      "INDIVIDUAL_PLUS_TEAM_CONTEXT",
      configFor("INDIVIDUAL_PLUS_TEAM_CONTEXT"),
      { contextUpdateId: "context", position: 1, points: 114, playedGames: 38, goalDifference: 80 },
    );
    expect(result.teamScore).toBe(1);
    expect(result.finalScore).toBeCloseTo(0.625);
    expect(result.explanation.team.every((item) => item.source === "FOOTBALL_DATA")).toBe(true);
  });

  it("clamps values outside the configured ranges", () => {
    const playerWithOutOfRangeValues = new Player({
      ...player,
      statistics: { appearances: 30, goals: 20, foulsPerGame: 0 },
    });
    const result = new ValuationEngine().calculate(
      playerWithOutOfRangeValues,
      "INDIVIDUAL_PERFORMANCE",
      configFor("INDIVIDUAL_PERFORMANCE"),
    );
    expect(result.individualScore).toBe(1);
  });

  it("renormalizes the weights when an individual metric is missing", () => {
    const config = configFor("INDIVIDUAL_PERFORMANCE");
    config.individualMetrics = [
      { metric: "appearances", polarity: "POSITIVE", weight: 1, minimum: 0, maximum: 20 },
      { metric: "goals", polarity: "POSITIVE", weight: 1, minimum: 0, maximum: 10 },
      { metric: "assists", polarity: "POSITIVE", weight: 2, minimum: 0, maximum: 10 },
    ];
    const result = new ValuationEngine().calculate(
      player,
      "INDIVIDUAL_PERFORMANCE",
      config,
    );

    expect(result.individualScore).toBe(0.5);
    expect(result.explanation.missingMetrics).toEqual(["assists"]);
  });

  it("uses the individual score and explains the degradation without team context", () => {
    const result = new ValuationEngine().calculate(
      player,
      "INDIVIDUAL_PLUS_TEAM_CONTEXT",
      configFor("INDIVIDUAL_PLUS_TEAM_CONTEXT"),
    );

    expect(result.teamScore).toBeNull();
    expect(result.finalScore).toBe(result.individualScore);
    expect(result.explanation).toMatchObject({
      degraded: true,
      effectivePolicy: "INDIVIDUAL_ONLY",
    });
  });

  it("returns a neutral value when a metric range has no width", () => {
    expect(normalizeMetricValue(42, {
      metric: "goals",
      polarity: "POSITIVE",
      weight: 1,
      minimum: 42,
      maximum: 42,
    })).toBe(0.5);
  });
});
