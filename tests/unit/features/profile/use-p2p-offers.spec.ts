import { beforeEach, expect, it, vi } from "vitest";
import { createHookHarness, deferred, flushPromises } from "./hook-harness";
import { offer, playerId } from "./fixtures/p2p-ui";
const m = vi.hoisted(() => ({ state: vi.fn(), ref: vi.fn(), effect: vi.fn(), get: vi.fn() }));
vi.mock("react", () => ({ useState: m.state, useRef: m.ref, useEffect: m.effect }));
vi.mock("@/frontend/services/client/p2p-offers.service", () => ({ getP2POffers: m.get }));
import { useP2POffers } from "@/frontend/features/profile/hooks/useP2POffers";
beforeEach(() => vi.clearAllMocks());
function setup() {
  const h = createHookHarness();
  m.state.mockImplementation(h.useState);
  m.ref.mockImplementation(h.useRef);
  m.effect.mockImplementation(h.useEffect);
  const unauthorized = vi.fn();
  const render = (token = "jwt", id = playerId) =>
    h.render(() => useP2POffers(token, id, unauthorized));
  render();
  h.commit();
  return { ...h, render, unauthorized };
}
it("loads once and explicitly refreshes without polling", async () => {
  m.get.mockResolvedValue([offer]);
  const h = setup();
  await flushPromises();
  expect(h.render().status).toBe("ready");
  expect(m.get).toHaveBeenCalledTimes(1);
  await h.render().refresh();
  expect(m.get).toHaveBeenCalledTimes(2);
  h.cleanup();
});
it("clears on 401 and supports empty and error retry", async () => {
  m.get
    .mockRejectedValueOnce(Object.assign(new Error("Expired"), { status: 401 }))
    .mockResolvedValue([]);
  const h = setup();
  await flushPromises();
  expect(h.unauthorized).toHaveBeenCalledOnce();
  expect(h.render().offers).toEqual([]);
  await h.render().refresh();
  expect(h.render().status).toBe("empty");
  h.cleanup();
});
it("ignores late results after player change", async () => {
  const late = deferred<(typeof offer)[]>();
  m.get.mockReturnValueOnce(late.promise).mockResolvedValue([]);
  const h = setup();
  h.render("jwt", "other");
  h.commit();
  await flushPromises();
  late.resolve([offer]);
  await flushPromises();
  expect(h.render("jwt", "other").offers).toEqual([]);
  h.cleanup();
});
