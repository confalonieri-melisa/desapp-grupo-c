import { z } from "zod";
import { League, Position } from "@/backend/models/enums";
import { PLAYER_STATISTIC_KEYS } from "@/backend/models/player-statistics";

const playerStatisticsSchema = z.object(
  Object.fromEntries(
    PLAYER_STATISTIC_KEYS.map((metric) => [metric, z.number().nonnegative().optional()]),
  ) as Record<(typeof PLAYER_STATISTIC_KEYS)[number], z.ZodOptional<z.ZodNumber>>,
).partial();

/** HTTP input for creating or importing a player. */
export const playerSchema = z.object({
  name: z.string().trim().min(1),
  team: z.string().trim().min(1),
  league: z.enum(League),
  position: z.enum(Position),
  statistics: playerStatisticsSchema.default({}),
});

export type PlayerDto = z.infer<typeof playerSchema>;

export const playerCatalogQuerySchema = z.object({
  league: z.enum(League).optional(),
  team: z
    .string()
    .trim()
    .min(1)
    .optional(),
  position: z.enum(Position).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PlayerCatalogQuery = z.infer<typeof playerCatalogQuerySchema>;

export const playerParamsSchema = z.object({
  id: z.uuid(),
});
