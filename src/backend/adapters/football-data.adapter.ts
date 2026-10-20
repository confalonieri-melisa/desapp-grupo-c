import { env as defaultEnv, type Env } from "@/backend/config/env";
import { League } from "@/backend/models/enums";
import {
  type TeamCompetitionStanding,
} from "@/backend/models/competition-context";
import { normalizeStandings } from "@/backend/schemas/football-data.schema";

const providerCodes: Record<League, string> = {
  [League.PREMIER_LEAGUE]: "PL",
  [League.BUNDESLIGA]: "BL1",
  [League.LA_LIGA]: "PD",
  [League.SERIE_A]: "SA",
  [League.LIGUE_1]: "FL1",
};

export class FootballDataError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly transient = false,
  ) {
    super(message);
  }
}

export interface HttpClient {
  fetch(input: string, init?: RequestInit): Promise<Response>;
}

export interface CompetitionStandingResult {
  league: League;
  season: number;
  sourceData: unknown;
  standings: TeamCompetitionStanding[];
}

export class FootballDataAdapter {
  constructor(
    private readonly configuration: Env = defaultEnv,
    private readonly httpClient: HttpClient = { fetch: globalThis.fetch },
  ) {}

  async getStandings(
    league: League,
    season: number,
  ): Promise<CompetitionStandingResult> {
    const competitionCode = providerCodes[league];
    const endpointPath = this.buildEndpointPath(competitionCode, season);
    const response = await this.fetchWithRetries(endpointPath);
    const body = await this.readBody(response);
    let standings: TeamCompetitionStanding[];
    try {
      standings = normalizeStandings(body, league, season);
    } catch {
      throw new FootballDataError("football-data.org payload is invalid");
    }

    return {
      league,
      season,
      sourceData: body,
      standings,
    };
  }

  private buildEndpointPath(competitionCode: string, season: number): string {
    return `/v4/competitions/${competitionCode}/standings?season=${season}`;
  }

  private async fetchWithRetries(endpointPath: string): Promise<Response> {
    const url = `${this.configuration.FOOTBALL_DATA_BASE_URL.replace(/\/$/, "")}${endpointPath}`;

    for (let attempt = 0; attempt <= this.configuration.FOOTBALL_DATA_MAX_RETRIES; attempt += 1) {
      try {
        const response = await this.fetchOnce(url);
        if (response.ok) return response;

        const transient = response.status === 429 || response.status >= 500;
        if (!transient || attempt === this.configuration.FOOTBALL_DATA_MAX_RETRIES) {
          throw new FootballDataError(
            `football-data.org returned HTTP ${response.status}`,
            response.status,
            transient,
          );
        }
      } catch (error) {
        if (error instanceof FootballDataError && !error.transient) throw error;
        if (attempt === this.configuration.FOOTBALL_DATA_MAX_RETRIES) {
          if (error instanceof FootballDataError) throw error;
          throw new FootballDataError("football-data.org request failed", undefined, true);
        }
      }
    }

    throw new FootballDataError("football-data.org request failed");
  }

  private async fetchOnce(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.configuration.FOOTBALL_DATA_TIMEOUT_MS,
    );

    try {
      return await this.httpClient.fetch(url, {
        method: "GET",
        headers: { "X-Auth-Token": this.configuration.FOOTBALL_DATA_TOKEN },
        signal: controller.signal,
      });
    } catch {
      throw new FootballDataError(
        "football-data.org request failed",
        undefined,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new FootballDataError("football-data.org returned invalid JSON");
    }
  }
}
