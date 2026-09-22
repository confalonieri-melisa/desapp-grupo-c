import { describe, expect, it, vi } from "vitest";
import { League, Position } from "@/models/enums";
import { WhoScoredScraper } from "@/adapters/whoscored.scraper";

const player = {
  externalId: "300713",
  player: "Kylian Mbappé",
  team: "Real Madrid",
  league: League.LA_LIGA,
  position: Position.FORWARD,
  appearances: 6,
  minutesPlayed: 540,
  goals: 7,
  assists: 2,
  shotsPerGame: 6.7,
  yellowCards: 0,
  redCards: 0,
  rating: 8.43,
  tacklesPerGame: 0.5,
  interceptionsPerGame: 0.2,
  foulsPerGame: 0.4,
};

const payload = [player];

describe("WhoScoredScraper", () => {
  it("runs the browser process and validates its JSON output", async () => {
    const commandRunner = vi.fn().mockResolvedValue({
      stdout: JSON.stringify(payload),
      stderr: "",
    });
    const scraper = new WhoScoredScraper({
      pythonPath: "python-test",
      scriptPath: "test-scraper.py",
      maxPages: 2,
      commandRunner,
    });

    await expect(scraper.fetchPlayers()).resolves.toEqual([player]);
    const [, args] = commandRunner.mock.calls[0] ?? [];
    expect(args).toEqual(expect.arrayContaining([
      "test-scraper.py",
      "--url",
      "https://www.whoscored.com/Statistics",
      "--format",
      "json",
      "--max-pages",
      "2",
    ]));
    expect(args).toContain("--output");
  });

  it("rejects malformed process output", async () => {
    const scraper = new WhoScoredScraper({
      commandRunner: vi.fn().mockResolvedValue({
        stdout: "not-json",
        stderr: "selenium failed",
      }),
    });

    await expect(scraper.fetchPlayers()).rejects.toThrow("invalid JSON");
  });

  it("rejects an unsupported JSON shape", async () => {
    const scraper = new WhoScoredScraper({
      commandRunner: vi.fn().mockResolvedValue({ stdout: JSON.stringify({ players: [player] }), stderr: "" }),
    });

    await expect(scraper.fetchPlayers()).rejects.toThrow("Invalid WhoScored JSON contract");
  });

  it("rejects an unsupported JSON shape", async () => {
    const scraper = new WhoScoredScraper({
      commandRunner: vi.fn().mockResolvedValue({ stdout: JSON.stringify({ players: [player] }), stderr: "" }),
    });

    await expect(scraper.fetchPlayers()).rejects.toThrow("Invalid WhoScored JSON contract");
  });
});
