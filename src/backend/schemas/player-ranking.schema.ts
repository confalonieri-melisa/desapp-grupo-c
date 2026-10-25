import { z } from "zod";
import { playerFiltersSchema } from "@/backend/schemas/player.schema";

export const playerRankingQuerySchema = playerFiltersSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export type PlayerRankingQuery = z.infer<typeof playerRankingQuerySchema>;
