import { FootballDataAdapter, type CompetitionStandingResult } from "@/backend/adapters/football-data.adapter";
import { BadGatewayError, TooManyRequestsError } from "@/backend/errors/http.error";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import {
  SUPPORTED_LEAGUES,
} from "@/backend/models/competition-context";

export class CompetitionContextService {
  constructor(
    private readonly adapter: FootballDataAdapter,
    private readonly repository: CompetitionContextRepository,
  ) {}

  async update(season: number, requestedBy?: string) {
    const update = await this.repository.createUpdate(season, requestedBy);
    const results: CompetitionStandingResult[] = [];
    const errors: Array<{ league: string; message: string; status?: number }> = [];

    for (const league of SUPPORTED_LEAGUES) {
      try {
        results.push(await this.adapter.getStandings(league, season));
      } catch (error) {
        errors.push({
          league,
          message: error instanceof Error ? error.message : "Provider error",
          status: typeof error === "object" && error && "status" in error
            ? Number(error.status)
            : undefined,
        });
      }
    }

    if (results.length) await this.repository.persistResults(update.id, results);
    const status = errors.length === 0 ? "VALID" : results.length ? "PARTIAL" : "FAILED";
    const finished = await this.repository.finishUpdate(update.id, status, errors.length ? errors : undefined);
    if (status !== "VALID") {
      if (errors.some((error) => error.status === 429)) {
        throw new TooManyRequestsError();
      }
      const details = errors
        .map((error) => `${error.league}: ${error.message}`)
        .join("; ");
      throw new BadGatewayError(
        `Competition context synchronization failed: ${details}`,
      );
    }
    return {
      updateId: finished?.id ?? update.id,
      season,
      status: "VALID" as const,
      publishedAt: finished?.publishedAt?.toISOString(),
      competitions: results.map((result) => result.league),
    };
  }
}
