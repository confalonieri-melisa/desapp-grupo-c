import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, UnauthorizedError } from "@/errors/http.error";

const requireAuth = vi.hoisted(() => vi.fn());
const getPlayers = vi.hoisted(() => vi.fn());
const getById = vi.hoisted(() => vi.fn());

vi.mock("@/middlewares/auth.middleware", () => ({ requireAuth }));
vi.mock("@/controllers/player.controller", () => ({
  PlayerController: class {
    getPlayers = getPlayers;
    getById = getById;
  },
}));
vi.mock("@/repositories/player.repository", () => ({
  PlayerRepository: class {},
}));
vi.mock("@/services/player.service", () => ({
  PlayerService: class {},
}));

import { GET as getPlayersRoute } from "@/app/api/players/route";
import { GET as getPlayerRoute } from "@/app/api/players/[id]/route";

describe("player routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockImplementation((request: Request) => {
      if (!request.headers.get("authorization")) {
        throw new UnauthorizedError();
      }
    });
    getPlayers.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    getById.mockResolvedValue({ id: "player-id" });
  });

  it("rejects catalog requests without authentication", async () => {
    const response = await getPlayersRoute(
      new Request("http://localhost/api/players"),
    );

    expect(response.status).toBe(401);
    expect(getPlayers).not.toHaveBeenCalled();
  });

  it("authenticates and delegates the catalog query", async () => {
    const response = await getPlayersRoute(
      new Request("http://localhost/api/players?page=2&limit=10", {
        headers: { authorization: "Bearer token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(getPlayers).toHaveBeenCalledWith({ page: "2", limit: "10" });
  });

  it("authenticates and delegates the player detail request", async () => {
    const response = await getPlayerRoute(
      new Request("http://localhost/api/players/player-id", {
        headers: { authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ id: "player-id" }) },
    );

    expect(response.status).toBe(200);
    expect(getById).toHaveBeenCalledWith("player-id");
  });

  it("rejects player detail requests without authentication", async () => {
    const response = await getPlayerRoute(
      new Request("http://localhost/api/players/player-id"),
      { params: Promise.resolve({ id: "player-id" }) },
    );

    expect(response.status).toBe(401);
    expect(getById).not.toHaveBeenCalled();
  });

  it("returns not found when the controller cannot find the player", async () => {
    getById.mockRejectedValueOnce(new NotFoundError("Player not found"));

    const response = await getPlayerRoute(
      new Request("http://localhost/api/players/player-id", {
        headers: { authorization: "Bearer token" },
      }),
      { params: Promise.resolve({ id: "player-id" }) },
    );

    expect(response.status).toBe(404);
  });
});
