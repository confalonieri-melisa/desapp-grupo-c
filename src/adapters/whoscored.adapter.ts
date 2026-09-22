import {
  SCRAPED_PLAYER_STATISTICS,
  type MinimalPlayerStatistics,
  type PlayerDataSource,
  type ScrapedPlayer,
  type ScrapedPlayerStatistic,
} from "./player-data-source";
import {
  whoScoredPlayerRecordSchema,
  whoScoredStatisticSchema,
  type WhoScoredPlayerRecord,
} from "@/schemas/whoscored.schema";

export const WHOSCORED_SOURCE = "WHOSCORED";

export type WhoScoredFetcher = () => Promise<WhoScoredPlayerRecord[]>;

/**
 * Initial WhoScored boundary adapter. The scraper is injected so the adapter
 * can be tested without network access and the scheduler can reuse the same
 * ingestion flow later.
 */
export class WhoScoredAdapter implements PlayerDataSource {
  readonly source = WHOSCORED_SOURCE;

  constructor(private readonly fetcher: WhoScoredFetcher) {}

  async fetchPlayers(): Promise<ScrapedPlayer[]> {
    const playerRecords = await this.fetcher();
    return playerRecords.map((playerRecord) =>
      normalizeWhoScoredPlayer(playerRecord),
    );
  }
}

function normalizeWhoScoredPlayer(
  playerRecord: WhoScoredPlayerRecord,
): ScrapedPlayer {
  const validatedPlayer = whoScoredPlayerRecordSchema.parse(playerRecord);

  return {
    externalId: validatedPlayer.externalId,
    name: validatedPlayer.player.trim(),
    team: validatedPlayer.team.trim().replace(/,+$/, "").trim(),
    league: validatedPlayer.league,
    position: validatedPlayer.position,
    statistics: normalizeStatistics(validatedPlayer),
  };
}

function normalizeStatistics(
  source: Record<string, unknown>,
): MinimalPlayerStatistics {
  const normalized: MinimalPlayerStatistics = {};

  for (const metric of SCRAPED_PLAYER_STATISTICS) {
    const value = source[metric];
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const parsedValue = whoScoredStatisticSchema.safeParse(value);
    if (!parsedValue.success) {
      throw new TypeError(`Invalid WhoScored statistic: ${metric}`);
    }

    normalized[metric as ScrapedPlayerStatistic] = parsedValue.data;
  }

  return normalized;
}
