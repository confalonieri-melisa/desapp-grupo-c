import { env } from "@/backend/config/env";
import { WhoScoredAdapter } from "@/backend/adapters/whoscored.adapter";
import { WhoScoredScraper } from "@/backend/adapters/whoscored.scraper";
import { closeDatabase } from "@/backend/db";
import { PlayerSyncService } from "@/backend/services/player-sync.service";
import { PlayerRepository } from "@/backend/repositories/player.repository";

async function main(): Promise<void> {
  const scraper = new WhoScoredScraper({
    pythonPath: env.WHOSCORED_PYTHON_PATH,
    scriptPath: env.WHOSCORED_SCRIPT_PATH,
    url: env.WHOSCORED_URL,
    maxPages: env.WHOSCORED_MAX_PAGES,
    limit: env.WHOSCORED_LIMIT,
    headless: env.WHOSCORED_HEADLESS,
  });
  const adapter = new WhoScoredAdapter(() => scraper.fetchPlayers());
  const playerSyncService = new PlayerSyncService(adapter, new PlayerRepository());
  const players = await playerSyncService.syncFromSource();

  console.log(`Synchronized ${players.length} players from WhoScored`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
