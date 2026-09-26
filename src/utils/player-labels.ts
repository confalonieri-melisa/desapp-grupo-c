import { League } from "@/models/enums";

export const formatEnumLabel = (value: string) => value
  .toLowerCase()
  .replaceAll("_", " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const leagueLabels: Record<League, string> = {
  [League.PREMIER_LEAGUE]: "Premier League",
  [League.BUNDESLIGA]: "Bundesliga",
  [League.LA_LIGA]: "La Liga",
  [League.SERIE_A]: "Serie A",
  [League.LIGUE_1]: "Ligue 1",
};
