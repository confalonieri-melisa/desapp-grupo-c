import { League } from "./enums";

export type CompetitionContextStatus = "RUNNING" | "VALID" | "PARTIAL" | "FAILED";

export interface TeamCompetitionStanding {
  league: League;
  season: number;
  teamExternalId: string;
  teamName: string;
  position: number;
  playedGames: number;
  points: number;
  goalDifference: number;
}

export interface TeamIdentityCandidate {
  externalId: string;
  name: string;
}

export interface ConfirmedTeamLink {
  league: League;
  season: number;
  whoscoredTeamName: string;
  footballDataTeamExternalId: string;
  footballDataTeamName: string;
}

function comparableTeamName(name: string): string {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveConfirmedTeamLink(input: {
  league: League;
  season: number;
  whoscoredTeamName: string;
  candidates: TeamIdentityCandidate[];
  validatedAliases?: Record<string, string>;
}): ConfirmedTeamLink | null {
  const key = comparableTeamName(input.whoscoredTeamName);
  const alias = input.validatedAliases?.[key];
  const matches = input.candidates.filter((candidate) =>
    alias
      ? candidate.externalId === alias
      : comparableTeamName(candidate.name) === key);

  if (matches.length !== 1) return null;

  return {
    league: input.league,
    season: input.season,
    whoscoredTeamName: input.whoscoredTeamName,
    footballDataTeamExternalId: matches[0].externalId,
    footballDataTeamName: matches[0].name,
  };
}

export const SUPPORTED_LEAGUES = [
  League.PREMIER_LEAGUE,
  League.BUNDESLIGA,
  League.LA_LIGA,
  League.SERIE_A,
  League.LIGUE_1,
] as const;
