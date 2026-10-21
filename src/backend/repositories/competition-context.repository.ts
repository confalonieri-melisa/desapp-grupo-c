import { and, desc, eq, sql } from "drizzle-orm";
import type { CompetitionStandingResult } from "@/backend/adapters/football-data.adapter";
import { db as defaultDatabase, type Database } from "@/backend/db";
import {
  competitionContextSnapshots,
  competitionContextUpdates,
  teamCompetitionStandings,
  teamSourceLinks,
  players,
} from "@/backend/db/schema";
import type {
  CompetitionContextStatus,
} from "@/backend/models/enums";
import type { TeamSourceLink } from "@/backend/models/team-identity";
import { DATA_SOURCES } from "@/backend/models/data-sources";

export class CompetitionContextRepository {
  constructor(private readonly database: Database = defaultDatabase) {}

  async createUpdate(season: number, requestedBy?: string) {
    const rows = await this.database.insert(competitionContextUpdates).values({
      season,
      requestedBy,
      status: "RUNNING",
    }).returning();
    if (!rows[0]) throw new Error("Context update could not be created");
    return rows[0];
  }

  async saveResults(updateId: string, results: CompetitionStandingResult[]) {
    return this.database.transaction(async (tx) => {
      for (const result of results) {
        const snapshotRows = await tx.insert(competitionContextSnapshots).values({
          contextUpdateId: updateId,
          league: result.league,
          season: result.season,
          sourceData: result.sourceData,
        }).returning();
        const snapshot = snapshotRows[0];
        if (!snapshot) throw new Error("Snapshot could not be saved");
        if (result.standings.length) {
          await tx.insert(teamCompetitionStandings).values(result.standings.map((standing) => ({
            contextUpdateId: updateId,
            snapshotId: snapshot.id,
            ...standing,
          }))).onConflictDoNothing();
        }
      }
    });
  }

  async finishUpdate(id: string, status: CompetitionContextStatus, errorSummary?: unknown) {
    const publishedAt = status === "VALID" ? new Date() : null;
    const rows = await this.database.update(competitionContextUpdates)
      .set({ status, finishedAt: new Date(), publishedAt, errorSummary })
      .where(eq(competitionContextUpdates.id, id))
      .returning();
    return rows[0];
  }

  async saveTeamLinks(links: TeamSourceLink[]): Promise<void> {
    if (!links.length) return;

    await this.database.transaction(async (transaction) => {
      for (const link of links) {
        await transaction
          .insert(teamSourceLinks)
          .values(link)
          .onConflictDoUpdate({
            target: [
              teamSourceLinks.league,
              teamSourceLinks.season,
              teamSourceLinks.whoscoredTeamName,
            ],
            set: {
              footballDataTeamExternalId: link.footballDataTeamExternalId,
              footballDataTeamName: link.footballDataTeamName,
            },
          });
      }
    });
  }

  async listWhoScoredTeams(): Promise<Array<{ league: TeamSourceLink["league"]; teamName: string }>> {
    return this.database
      .selectDistinct({
        league: players.league,
        teamName: players.team,
      })
      .from(players)
      .where(eq(players.source, DATA_SOURCES.WHOSCORED))
      .orderBy(sql`${players.league}`, sql`${players.team}`);
  }

  async findTeamContext(league: TeamSourceLink["league"], season: number, teamName: string) {
    const rows = await this.database
      .select({
        updateId: competitionContextUpdates.id,
        teamExternalId: teamCompetitionStandings.teamExternalId,
        position: teamCompetitionStandings.position,
        points: teamCompetitionStandings.points,
        playedGames: teamCompetitionStandings.playedGames,
        goalDifference: teamCompetitionStandings.goalDifference,
      })
      .from(teamSourceLinks)
      .innerJoin(teamCompetitionStandings, and(
        eq(teamCompetitionStandings.league, teamSourceLinks.league),
        eq(teamCompetitionStandings.season, teamSourceLinks.season),
        eq(teamCompetitionStandings.teamExternalId, teamSourceLinks.footballDataTeamExternalId),
      ))
      .innerJoin(competitionContextUpdates, eq(competitionContextUpdates.id, teamCompetitionStandings.contextUpdateId))
      .where(and(
        eq(teamSourceLinks.league, league),
        eq(teamSourceLinks.season, season),
        eq(teamSourceLinks.whoscoredTeamName, teamName),
        eq(competitionContextUpdates.season, season),
        eq(competitionContextUpdates.status, "VALID"),
      ))
      .orderBy(desc(competitionContextUpdates.publishedAt))
      .limit(1);
    return rows[0] ?? null;
  }

}
