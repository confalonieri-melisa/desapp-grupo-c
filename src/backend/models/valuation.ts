import { Position } from "@/backend/models/enums";
import {
  PLAYER_STATISTIC_KEYS,
  type PlayerStatisticKey,
} from "@/backend/models/player-statistics";
import type { DataSource } from "@/backend/models/data-sources";

export const VALUATION_STRATEGY_CODES = {
  INDIVIDUAL_PERFORMANCE: "INDIVIDUAL_PERFORMANCE",
  INDIVIDUAL_PLUS_TEAM_CONTEXT: "INDIVIDUAL_PLUS_TEAM_CONTEXT",
} as const;
export type ValuationStrategyCode =
  (typeof VALUATION_STRATEGY_CODES)[keyof typeof VALUATION_STRATEGY_CODES];
export const VALUATION_STRATEGIES = Object.values(VALUATION_STRATEGY_CODES) as [
  ValuationStrategyCode,
  ValuationStrategyCode,
];

export { PLAYER_STATISTIC_KEYS };
export type IndividualMetric = PlayerStatisticKey;

export const TEAM_METRICS = [
  "position",
  "points",
  "playedGames",
  "goalDifference",
] as const;
export type TeamMetric = (typeof TEAM_METRICS)[number];

export interface MetricConfig {
  metric: IndividualMetric | TeamMetric;
  polarity: "POSITIVE" | "NEGATIVE";
  weight: number;
  minimum: number;
  maximum: number;
  positionWeights?: Partial<Record<Position, number>>;
}

export type IndividualMetricConfig = MetricConfig & { metric: IndividualMetric };
export type TeamMetricConfig = MetricConfig & { metric: TeamMetric };

export interface ValuationConfig {
  individualMetrics: IndividualMetricConfig[];
  teamMetrics: TeamMetricConfig[];
  individualShare: number;
  teamShare: number;
  missingContextPolicy: "INDIVIDUAL_ONLY";
  quoteFormula: "LINEAR_1_99";
  precision: 2;
}

export interface MetricContribution {
  metric: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  contribution: number;
  source: DataSource;
  range: { minimum: number; maximum: number };
}

export interface QuoteExplanation {
  strategyCode: ValuationStrategyCode;
  version: string;
  individual: MetricContribution[];
  team: MetricContribution[];
  missingMetrics: string[];
  effectivePolicy: string;
  degraded: boolean;
  contextUpdateId?: string;
}

export interface TeamContext {
  contextUpdateId: string;
  position: number;
  points: number;
  playedGames: number;
  goalDifference: number;
}

export interface ValuationResult {
  individualScore: number;
  teamScore: number | null;
  finalScore: number;
  quoteValue: number;
  explanation: QuoteExplanation;
}

export interface PlayerQuoteSnapshot {
  id: string;
  playerId: string;
  individualScore: number;
  teamScore: number | null;
  finalScore: number;
  quoteValue: number;
  unit: string;
  calculatedAt: Date;
  strategyCode: ValuationStrategyCode;
  strategyVersion: string;
  explanation: QuoteExplanation;
}
export class ValuationDomainError extends Error {}
export class InsufficientValuationDataError extends ValuationDomainError {}
