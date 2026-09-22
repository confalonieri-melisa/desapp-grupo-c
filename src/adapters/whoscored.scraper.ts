import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  whoScoredPayloadSchema,
  type WhoScoredPlayerRecord,
} from "@/schemas/whoscored.schema";

const execFileAsync = promisify(execFile);

export interface WhoScoredScraperOptions {
  pythonPath?: string;
  scriptPath?: string;
  url?: string;
  maxPages?: number;
  limit?: number;
  headless?: boolean;
  commandRunner?: PythonCommandRunner;
}

export type PythonCommandRunner = (
  pythonPath: string,
  args: string[],
) => Promise<{ stdout: string; stderr: string }>;

/** Runs the browser scraper and validates its JSON process contract. */
export class WhoScoredScraper {
  private readonly pythonPath: string;
  private readonly scriptPath: string;
  private readonly commandRunner: PythonCommandRunner;

  constructor(private readonly options: WhoScoredScraperOptions = {}) {
    this.pythonPath = options.pythonPath ?? process.env.PYTHON ?? "python";
    this.scriptPath = options.scriptPath ?? "scripts/whoscored_scraper.py";
    this.commandRunner = options.commandRunner ?? runPythonCommand;
  }

  async fetchPlayers(): Promise<WhoScoredPlayerRecord[]> {
    const outputDirectory = await mkdtemp(join(tmpdir(), "whoscored-"));
    const outputPath = join(outputDirectory, "players.json");
    const args = [
      this.scriptPath,
      "--url", this.options.url ?? process.env.WHOSCORED_URL ?? "https://www.whoscored.com/Statistics",
      "--output", outputPath,
      "--format", "json",
    ];
    if (this.options.maxPages) args.push("--max-pages", String(this.options.maxPages));
    if (this.options.limit) args.push("--limit", String(this.options.limit));
    if (this.options.headless === false) args.push("--headed");

    try {
      const { stdout, stderr } = await this.commandRunner(this.pythonPath, args);
      let payload: unknown;
      try {
        payload = JSON.parse(stdout);
      } catch {
        throw new Error(`WhoScored scraper returned invalid JSON${stderr ? `: ${stderr.trim()}` : ""}`);
      }
      const parsedPayload = whoScoredPayloadSchema.safeParse(payload);
      if (!parsedPayload.success) {
        throw new Error(`Invalid WhoScored JSON contract: ${parsedPayload.error.issues[0]?.message ?? "unknown error"}`);
      }
      return parsedPayload.data;
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  }
}

async function runPythonCommand(
  pythonPath: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync(pythonPath, args, { maxBuffer: 25 * 1024 * 1024, windowsHide: true });
  const outputIndex = args.indexOf("--output");
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  if (!outputPath) throw new Error("WhoScored scraper output path was not configured");
  return { ...result, stdout: await readFile(outputPath, "utf8") };
}
