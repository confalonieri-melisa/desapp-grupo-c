import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnauthorizedError } from "@/backend/errors/http.error";

const requireAuth = vi.hoisted(() => vi.fn());
const completeOffer = vi.hoisted(() => vi.fn());
const publishOffer = vi.hoisted(() => vi.fn());
const findAvailableOffers = vi.hoisted(() => vi.fn());
const cancelOffer = vi.hoisted(() => vi.fn());

vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth }));
vi.mock("@/backend/controllers/p2p-offer.controller", () => ({
  P2POfferController: class {
    completeOffer = completeOffer;
    publishOffer = publishOffer;
    findAvailableOffers = findAvailableOffers;
    cancelOffer = cancelOffer;
  },
}));
vi.mock("@/backend/observability/request-observation", () => ({
  requestObservation: {
    observe: (_request: Request, _operation: string, action: (request: Request) => unknown) =>
      action(_request),
  },
}));

import { POST } from "@/app/api/p2p/offers/[id]/accept/route";
import { GET as listOffers, POST as publishOfferRoute } from "@/app/api/p2p/offers/route";
import { DELETE as cancelOfferRoute } from "@/app/api/p2p/offers/[id]/route";

const offerId = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ id: offerId }) };

describe("P2P accept route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockReturnValue({ sub: "buyer-id", role: "INVESTOR" });
    completeOffer.mockResolvedValue({ operation: { id: "operation-id" } });
    publishOffer.mockResolvedValue({ id: "offer-id" });
    findAvailableOffers.mockResolvedValue([]);
    cancelOffer.mockResolvedValue(undefined);
  });

  it("passes idempotency and correlation headers to the controller", async () => {
    const response = await POST(
      new Request(`http://localhost/api/p2p/offers/${offerId}/accept`, {
        headers: {
          "Idempotency-Key": "trade-key",
          "X-Correlation-ID": "correlation-id",
        },
      }),
      context,
    );

    expect(response.status).toBe(201);
    expect(completeOffer).toHaveBeenCalledWith(
      { sub: "buyer-id", role: "INVESTOR" },
      offerId,
      "trade-key",
      "correlation-id",
    );
  });

  it("validates and delegates offer publication", async () => {
    const playerId = "00000000-0000-4000-8000-000000000002";
    const response = await publishOfferRoute(
      new Request("http://localhost/api/p2p/offers", {
        method: "POST",
        body: JSON.stringify({ playerId, quantity: 2, unitPrice: 10 }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(publishOffer).toHaveBeenCalledWith(
      { sub: "buyer-id", role: "INVESTOR" },
      { playerId, quantity: 2, unitPrice: 10 },
    );
  });

  it("lists and cancels offers through their controllers", async () => {
    const response = await listOffers(
      new Request("http://localhost/api/p2p/offers?playerId=00000000-0000-4000-8000-000000000002"),
    );
    expect(response.status).toBe(200);
    expect(findAvailableOffers).toHaveBeenCalledWith({ playerId: "00000000-0000-4000-8000-000000000002" });

    const cancelled = await cancelOfferRoute(
      new Request("http://localhost/api/p2p/offers/00000000-0000-4000-8000-000000000001", { method: "DELETE" }),
      context,
    );
    expect(cancelled.status).toBe(204);
    expect(cancelOffer).toHaveBeenCalledWith(
      { sub: "buyer-id", role: "INVESTOR" },
      offerId,
    );
  });

  it("maps authentication errors", async () => {
    requireAuth.mockImplementation(() => { throw new UnauthorizedError(); });

    const response = await POST(
      new Request(`http://localhost/api/p2p/offers/${offerId}/accept`, {
        headers: { "Idempotency-Key": "trade-key" },
      }),
      context,
    );

    expect(response.status).toBe(401);
  });
});
