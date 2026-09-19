import { z } from "zod";
import { League, Position } from "@/models/enums";
import { SCRAPED_PLAYER_STATISTICS } from "@/adapters/player-data-source";

const rawStatistic = z.union([z.string(), z.number()]);

/** Exact row written by scripts/whoscored_scraper.py. */
export const whoScoredPlayerRecordSchema = z.object({
  externalId: z.string().trim().min(1),
  player: z.string().trim().min(1),
  team: z.string().trim().min(1),
  league: z.enum(League),
  position: z.enum(Position),
  ...Object.fromEntries(SCRAPED_PLAYER_STATISTICS.map((metric) => [metric, rawStatistic])) as Record<string, z.ZodTypeAny>,
}).strict();

export const whoScoredStatisticSchema = z.preprocess(
  (value) => typeof value === "string"
    ? value.replace(",", ".").replace(/\([^)]*\)/g, "").trim()
    : value,
  z.coerce
  .number()
  .nonnegative()
  .refine(Number.isFinite, "Statistic must be finite"),
);

export type WhoScoredPlayerRecord = z.infer<typeof whoScoredPlayerRecordSchema>;

export const whoScoredPayloadSchema = z.array(whoScoredPlayerRecordSchema);

export type WhoScoredPayload = z.infer<typeof whoScoredPayloadSchema>;
