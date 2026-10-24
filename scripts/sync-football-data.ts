import { z } from "zod";
import { FootballDataAdapter } from "@/backend/adapters/football-data.adapter";
import { closeDatabase } from "@/backend/db";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { CompetitionContextService } from "@/backend/services/competition-context.service";

const seasonSchema = z.coerce.number().int().min(2000).max(2100);

function readSeason(): number {
  const [argument, value] = process.argv.slice(2);
  const season = argument === "--season" ? value : argument;
  const parsed = seasonSchema.safeParse(season);

  if (!parsed.success) {
    throw new Error("Usage: npm run db:sync-football-data -- --season <year>");
  }

  return parsed.data;
}

async function main(): Promise<void> {
  const season = readSeason();
  const service = new CompetitionContextService(
    new FootballDataAdapter(),
    new CompetitionContextRepository(),
  );
  const result = await service.update(season);

  console.log(
    `Synchronized football-data.org competition context for ${result.season}: `
      + `${result.competitions.length} competitions (${result.status})`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
