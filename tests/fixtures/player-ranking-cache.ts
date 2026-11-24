import type {
  PlayerRankingCriteria,
  PlayerRankingResponse,
} from "@/backend/services/player-ranking.types";
import { League, Position } from "@/backend/models/enums";

export const rankingVersion = {
  id: "00000000-0000-4000-8000-000000000801",
  strategyCode: "INDIVIDUAL_PERFORMANCE",
  version: "1.0.0",
};

export const otherRankingVersion = {
  ...rankingVersion,
  id: "00000000-0000-4000-8000-000000000802",
  version: "2.0.0",
};

export const rankingCriteria: PlayerRankingCriteria = { page: 1, limit: 20 };

export const filteredRankingCriteria: PlayerRankingCriteria = {
  league: League.PREMIER_LEAGUE,
  team: "Example",
  position: Position.FORWARD,
  page: 2,
  limit: 10,
};

export const rankingResponse: PlayerRankingResponse = {
  strategyCode: rankingVersion.strategyCode,
  strategyVersion: rankingVersion.version,
  players: [
    {
      rank: 1,
      player: {
        id: "00000000-0000-4000-8000-000000000803",
        name: "Alpha Player",
        team: "Example FC",
        league: League.PREMIER_LEAGUE,
        position: Position.FORWARD,
      },
      finalScore: 0.9,
      quoteValue: 90,
      unit: "CREDIT_PER_TOKEN",
      calculatedAt: new Date("2026-11-23T12:00:00.000Z"),
    },
  ],
  pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
};

export const emptyRankingResponse: PlayerRankingResponse = {
  ...rankingResponse,
  players: [],
  pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
};

export const oneHundredOneCriteria: PlayerRankingCriteria[] = Array.from(
  { length: 101 },
  (_, index) => ({ page: index + 1, limit: 1 }),
);
