import { describe, expect, it } from "vitest";
import { toPagination } from "@/backend/utils/pagination";

describe("toPagination", () => {
  it("calculates total pages for a non-empty result", () => {
    expect(toPagination(21, 2, 20)).toEqual({
      total: 21,
      page: 2,
      limit: 20,
      totalPages: 2,
    });
  });

  it("returns zero pages for an empty result", () => {
    expect(toPagination(0, 1, 20).totalPages).toBe(0);
  });
});
