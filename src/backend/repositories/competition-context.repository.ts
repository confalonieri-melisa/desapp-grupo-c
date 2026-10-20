import { eq } from "drizzle-orm";
import type { CompetitionStandingResult } from "@/backend/adapters/football-data.adapter";
import { db as defaultDatabase, type Database } from "@/backend/db";
import {
  competitionContextSnapshots,
  competitionContextUpdates,
  teamCompetitionStandings,
  teamSourceLinks,
} from "@/backend/db/schema";
import type {
  CompetitionContextStatus,
  ConfirmedTeamLink,
} from "@/backend/models/competition-context";

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

  async persistResults(updateId: string, results: CompetitionStandingResult[]) {
    return this.database.transaction(async (tx) => {
      for (const result of results) {
        const snapshotRows = await tx.insert(competitionContextSnapshots).values({
          contextUpdateId: updateId,
          league: result.league,
          season: result.season,
          sourceData: result.sourceData,
        }).returning();
        const snapshot = snapshotRows[0];
        if (!snapshot) throw new Error("Snapshot could not be persisted");
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

  async saveConfirmedLinks(links: ConfirmedTeamLink[]): Promise<void> {
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

}
