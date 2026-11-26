import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/backend/errors/http.error";
import { League, Position } from "@/backend/models/enums";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  findRankedPlayers: vi.fn(),
  findActiveStrategyVersion: vi.fn(),
  getRankingPublicationRevision: vi.fn(),
}));

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/backend/repositories/player-ranking.repository", () => ({
  PlayerRankingRepository: class {
    findRankedPlayers = mocks.findRankedPlayers;
  },
}));
vi.mock("@/backend/repositories/valuation.repository", () => ({
  ValuationRepository: class {
    findActiveStrategyVersion = mocks.findActiveStrategyVersion;
  },
}));
vi.mock("@/backend/repositories/batch-job.repository", () => ({
  BatchJobRepository: class {
    getRankingPublicationRevision = mocks.getRankingPublicationRevision;
  },
}));

import { GET } from "@/app/api/players/ranking/route";

let revision = 0;
const firstRow = {
  playerId: "first",
  name: "Alpha",
  team: "Example FC",
  league: League.PREMIER_LEAGUE,
  position: Position.FORWARD,
  finalScore: 0.9,
  quoteValue: 90,
  unit: "CREDIT_PER_TOKEN",
  calculatedAt: new Date("2026-11-23T12:00:00Z"),
};
const secondRow = {
  ...firstRow,
  playerId: "second",
  name: "Beta",
  team: "Other FC",
  league: League.BUNDESLIGA,
  position: Position.DEFENDER,
  finalScore: 0.8,
  quoteValue: 80,
};

function request(query = "", authenticated = true): Promise<Response> {
  return GET(
    new Request(`http://localhost/api/players/ranking${query}`, {
      headers: authenticated
        ? { authorization: "Bearer token", "x-correlation-id": "ranking-test" }
        : {},
    }),
  );
}

describe("player ranking route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revision += 1;
    mocks.requireAuth.mockReturnValue({ sub: "user-1", role: "INVESTOR" });
    mocks.findActiveStrategyVersion.mockResolvedValue({
      id: "version-1",
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      version: "1.0.0",
    });
    mocks.getRankingPublicationRevision.mockImplementation(async () => revision);
    mocks.findRankedPlayers.mockImplementation(async (_version, criteria) => ({
      rows: [
        criteria.page > 1 ||
        criteria.team === "Other" ||
        criteria.league === League.BUNDESLIGA ||
        criteria.position === Position.DEFENDER
          ? secondRow
          : firstRow,
      ],
      total: 2,
      page: criteria.page,
      limit: criteria.limit,
    }));
  });

  it("requires authentication even when a matching entry is warm", async () => {
    expect((await request()).status).toBe(200);
    mocks.requireAuth.mockImplementationOnce(() => {
      throw new UnauthorizedError();
    });
    expect((await request("", false)).status).toBe(401);
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(1);
  });

  it("validates before cache access and keeps the public response and correlation ID", async () => {
    const miss = await request();
    const hit = await request("?page=1&limit=20");
    expect(miss.status).toBe(200);
    expect(hit.status).toBe(200);
    expect(miss.headers.get("x-correlation-id")).toBe("ranking-test");
    expect(hit.headers.get("x-correlation-id")).toBe("ranking-test");
    expect(await hit.json()).toEqual(await miss.json());
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(1);
    for (const query of ["?page=0", "?limit=101", "?unknown=1"]) {
      expect((await request(query)).status).toBe(400);
    }
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(1);
    const response = await request();
    expect(Object.keys(await response.json()).sort()).toEqual([
      "pagination",
      "players",
      "strategyCode",
      "strategyVersion",
    ]);
  });

  it("preserves 409 when the active version disappears despite a warm entry", async () => {
    expect((await request()).status).toBe(200);
    mocks.findActiveStrategyVersion.mockResolvedValue(null);
    expect((await request()).status).toBe(409);
  });

  it("keeps filters and pages separate with global ranks and totals", async () => {
    const first = await (await request("?team=%20Example%20&limit=1")).json();
    const otherTeam = await (await request("?team=Other&limit=1")).json();
    const pageTwo = await (await request("?team=Example&limit=1&page=2")).json();
    const league = await (await request("?league=BUNDESLIGA&limit=1")).json();
    const position = await (await request("?position=DEFENDER&limit=1")).json();
    expect(first.players[0]).toMatchObject({ rank: 1, player: { id: "first" } });
    expect(otherTeam.players[0].player.id).toBe("second");
    expect(pageTwo.players[0]).toMatchObject({ rank: 2, player: { id: "second" } });
    expect(league.players[0].player.id).toBe("second");
    expect(position.players[0].player.id).toBe("second");
    expect(pageTwo.pagination).toEqual({ total: 2, page: 2, limit: 1, totalPages: 2 });
    expect(await (await request("?team=Example&limit=1")).json()).toEqual(first);
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(5);
    mocks.findActiveStrategyVersion.mockResolvedValue({
      id: "version-2",
      strategyCode: "TEAM_CONTEXT",
      version: "2.0.0",
    });
    const changedVersion = await (await request("?team=Example&limit=1")).json();
    expect(changedVersion.strategyVersion).toBe("2.0.0");
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(6);
  });

  it("invalidates every warmed query after completed and partial publications", async () => {
    await request();
    await request("?page=2&limit=1");
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(2);
    mocks.findRankedPlayers.mockImplementation(async (_version, criteria) => ({
      rows: [{ ...firstRow, quoteValue: revision * 10 }],
      total: 1,
      page: criteria.page,
      limit: criteria.limit,
    }));
    revision += 1; // confirmed COMPLETED turn with succeeded_count > 0
    expect((await (await request()).json()).players[0].quoteValue).toBe(revision * 10);
    expect((await (await request("?page=2&limit=1")).json()).players[0].quoteValue).toBe(
      revision * 10,
    );
    revision += 1; // confirmed PARTIAL turn with succeeded_count > 0
    expect((await (await request()).json()).players[0].quoteValue).toBe(revision * 10);
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(5);
    await request(); // failed turn: persisted revision does not change
    expect(mocks.findRankedPlayers).toHaveBeenCalledTimes(5);
  });
});
