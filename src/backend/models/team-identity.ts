import { League } from "./enums";

export interface TeamIdentityCandidate {
  externalId: string;
  name: string;
}

export interface TeamSourceLink {
  league: League;
  season: number;
  whoscoredTeamName: string;
  footballDataTeamExternalId: string;
  footballDataTeamName: string;
}

export function comparableTeamName(name: string): string {
  return name.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const providerTeamAliases: Partial<Record<League, Record<string, string>>> = {
  [League.BUNDESLIGA]: {
    augsburg: "FC Augsburg",
    bayern: "FC Bayern München",
    elversberg: "SV 07 Elversberg",
    freiburg: "SC Freiburg",
    leverkusen: "Bayer 04 Leverkusen",
    mainz: "1. FSV Mainz 05",
    rbl: "RB Leipzig",
    schalke: "FC Schalke 04",
    stuttgart: "VfB Stuttgart",
    werderbremen: "SV Werder Bremen",
  },
  [League.LA_LIGA]: {
    atletico: "Club Atlético de Madrid",
    barcelona: "FC Barcelona",
    realbetis: "Real Betis Balompié",
    realmadrid: "Real Madrid CF",
  },
  [League.LIGUE_1]: {
    lens: "Racing Club de Lens",
    lyon: "Olympique Lyonnais",
    parisfc: "Paris FC",
    strasbourg: "RC Strasbourg Alsace",
    toulouse: "Toulouse FC",
  },
  [League.PREMIER_LEAGUE]: {
    brighton: "Brighton & Hove Albion FC",
    chelsea: "Chelsea FC",
    everton: "Everton FC",
    hull: "Hull City AFC",
    mancity: "Manchester City FC",
  },
  [League.SERIE_A]: {
    como: "Como 1907",
    frosinone: "Frosinone Calcio",
    inter: "FC Internazionale Milano",
    lazio: "SS Lazio",
    roma: "AS Roma",
  },
};

export function resolveTeamLink(input: {
  league: League;
  season: number;
  whoscoredTeamName: string;
  candidates: TeamIdentityCandidate[];
}): TeamSourceLink | null {
  const normalizedName = comparableTeamName(input.whoscoredTeamName);
  const alias = providerTeamAliases[input.league]?.[normalizedName];
  const acceptedNames = [input.whoscoredTeamName, alias]
    .filter((name): name is string => Boolean(name))
    .map(comparableTeamName);
  const matches = input.candidates.filter((candidate) =>
    acceptedNames.includes(comparableTeamName(candidate.name)),
  );

  if (matches.length !== 1) return null;

  return {
    league: input.league,
    season: input.season,
    whoscoredTeamName: input.whoscoredTeamName,
    footballDataTeamExternalId: matches[0].externalId,
    footballDataTeamName: matches[0].name,
  };
}
