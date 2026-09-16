/** Official football leagues supported by the marketplace. */
export enum League {
  PREMIER_LEAGUE = "PREMIER_LEAGUE",
  BUNDESLIGA = "BUNDESLIGA",
  LA_LIGA = "LA_LIGA",
  SERIE_A = "SERIE_A",
  LIGUE_1 = "LIGUE_1",
}

const officialLeagues = new Set<string>(Object.values(League));

export function isOfficialLeague(value: unknown): value is League {
  return typeof value === "string" && officialLeagues.has(value);
}

/** Supported player positions. */
export enum Position {
  GOALKEEPER = "GOALKEEPER",
  DEFENDER = "DEFENDER",
  MIDFIELDER = "MIDFIELDER",
  FORWARD = "FORWARD",
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
