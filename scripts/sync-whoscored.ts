import { env } from "@/config/env";
import { WhoScoredAdapter } from "@/adapters/whoscored.adapter";
import { WhoScoredScraper } from "@/adapters/whoscored.scraper";
import { closeDatabase } from "@/db";
import { PlayerService } from "@/services/player.service";
import { PlayerRepository } from "@/repositories/player.repository";

async function main(): Promise<void> {
  const scraper = new WhoScoredScraper({
    pythonPath: env.WHOSCORED_PYTHON_PATH,
    scriptPath: env.WHOSCORED_SCRIPT_PATH,
    url: env.WHOSCORED_URL,
    maxPages: env.WHOSCORED_MAX_PAGES,
    headless: env.WHOSCORED_HEADLESS,
  });
  const adapter = new WhoScoredAdapter(() => scraper.fetchPlayers());
  const playerService = new PlayerService(
    adapter,
    new PlayerRepository(),
  );
  const players = await playerService.syncFromSource();

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
