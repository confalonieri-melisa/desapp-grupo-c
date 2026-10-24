import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError, UnauthorizedError } from "@/backend/errors/http.error";

const requireAuth = vi.hoisted(() => vi.fn());
const getQuotes = vi.hoisted(() => vi.fn());

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth }));
vi.mock("@/backend/controllers/player-quotes.controller", () => ({
  PlayerQuotesController: class { getQuotes = getQuotes; },
}));
vi.mock("@/backend/repositories/player.repository", () => ({ PlayerRepository: class {} }));
vi.mock("@/backend/repositories/valuation.repository", () => ({ ValuationRepository: class {} }));
vi.mock("@/backend/services/player-quotes.service", () => ({ PlayerQuotesService: class {} }));

import { GET } from "@/app/api/players/[id]/quotes/route";

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const validId = "00000000-0000-4000-8000-000000000001";

describe("player quotes route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockReturnValue({ sub: "user-1", role: "INVESTOR" });
    getQuotes.mockResolvedValue({ items: [] });
  });

  it("requires authentication", async () => {
    requireAuth.mockImplementation(() => { throw new UnauthorizedError(); });

    const response = await GET(new Request("http://localhost/api/players/quotes"), context(validId));

    expect(response.status).toBe(401);
    expect(getQuotes).not.toHaveBeenCalled();
  });

  it("returns the history and delegates the player id", async () => {
    const response = await GET(
      new Request(`http://localhost/api/players/${validId}/quotes`, {
        headers: { authorization: "Bearer token" },
      }),
      context(validId),
    );

    expect(response.status).toBe(200);
    expect(getQuotes).toHaveBeenCalledWith(validId, undefined);
  });

  it("passes a valid date to the controller", async () => {
    const response = await GET(
      new Request(`http://localhost/api/players/${validId}/quotes?date=2026-10-20`, {
        headers: { authorization: "Bearer token" },
      }),
      context(validId),
    );

    expect(response.status).toBe(200);
    expect(getQuotes).toHaveBeenCalledWith(validId, "2026-10-20");
  });

  it.each([
    ["not-a-uuid", "Invalid player id"],
    [validId, "Invalid date"],
  ])("rejects invalid input with message %s", async (id, message) => {
    const url = message === "Invalid date"
      ? `http://localhost/api/players/${validId}/quotes?date=2026-02-30`
      : `http://localhost/api/players/${id}/quotes`;
    const response = await GET(
      new Request(url, { headers: { authorization: "Bearer token" } }),
      context(id),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(getQuotes).not.toHaveBeenCalled();
  });

  it("propagates not found errors from the controller", async () => {
    getQuotes.mockRejectedValueOnce(new NotFoundError("Player not found"));

    const response = await GET(
      new Request(`http://localhost/api/players/${validId}/quotes`, {
        headers: { authorization: "Bearer token" },
      }),
      context(validId),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Player not found" });
  });

  it("allows the controller to return quote-not-available", async () => {
    getQuotes.mockRejectedValueOnce(new NotFoundError("Quote not available"));

    const response = await GET(
      new Request(`http://localhost/api/players/${validId}/quotes?date=2020-01-01`, {
        headers: { authorization: "Bearer token" },
      }),
      context(validId),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Quote not available",
    });
  });
});
