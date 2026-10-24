import { ConflictError } from "@/backend/errors/http.error";
import { VALUATION_STRATEGY_CODES, type ValuationConfig, type ValuationStrategyCode } from "@/backend/models/valuation";
import { ValuationRepository } from "@/backend/repositories/valuation.repository";

const INDIVIDUAL_METRIC_DEFINITIONS = [
  { metric: "rating", polarity: "POSITIVE" as const, weight: 0.35, minimum: 0, maximum: 10 },
  { metric: "minutesPlayed", polarity: "POSITIVE" as const, weight: 0.25, minimum: 0, maximum: 3420 },
  { metric: "appearances", polarity: "POSITIVE" as const, weight: 0.1, minimum: 0, maximum: 38 },
  { metric: "goals", polarity: "POSITIVE" as const, weight: 0.15, minimum: 0, maximum: 40 },
  { metric: "assists", polarity: "POSITIVE" as const, weight: 0.15, minimum: 0, maximum: 30 },
] as const;

const TEAM_METRIC_DEFINITIONS = [
  { metric: "points", polarity: "POSITIVE" as const, weight: 0.35, minimum: 0, maximum: 114 },
  { metric: "goalDifference", polarity: "POSITIVE" as const, weight: 0.3, minimum: -60, maximum: 80 },
  { metric: "position", polarity: "NEGATIVE" as const, weight: 0.25, minimum: 1, maximum: 20 },
  { metric: "playedGames", polarity: "POSITIVE" as const, weight: 0.1, minimum: 0, maximum: 38 },
] as const;

const STRATEGY_SHARES = {
  [VALUATION_STRATEGY_CODES.INDIVIDUAL_PERFORMANCE]: {
    individualShare: 1,
    teamShare: 0,
  },
  [VALUATION_STRATEGY_CODES.INDIVIDUAL_PLUS_TEAM_CONTEXT]: {
    individualShare: 0.75,
    teamShare: 0.25,
  },
} satisfies Record<
  ValuationStrategyCode,
  Pick<ValuationConfig, "individualShare" | "teamShare">
>;

export function buildValuationConfig(strategyCode: ValuationStrategyCode): ValuationConfig {
  const shares = STRATEGY_SHARES[strategyCode];

  return {
    individualMetrics: buildIndividualMetrics(),
    teamMetrics: buildTeamMetrics(),
    ...shares,
    missingContextPolicy: "INDIVIDUAL_ONLY",
    quoteFormula: "LINEAR_1_99",
    precision: 2,
  };
}

function buildIndividualMetrics() {
  return INDIVIDUAL_METRIC_DEFINITIONS.map((metric) => ({ ...metric }));
}

function buildTeamMetrics() {
  return TEAM_METRIC_DEFINITIONS.map((metric) => ({ ...metric }));
}

export class ValuationStrategyService {
  constructor(private readonly repository = new ValuationRepository()) {}

  async activate(strategyCode: ValuationStrategyCode, createdBy: string) {
    const version = "1.0.0";
    const config = buildValuationConfig(strategyCode);
    const active = await this.repository.activateStrategyVersion(strategyCode, version, config, createdBy);
    if (!active) throw new ConflictError("Unable to activate valuation strategy");
    return { strategyCode, version, isActive: true };
  }
}
