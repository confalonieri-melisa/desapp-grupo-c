import { expect, it } from "vitest";
import { offer, investor, seller } from "./fixtures/p2p-ui";
import { offerTotal, canAccept, sellerLabel } from "@/frontend/features/profile/utils/p2p-trading";
it("uses the fixed price and seller identity", () => {
  expect(offerTotal(offer)).toBe(24.7);
  expect(sellerLabel(offer)).toContain(seller.id.slice(0, 8));
  expect(canAccept(offer, seller.id, 100, true)).toBe(false);
  expect(canAccept(offer, investor.id, 25, true)).toBe(true);
});
it("requires current funds", () => {
  expect(canAccept(offer, investor.id, null, true)).toBe(false);
  expect(canAccept(offer, investor.id, 24, true)).toBe(false);
  expect(canAccept(offer, investor.id, 100, false)).toBe(false);
});
