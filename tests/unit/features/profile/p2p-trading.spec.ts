import { expect, it } from "vitest";
import { offer, investor, seller } from "./fixtures/p2p-ui";
import { offerTotal, canAccept, sellerLabel } from "@/frontend/features/profile/utils/p2p-trading";
it("uses the fixed price and seller identity", () => {
  expect(offerTotal(offer)).toBe(24.7);
  expect(sellerLabel({ ...offer, sellerName: "María" })).toBe("María");
  expect(sellerLabel(offer)).toBe("Vendedor");
  expect(canAccept(offer, seller.id, 100, true)).toBe(false);
  expect(canAccept(offer, investor.id, 25, true)).toBe(true);
});
it("requires current funds", () => {
  expect(canAccept(offer, investor.id, null, true)).toBe(false);
  expect(canAccept(offer, investor.id, 24, true)).toBe(false);
  expect(canAccept(offer, investor.id, 100, false)).toBe(false);
});

import { validatePublish } from "@/frontend/features/profile/utils/p2p-trading";
it.each([
  ["0", "1"],
  ["1.5", "1"],
  ["2147483648", "1"],
  ["1", "0"],
  ["1", "1.001"],
  ["1", "100000000"],
  ["101", "99999999.99"],
  ["oops", "2"],
])("rejects invalid publication %s %s", (q, p) => {
  expect(validatePublish(q, p, 2147483647).error).toBeTruthy();
});
it("accepts exact money boundary and checks current holding", () => {
  expect(validatePublish("100", "99999999.99", 100).error).toBeNull();
  expect(validatePublish("2", "1", 1).error).toBeTruthy();
  expect(validatePublish("1", "1", null).error).toBeTruthy();
});
