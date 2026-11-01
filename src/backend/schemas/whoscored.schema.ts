import { z } from "zod";
import { League, Position } from "@/backend/models/enums";
import { PLAYER_STATISTIC_KEYS } from "@/backend/models/player-statistics";

const rawStatistic = z.union([z.string(), z.number()]);

/** Exact row written by scripts/whoscored_scraper.py. */
export const whoScoredPlayerRecordSchema = z
  .object({
    externalId: z.string().trim().min(1),
    player: z.string().trim().min(1),
    team: z.string().trim().min(1),
    league: z.enum(League),
    position: z.enum(Position),
    ...(Object.fromEntries(PLAYER_STATISTIC_KEYS.map((metric) => [metric, rawStatistic])) as Record<
      string,
      z.ZodTypeAny
    >),
  })
  .strict();

export const whoScoredStatisticSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? removeParenthesizedText(value.replace(",", ".")).trim() : value,
  z.coerce.number().nonnegative().refine(Number.isFinite, "Statistic must be finite"),
);

function removeParenthesizedText(value: string): string {
  const parts: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const openIndex = value.indexOf("(", cursor);
    if (openIndex === -1) {
      parts.push(value.slice(cursor));
      break;
    }

    const closeIndex = value.indexOf(")", openIndex + 1);
    if (closeIndex === -1) {
      parts.push(value.slice(cursor));
      break;
    }

    parts.push(value.slice(cursor, openIndex));
    cursor = closeIndex + 1;
  }

  return parts.join("");
}

export type WhoScoredPlayerRecord = z.infer<typeof whoScoredPlayerRecordSchema>;

export const whoScoredPayloadSchema = z.array(whoScoredPlayerRecordSchema);

export type WhoScoredPayload = z.infer<typeof whoScoredPayloadSchema>;
