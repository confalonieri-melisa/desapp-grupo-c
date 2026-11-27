import { beforeEach, expect, it, vi } from "vitest";
import { UnauthorizedError, NotFoundError } from "@/backend/errors/http.error";
const m = vi.hoisted(() => ({ auth: vi.fn(), get: vi.fn() }));
vi.mock("@/backend/middlewares/auth.middleware", () => ({ requireAuth: m.auth }));
vi.mock("@/backend/controllers/pool-availability.controller", () => ({
  PoolAvailabilityController: class {
    getAvailability = m.get;
  },
}));
vi.mock("@/backend/observability/request-observation", () => ({
  requestObservation: { observe: (_r: Request, _p: string, fn: () => unknown) => fn() },
}));
import { GET } from "@/app/api/players/[id]/pool-availability/route";
const id = "33333333-3333-4333-8333-333333333333";
const call = (path = id, query = "") =>
  GET(new Request(`http://localhost/api/players/${path}/pool-availability${query}`), {
    params: Promise.resolve({ id: path }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockReturnValue({ sub: "investor" });
  m.get.mockResolvedValue({ playerId: id, availableQuantity: 5 });
});
it("requires JWT", async () => {
  m.auth.mockImplementation(() => {
    throw new UnauthorizedError();
  });
  expect((await call()).status).toBe(401);
  expect(m.get).not.toHaveBeenCalled();
});
it("validates UUID and refuses identity parameters", async () => {
  expect((await call("invalid")).status).toBe(400);
  expect((await call(id, "?poolId=other")).status).toBe(400);
  expect((await call(id, "?userId=other")).status).toBe(400);
  expect(m.get).not.toHaveBeenCalled();
});
it("returns minimal response and missing player error", async () => {
  expect(await (await call()).json()).toEqual({ playerId: id, availableQuantity: 5 });
  m.get.mockRejectedValue(new NotFoundError());
  expect((await call()).status).toBe(404);
});
