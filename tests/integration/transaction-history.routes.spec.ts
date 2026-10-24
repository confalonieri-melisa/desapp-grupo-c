import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForbiddenError, UnauthorizedError } from "@/backend/errors/http.error";

const requireAuth = vi.hoisted(() => vi.fn());
const getHistory = vi.hoisted(() => vi.fn());

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth }));
vi.mock("@/backend/controllers/market-operation.controller", () => ({
  MarketOperationController: class {
    getHistory = getHistory;
  },
}));

import { GET } from "@/app/api/users/[id]/transactions/route";

const userId = "00000000-0000-4000-8000-000000000001";
const auth = { sub: userId, email: "investor@example.com", role: "INVESTOR" };

function routeProps(id = userId) {
  return { params: Promise.resolve({ id }) };
}

describe("transaction history route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockReturnValue(auth);
    getHistory.mockResolvedValue({ items: [], limit: 50, offset: 0, hasMore: false });
  });

  it("returns the authenticated user's paginated history", async () => {
    const response = await GET(
      new Request(`http://localhost/api/users/${userId}/transactions?limit=10&offset=20`, {
        headers: { authorization: "Bearer token" },
      }),
      routeProps(),
    );

    expect(response.status).toBe(200);
    expect(getHistory).toHaveBeenCalledWith(auth, userId, { limit: 10, offset: 20 });
    await expect(response.json()).resolves.toEqual({
      items: [],
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  it("returns 401 without valid authentication", async () => {
    requireAuth.mockImplementation(() => {
      throw new UnauthorizedError();
    });

    const response = await GET(
      new Request(`http://localhost/api/users/${userId}/transactions`),
      routeProps(),
    );

    expect(response.status).toBe(401);
    expect(getHistory).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid route or query parameters", async () => {
    const invalidId = await GET(
      new Request("http://localhost/api/users/not-a-uuid/transactions"),
      routeProps("not-a-uuid"),
    );
    const invalidQuery = await GET(
      new Request(`http://localhost/api/users/${userId}/transactions?limit=101`),
      routeProps(),
    );

    expect(invalidId.status).toBe(400);
    expect(invalidQuery.status).toBe(400);
    expect(getHistory).not.toHaveBeenCalled();
  });

  it("returns 403 when the service rejects access to another user", async () => {
    getHistory.mockRejectedValue(new ForbiddenError());

    const response = await GET(
      new Request(`http://localhost/api/users/${userId}/transactions`, {
        headers: { authorization: "Bearer token" },
      }),
      routeProps(),
    );

    expect(response.status).toBe(403);
  });
});
