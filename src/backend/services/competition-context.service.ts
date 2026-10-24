import {
  FootballDataAdapter,
  type CompetitionStandingResult,
} from "@/backend/adapters/football-data.adapter";
import { BadGatewayError, TooManyRequestsError } from "@/backend/errors/http.error";
import {
  CompetitionContextStatus,
  SUPPORTED_LEAGUES,
} from "@/backend/models/enums";
import { resolveTeamLink } from "@/backend/models/team-identity";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";

interface SynchronizationError {
  league: string;
  message: string;
  status?: number;
}

interface FetchedStandings {
  results: CompetitionStandingResult[];
  errors: SynchronizationError[];
}

export class CompetitionContextService {
  constructor(
    private readonly adapter: FootballDataAdapter,
    private readonly repository: CompetitionContextRepository,
  ) {}

  async update(season: number, requestedBy?: string) {
    const update = await this.repository.createUpdate(season, requestedBy);
    const fetched = await this.fetchLeagueStandings(season);
    const status = this.statusFor(fetched);

    await this.saveStandings(update.id, fetched.results);
    if (status === CompetitionContextStatus.VALID) {
      await this.saveTeamAssociations(season, fetched.results);
    }

    const finished = await this.repository.finishUpdate(
      update.id,
      status,
      fetched.errors.length ? fetched.errors : undefined,
    );
    if (status !== CompetitionContextStatus.VALID) {
      this.throwProviderError(fetched.errors);
    }

    return {
      updateId: finished?.id ?? update.id,
      season,
      status,
      publishedAt: finished?.publishedAt?.toISOString(),
      competitions: fetched.results.map((result) => result.league),
    };
  }

  private async fetchLeagueStandings(season: number): Promise<FetchedStandings> {
    const results: CompetitionStandingResult[] = [];
    const errors: SynchronizationError[] = [];

    for (const league of SUPPORTED_LEAGUES) {
      try {
        results.push(await this.adapter.getStandings(league, season));
      } catch (error) {
        errors.push({
          league,
          message: error instanceof Error ? error.message : "Provider error",
          status: this.getErrorStatus(error),
        });
      }
    }

    return { results, errors };
  }

  private statusFor(
    fetched: FetchedStandings,
  ): CompetitionContextStatus {
    if (!fetched.errors.length) return CompetitionContextStatus.VALID;
    return fetched.results.length
      ? CompetitionContextStatus.PARTIAL
      : CompetitionContextStatus.FAILED;
  }

  private async saveStandings(
    updateId: string,
    results: CompetitionStandingResult[],
  ): Promise<void> {
    if (results.length) {
      await this.repository.saveResults(updateId, results);
    }
  }

  private async saveTeamAssociations(
    season: number,
    results: CompetitionStandingResult[],
  ): Promise<void> {
    const standingsByLeague = new Map(
      results.map((result) => [result.league, result.standings]),
    );
    const teams = await this.repository.listWhoScoredTeams();
    const links = teams.flatMap((team) => {
      const standings = standingsByLeague.get(team.league);
      if (!standings) return [];

      const link = resolveTeamLink({
        league: team.league,
        season,
        whoscoredTeamName: team.teamName,
        candidates: standings.map(({ teamExternalId, teamName }) => ({
          externalId: teamExternalId,
          name: teamName,
        })),
      });
      return link ? [link] : [];
    });

    await this.repository.saveTeamLinks(links);
  }

  private throwProviderError(errors: SynchronizationError[]): never {
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

  private getErrorStatus(error: unknown): number | undefined {
    if (typeof error !== "object" || error === null || !("status" in error)) {
      return undefined;
    }
    return Number(error.status);
  }
}
