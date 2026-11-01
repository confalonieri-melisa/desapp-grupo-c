import { describe, expect, it } from "vitest";
import { whoScoredStatisticSchema } from "@/backend/schemas/whoscored.schema";

describe("WhoScored schema", () => {
  it("normalizes decimal separators and removes parenthesized text", () => {
    expect(whoScoredStatisticSchema.parse("7,8 (estimated) (adjusted)")).toBe(7.8);
  });

  it("preserves text when a parenthesized section is incomplete", () => {
    expect(whoScoredStatisticSchema.safeParse("7,8 (estimated").success).toBe(false);
  });
});
