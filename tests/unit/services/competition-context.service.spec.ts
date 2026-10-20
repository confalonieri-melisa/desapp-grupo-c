import { describe, expect, it, vi } from "vitest";
import { FootballDataAdapter } from "@/backend/adapters/football-data.adapter";
import { CompetitionContextRepository } from "@/backend/repositories/competition-context.repository";
import { CompetitionContextService } from "@/backend/services/competition-context.service";
import { League } from "@/backend/models/enums";

const standing = (league: League) => ({
  league,
  season: 2026,
  teamExternalId: `${league}-1`,
  teamName: "Example",
  position: 1,
  playedGames: 1,
  points: 3,
  goalDifference: 2,
});

function adapterMock() {
  return {
    getStandings: vi.fn((league: League) =>
      Promise.resolve({
        league,
        season: 2026,
        sourceData: { standings: [] },
        standings: [standing(league)],
      })),
  } as unknown as FootballDataAdapter;
}

describe("CompetitionContextService", () => {
  it("fetches and persists all supported leagues", async () => {
    const adapter = adapterMock();
    const repository = {
      createUpdate: vi.fn().mockResolvedValue({ id: "update-1" }),
      saveResults: vi.fn().mockResolvedValue(undefined),
      listWhoScoredTeams: vi.fn().mockResolvedValue([]),
      saveTeamLinks: vi.fn().mockResolvedValue(undefined),
      finishUpdate: vi.fn().mockResolvedValue({
        id: "update-1",
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    } as unknown as CompetitionContextRepository;

    const result = await new CompetitionContextService(adapter, repository)
      .update(2026, "superuser-1");

    expect(adapter.getStandings).toHaveBeenCalledTimes(5);
    expect(repository.createUpdate).toHaveBeenCalledWith(2026, "superuser-1");
    expect(repository.saveResults).toHaveBeenCalledWith(
      "update-1",
      expect.arrayContaining([
        expect.objectContaining({ league: League.PREMIER_LEAGUE }),
        expect.objectContaining({ league: League.BUNDESLIGA }),
        expect.objectContaining({ league: League.LA_LIGA }),
        expect.objectContaining({ league: League.SERIE_A }),
        expect.objectContaining({ league: League.LIGUE_1 }),
      ]),
    );
    expect(repository.finishUpdate).toHaveBeenCalledWith("update-1", "VALID", undefined);
    expect(result).toMatchObject({
      updateId: "update-1",
      season: 2026,
      status: "VALID",
    });
  });

  it("marks an incomplete synchronization and exposes provider rate limits", async () => {
    const adapter = adapterMock();
    vi.mocked(adapter.getStandings)
      .mockRejectedValueOnce(Object.assign(new Error("rate limited"), { status: 429 }))
      .mockImplementation((league: League) =>
        Promise.resolve({
          league,
          season: 2026,
          sourceData: {},
          standings: [standing(league)],
        }));
    const repository = {
      createUpdate: vi.fn().mockResolvedValue({ id: "update-2" }),
      saveResults: vi.fn().mockResolvedValue(undefined),
      listWhoScoredTeams: vi.fn().mockResolvedValue([]),
      saveTeamLinks: vi.fn().mockResolvedValue(undefined),
      finishUpdate: vi.fn().mockResolvedValue({ id: "update-2" }),
    } as unknown as CompetitionContextRepository;

    await expect(new CompetitionContextService(adapter, repository).update(2026))
      .rejects.toMatchObject({ status: 429 });

    expect(repository.finishUpdate).toHaveBeenCalledWith(
      "update-2",
      "PARTIAL",
      [expect.objectContaining({ status: 429 })],
    );
  });
});
