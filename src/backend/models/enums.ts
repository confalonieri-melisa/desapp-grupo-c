/** Official football leagues supported by the marketplace. */
export enum League {
  PREMIER_LEAGUE = "PREMIER_LEAGUE",
  BUNDESLIGA = "BUNDESLIGA",
  LA_LIGA = "LA_LIGA",
  SERIE_A = "SERIE_A",
  LIGUE_1 = "LIGUE_1",
}

export const SUPPORTED_LEAGUES = [
  League.PREMIER_LEAGUE,
  League.BUNDESLIGA,
  League.LA_LIGA,
  League.SERIE_A,
  League.LIGUE_1,
] as const;

export const CompetitionContextStatus = {
  RUNNING: "RUNNING",
  VALID: "VALID",
  PARTIAL: "PARTIAL",
  FAILED: "FAILED",
} as const;

export type CompetitionContextStatus =
  typeof CompetitionContextStatus[keyof typeof CompetitionContextStatus];

const officialLeagues = new Set<string>(Object.values(League));

export function isOfficialLeague(value: unknown): value is League {
  return typeof value === "string" && officialLeagues.has(value);
}

/** Supported player positions. */
export enum Position {
  UNKNOWN = "UNKNOWN",
  GOALKEEPER = "GOALKEEPER",
  DEFENDER = "DEFENDER",
  MIDFIELDER = "MIDFIELDER",
  FORWARD = "FORWARD",
}

const positions = new Set<string>(Object.values(Position));

export function isPosition(value: unknown): value is Position {
  return typeof value === "string" && positions.has(value);
}

/** Roles that can act in the marketplace. */
export enum UserRole {
  INVESTOR = "INVESTOR",
  SUPERUSER = "SUPERUSER",
}

const userRoles = new Set<string>(Object.values(UserRole));

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && userRoles.has(value);
}
