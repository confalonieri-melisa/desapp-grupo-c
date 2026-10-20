import { League } from "./enums";

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
