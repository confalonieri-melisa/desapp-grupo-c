import { z } from "zod";
import { League } from "@/backend/models/enums";
import type { TeamCompetitionStanding } from "@/backend/models/competition-context";

export const competitionContextRequestSchema = z.object({
  season: z.coerce.number().int().min(2000).max(2100),
});

const standingRowSchema = z.object({
  position: z.number().int().nonnegative(),
  playedGames: z.number().int().nonnegative(),
  points: z.number().int().nonnegative(),
  goalDifference: z.number().int(),
  team: z.object({
    id: z.union([z.number().int(), z.string().min(1)]),
    name: z.string().min(1),
  }),
});

export const footballDataPayloadSchema = z.object({
  competition: z.object({ name: z.string().optional() }).optional(),
  season: z.object({ startDate: z.string().optional() }).optional(),
  standings: z.array(z.object({ table: z.array(standingRowSchema).min(1) })).length(1),
});

export function normalizeStandings(
  payload: unknown,
  league: League,
  season: number,
): TeamCompetitionStanding[] {
  const parsed = footballDataPayloadSchema.parse(payload);
  return parsed.standings[0].table.map((row) => ({
    league,
    season,
    teamExternalId: String(row.team.id),
    teamName: row.team.name,
    position: row.position,
    playedGames: row.playedGames,
    points: row.points,
    goalDifference: row.goalDifference,
  }));
}
