import { z } from "zod";
import {
  TEAM_METRICS,
  VALUATION_STRATEGIES,
} from "@/backend/models/valuation";
import { PLAYER_STATISTIC_KEYS } from "@/backend/models/player-statistics";

export const valuationStrategyCodeSchema = z.enum(VALUATION_STRATEGIES);
export const valuationConfigSchema = z.object({
  individualMetrics: z.array(z.object({
    metric: z.enum(PLAYER_STATISTIC_KEYS),
    polarity: z.enum(["POSITIVE", "NEGATIVE"]),
    weight: z.number().nonnegative(),
    minimum: z.number(),
    maximum: z.number(),
    positionWeights: z.record(z.string(), z.number().nonnegative()).optional(),
  }).refine((metric) => metric.maximum >= metric.minimum, {
    message: "Metric maximum must be greater than or equal to minimum",
  })).min(1),
  teamMetrics: z.array(z.object({
    metric: z.enum(TEAM_METRICS),
    polarity: z.enum(["POSITIVE", "NEGATIVE"]),
    weight: z.number().nonnegative(),
    minimum: z.number(),
    maximum: z.number(),
  }).refine((metric) => metric.maximum >= metric.minimum, {
    message: "Metric maximum must be greater than or equal to minimum",
  })).min(1),
  individualShare: z.number().min(0).max(1),
  teamShare: z.number().min(0).max(1),
  missingContextPolicy: z.literal("INDIVIDUAL_ONLY"),
  quoteFormula: z.literal("LINEAR_1_99"),
  precision: z.literal(2),
}).refine((config) => config.individualShare + config.teamShare === 1, {
  message: "Shares must sum to 1",
});

export const valuationActivationSchema = z.object({
  strategyCode: valuationStrategyCodeSchema,
});

export const emptyRecalculationRequestSchema = z.object({}).strict();

