import type { Player } from "@/backend/models/Player";
import {
  type IndividualMetric,
  type MetricConfig,
  type MetricContribution,
  type QuoteExplanation,
  type TeamContext,
  type TeamMetric,
  type ValuationConfig,
  type ValuationResult,
  type ValuationStrategyCode,
  VALUATION_STRATEGY_CODES,
  InsufficientValuationDataError,
} from "@/backend/models/valuation";
import { DATA_SOURCES } from "@/backend/models/data-sources";

type ScoreComponent = {
  score: number;
  contributions: MetricContribution[];
  missing: string[];
};

type MetricEvaluation = {
  metric: string;
  contribution?: MetricContribution;
  missing: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function normalizeMetricValue(value: number, metric: MetricConfig): number {
  if (metric.minimum === metric.maximum) return 0.5;
  const normalized = clamp(
    (value - metric.minimum) / (metric.maximum - metric.minimum),
  );
  return metric.polarity === "POSITIVE" ? normalized : 1 - normalized;
}

export function buildContribution(
  metric: MetricConfig,
  rawValue: number,
  source: MetricContribution["source"],
  weight = metric.weight,
): MetricContribution {
  const normalizedValue = normalizeMetricValue(rawValue, metric);
  return {
    metric: metric.metric,
    rawValue,
    normalizedValue,
    weight,
    contribution: normalizedValue * weight,
    source,
    range: { minimum: metric.minimum, maximum: metric.maximum },
  };
}

export function calculateWeightedScore(contributions: MetricContribution[]): number {
  if (!contributions.length) return 0;

  const totalWeight = contributions.reduce((sum, item) => sum + item.weight, 0);
  return contributions.reduce((sum, item) => sum + item.contribution, 0) / totalWeight;
}

export function quoteFromScore(score: number): number {
  return Math.round((1 + 99 * clamp(score)) * 100) / 100;
}

export class ValuationEngine {
  calculate(
    player: Player,
    strategyCode: ValuationStrategyCode,
    config: ValuationConfig,
    teamContext?: TeamContext,
    version = "runtime",
  ): ValuationResult {
    const individual = calculateIndividualScore(player, config);
    const team = this.calculateTeamComponent(strategyCode, config, teamContext);
    const teamScore = team.contributions.length ? team.score : null;
    const finalScore = combineScores(individual.score, teamScore, config);

    return {
      individualScore: individual.score,
      teamScore,
      finalScore,
      quoteValue: quoteFromScore(finalScore),
      explanation: buildExplanation(
        strategyCode,
        individual,
        team,
        teamContext,
        config,
        version,
      ),
    };
  }

  private calculateTeamComponent(strategyCode: ValuationStrategyCode, config: ValuationConfig, context?: TeamContext): ScoreComponent {
    if (strategyCode !== VALUATION_STRATEGY_CODES.INDIVIDUAL_PLUS_TEAM_CONTEXT || !context) {
      return scoreComponent([], []);
    }
    return calculateTeamScore(config, context);
  }
}

export function calculateIndividualScore(player: Player, config: ValuationConfig): ScoreComponent {
  const evaluated = config.individualMetrics.map((metric) =>
    evaluateIndividualMetric(player, metric)
  );
  const contributions = evaluated.flatMap((item) =>
    item.contribution ? [item.contribution] : []
  );
  const missing = evaluated
    .filter((item) => item.missing)
    .map((item) => item.metric);
  requireIndividualContributions(player, contributions);
  return scoreComponent(contributions, missing);
}

function evaluateIndividualMetric(player: Player, metric: MetricConfig & { metric: IndividualMetric }): MetricEvaluation {
  const weight = metric.positionWeights?.[player.position] ?? metric.weight;
  const contribution = buildMetricContribution(metric, player.statistics[metric.metric], DATA_SOURCES.WHOSCORED, weight);
  if (!contribution) {
    return { metric: metric.metric, missing: true };
  }
  return { metric: metric.metric, contribution, missing: false };
}

function requireIndividualContributions(player: Player, contributions: MetricContribution[]): void {
  if (!contributions.length) {
    throw new InsufficientValuationDataError(`No valid individual metrics for ${player.id}`);
  }
}

export function calculateTeamScore(config: ValuationConfig, context: TeamContext): ScoreComponent {
  const evaluated = config.teamMetrics.map((metric) =>
    evaluateTeamMetric(metric, context)
  );
  const contributions = evaluated.flatMap((item) =>
    item.contribution ? [item.contribution] : []
  );
  const missing = evaluated
    .filter((item) => item.missing)
    .map((item) => item.metric);
  return scoreComponent(contributions, missing);
}

function evaluateTeamMetric(metric: MetricConfig & { metric: TeamMetric }, context: TeamContext): MetricEvaluation {
  const contribution = buildMetricContribution(
    metric,
    context[metric.metric],
    DATA_SOURCES.FOOTBALL_DATA,
  );
  return contribution
    ? { metric: metric.metric, contribution, missing: false }
    : { metric: metric.metric, missing: true };
}

function buildMetricContribution(
  metric: MetricConfig,
  rawValue: number | undefined,
  source: MetricContribution["source"],
  weight = metric.weight,
): MetricContribution | undefined {
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue) || weight <= 0) {
    return undefined;
  }
  return buildContribution(metric, rawValue, source, weight);
}

function scoreComponent(contributions: MetricContribution[], missing: string[]): ScoreComponent {
  return {
    contributions,
    missing,
    score: calculateWeightedScore(contributions),
  };
}

export function combineScores(individualScore: number, teamScore: number | null, config: ValuationConfig): number {
  if (teamScore === null) return individualScore;
  return config.individualShare * individualScore + config.teamShare * teamScore;
}

function buildExplanation(
  strategyCode: ValuationStrategyCode,
  individual: ScoreComponent,
  team: ScoreComponent,
  teamContext: TeamContext | undefined,
  config: ValuationConfig,
  version: string,
): QuoteExplanation {
  const degraded = strategyCode === VALUATION_STRATEGY_CODES.INDIVIDUAL_PLUS_TEAM_CONTEXT && !teamContext;
  return {
    strategyCode,
    version,
    individual: individual.contributions,
    team: team.contributions,
    missingMetrics: [...individual.missing, ...team.missing],
    effectivePolicy: degraded ? config.missingContextPolicy : "NONE",
    degraded,
    ...(teamContext ? { contextUpdateId: teamContext.contextUpdateId } : {}),
  };
}
