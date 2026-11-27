import { beforeEach, expect, it, vi } from "vitest";
import { createHookHarness, deferred, flushPromises } from "./hook-harness";
import { offer, playerId } from "./fixtures/p2p-ui";
const m = vi.hoisted(() => ({
  state: vi.fn(),
  ref: vi.fn(),
  effect: vi.fn(),
  get: vi.fn(),
  accept: vi.fn(),
  publish: vi.fn(),
  cancel: vi.fn(),
}));
vi.mock("react", () => ({ useState: m.state, useRef: m.ref, useEffect: m.effect }));
vi.mock("@/frontend/services/client/p2p-offers.service", () => ({
  getP2POffers: m.get,
  acceptP2POffer: m.accept,
  publishP2POffer: m.publish,
  cancelP2POffer: m.cancel,
}));
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

import { investor, receipt } from "./fixtures/p2p-ui";
it("confirms once, keeps receipt when refresh fails", async () => {
  m.get.mockResolvedValueOnce([offer]).mockRejectedValue(new Error("Offline"));
  m.accept.mockResolvedValue(receipt);
  const h = setup();
  await flushPromises();
  h.render().openAccept(offer, investor.id, 100, true);
  expect(m.accept).not.toHaveBeenCalled();
  h.render().confirm();
  h.render().confirm();
  await flushPromises();
  expect(m.accept).toHaveBeenCalledOnce();
  expect(h.render().result.receipt).toEqual(receipt);
  h.cleanup();
});

it.each([401, 403, 404, 409, 422, 500])(
  "handles acceptance error %i without inventing receipt",
  async (status) => {
    m.get.mockResolvedValue([offer]);
    m.accept.mockRejectedValue(Object.assign(new Error("Failure"), { status }));
    const h = setup();
    await flushPromises();
    h.render().openAccept(offer, investor.id, 100, true);
    await h.render().confirm();
    expect(h.render().result.receipt).toBeUndefined();
    if (status === 401) expect(h.unauthorized).toHaveBeenCalledOnce();
    else expect(h.render().result.status).toBe(status < 500 ? "rejected" : "uncertain");
    h.cleanup();
  },
);
it("retains key for manual retry and uses a new one for new intent", async () => {
  m.get.mockResolvedValue([offer]);
  m.accept.mockRejectedValue(new Error("Offline"));
  const h = setup();
  await flushPromises();
  h.render().openAccept(offer, investor.id, 100, true);
  const key = (h.render().confirmation as { key: string }).key;
  await h.render().confirm();
  h.render().retryAccept();
  expect((h.render().confirmation as { key: string }).key).toBe(key);
  h.render().cancelConfirmation();
  await h.render().refresh();
  h.render().openAccept(offer, investor.id, 100, true);
  expect((h.render().confirmation as { key: string }).key).not.toBe(key);
  h.cleanup();
});

it("keeps published offer locally when refresh fails and reconciles successful GET", async () => {
  m.get.mockResolvedValueOnce([]).mockRejectedValue(new Error("Offline"));
  m.publish.mockResolvedValue(offer);
  const h = setup();
  await flushPromises();
  h.render().setDraft("2", "12.35");
  h.render().openPublish(5);
  h.render().cancelConfirmation();
  expect(h.render().draft.quantity).toBe("2");
  expect(m.publish).not.toHaveBeenCalled();
  h.render().openPublish(5);
  await h.render().confirm();
  expect(h.render().offers).toEqual([offer]);
  expect(h.render().result.published).toEqual(offer);
  m.get.mockResolvedValue([]);
  await h.render().refresh();
  expect(h.render().offers).toEqual([]);
  h.cleanup();
});

it("cancels once and removes confirmed offer despite failed refresh", async () => {
  m.get.mockResolvedValueOnce([offer]).mockRejectedValue(new Error("Offline"));
  m.cancel.mockResolvedValue(undefined);
  const h = setup();
  await flushPromises();
  h.render().openCancel(offer, offer.sellerId);
  h.render().cancelConfirmation();
  expect(m.cancel).not.toHaveBeenCalled();
  h.render().openCancel(offer, offer.sellerId);
  const pending = h.render().confirm();
  h.render().confirm();
  await pending;
  expect(m.cancel).toHaveBeenCalledOnce();
  expect(h.render().offers).toEqual([]);
  expect(h.render().result.cancelled).toBe(offer.id);
  h.cleanup();
});
