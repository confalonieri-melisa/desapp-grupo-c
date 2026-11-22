import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestError } from "@/backend/errors/http.error";

const requireAuth = vi.hoisted(() => vi.fn());
const buy = vi.hoisted(() => vi.fn());

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth }));
vi.mock("@/backend/controllers/market-operation.controller", () => ({
  MarketOperationController: class {
    buy = buy;
  },
}));
vi.mock("@/backend/services/market-operation.service", () => ({
  MarketOperationService: class {},
}));

import { POST } from "@/app/api/orders/buy/route";

const playerId = "00000000-0000-4000-8000-000000000001";

describe("POST /api/orders/buy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockReturnValue({ sub: "investor-id", role: "INVESTOR" });
    buy.mockResolvedValue({ operation: { type: "BUY" } });
  });

  it("forwards the authenticated request and idempotency key", async () => {
    const auth = { sub: "investor-id", role: "INVESTOR" };
    requireAuth.mockReturnValue(auth);
    const input = { playerId, quantity: 2 };

    const response = await POST(
      new Request("http://localhost/api/orders/buy", {
        method: "POST",
        body: JSON.stringify(input),
        headers: {
          authorization: "Bearer token",
          "Idempotency-Key": "buy-123",
          "x-correlation-id": "correlation-123",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(buy).toHaveBeenCalledWith(auth, input, "buy-123", "correlation-123");
  });

  it("maps a business conflict without changing the route contract", async () => {
    buy.mockRejectedValueOnce(new BadRequestError("invalid buy"));

    const response = await POST(
      new Request("http://localhost/api/orders/buy", {
        method: "POST",
        body: JSON.stringify({ playerId, quantity: 1 }),
        headers: { authorization: "Bearer token", "Idempotency-Key": "buy-456" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid buy" });
  });
});
