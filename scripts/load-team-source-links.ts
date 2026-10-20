import { readFile } from "node:fs/promises";
import { z } from "zod";
import { closeDatabase } from "@/backend/db";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { League } from "@/backend/models/enums";

const teamSourceLinkSchema = z.object({
  league: z.nativeEnum(League),
  season: z.number().int().min(2000).max(2100),
  whoscoredTeamName: z.string().min(1),
  footballDataTeamExternalId: z.string().min(1),
  footballDataTeamName: z.string().min(1),
});

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error(
      "Usage: npm run db:load-team-links -- <confirmed-links.json>",
    );
  }

  let rawData: unknown;
  try {
    rawData = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read confirmed team links file: ${
        error instanceof Error ? error.message : "invalid JSON"
      }`,
    );
  }

  const parsed = z.array(teamSourceLinkSchema).safeParse(rawData);
  if (!parsed.success) {
    throw new Error(
      `Invalid confirmed team links file: ${
        parsed.error.issues[0]?.message ?? "invalid structure"
      }`,
    );
  }

  await new CompetitionContextRepository().saveTeamLinks(parsed.data);
  console.log(`Loaded ${parsed.data.length} confirmed team links`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
