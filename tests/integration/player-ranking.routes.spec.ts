import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, UnauthorizedError } from "@/backend/errors/http.error";

const requireAuth = vi.hoisted(() => vi.fn());
const getRanking = vi.hoisted(() => vi.fn());

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth }));
vi.mock("@/backend/controllers/player-ranking.controller", () => ({
  PlayerRankingController: class { getRanking = getRanking; },
}));
vi.mock("@/backend/services/player-ranking.service", () => ({
  PlayerRankingService: class {},
}));

import { GET } from "@/app/api/players/ranking/route";

describe("player ranking route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockReturnValue({ sub: "user-1", role: "INVESTOR" });
    getRanking.mockResolvedValue({
      strategyCode: "INDIVIDUAL_PERFORMANCE",
      strategyVersion: "1.0.0",
      players: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  });

  it("requires authentication", async () => {
    requireAuth.mockImplementation(() => { throw new UnauthorizedError(); });

    const response = await GET(new Request("http://localhost/api/players/ranking"));

    expect(response.status).toBe(401);
    expect(getRanking).not.toHaveBeenCalled();
  });

  it("authenticates and delegates query parameters", async () => {
    const response = await GET(new Request(
      "http://localhost/api/players/ranking?league=PREMIER_LEAGUE&page=2&limit=10",
      { headers: { authorization: "Bearer token" } },
    ));

    expect(response.status).toBe(200);
    expect(getRanking).toHaveBeenCalledWith({
      league: "PREMIER_LEAGUE",
      page: "2",
      limit: "10",
    });
  });

  it("propagates the missing active strategy conflict", async () => {
    getRanking.mockRejectedValueOnce(new ConflictError("No active valuation strategy"));

    const response = await GET(new Request(
      "http://localhost/api/players/ranking",
      { headers: { authorization: "Bearer token" } },
    ));

    expect(response.status).toBe(409);
  });
});
