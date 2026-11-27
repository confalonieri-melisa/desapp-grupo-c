import { beforeEach, expect, it, vi } from "vitest";
import { createHookHarness, deferred, flushPromises } from "./hook-harness";
const m = vi.hoisted(() => ({ state: vi.fn(), ref: vi.fn(), effect: vi.fn(), get: vi.fn() }));
vi.mock("react", () => ({ useState: m.state, useRef: m.ref, useEffect: m.effect }));
vi.mock("@/frontend/services/client/pool-availability.service", () => ({
  getPoolAvailability: m.get,
}));
import { usePoolAvailability } from "@/frontend/features/profile/hooks/usePoolAvailability";
beforeEach(() => vi.resetAllMocks());
function setup() {
  const h = createHookHarness();
  m.state.mockImplementation(h.useState);
  m.ref.mockImplementation(h.useRef);
  m.effect.mockImplementation(h.useEffect);
  const unauthorized = vi.fn();
  const render = (token = "jwt", player = "p", purchase?: string) =>
    h.render(() => usePoolAvailability(token, player, unauthorized, purchase));
  render();
  h.commit();
  return { ...h, render, unauthorized };
}
it("loads positive stock then refreshes to zero on confirmed purchase", async () => {
  m.get
    .mockResolvedValueOnce({ playerId: "p", availableQuantity: 2 })
    .mockResolvedValue({ playerId: "p", availableQuantity: 0 });
  const h = setup();
  expect(h.render().availableQuantity).toBeNull();
  await flushPromises();
  expect(h.render().availableQuantity).toBe(2);
  h.render("jwt", "p", "receipt");
  h.commit();
  expect(h.render("jwt", "p", "receipt").availableQuantity).toBeNull();
  await flushPromises();
  expect(h.render("jwt", "p", "receipt").availableQuantity).toBe(0);
  h.cleanup();
});
it("ignores late stock across identities", async () => {
  const d = deferred<{ playerId: string; availableQuantity: number }>();
  m.get
    .mockReturnValueOnce(d.promise)
    .mockResolvedValue({ playerId: "other", availableQuantity: 0 });
  const h = setup();
  h.render("new", "other");
  h.commit();
  await flushPromises();
  d.resolve({ playerId: "p", availableQuantity: 50 });
  await flushPromises();
  expect(h.render("new", "other").availableQuantity).toBe(0);
  h.cleanup();
});
it("never turns errors into zero and handles 401", async () => {
  m.get.mockRejectedValue(Object.assign(new Error("Expired"), { status: 401 }));
  const h = setup();
  await flushPromises();
  expect(h.render().status).toBe("error");
  expect(h.render().availableQuantity).toBeNull();
  expect(h.unauthorized).toHaveBeenCalledOnce();
  m.get.mockResolvedValue({ playerId: "p", availableQuantity: 3 });
  await h.render().refresh();
  expect(h.render().availableQuantity).toBe(3);
  h.cleanup();
});
