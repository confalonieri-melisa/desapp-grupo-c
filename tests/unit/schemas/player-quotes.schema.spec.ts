import { describe, expect, it } from "vitest";
import {
  playerQuotesParamsSchema,
  playerQuotesQuerySchema,
} from "@/backend/schemas/player-quotes.schema";

describe("player quotes schemas", () => {
  it("accepts a valid player id and calendar date", () => {
    expect(playerQuotesParamsSchema.parse({
      id: "00000000-0000-4000-8000-000000000001",
    })).toEqual({ id: "00000000-0000-4000-8000-000000000001" });
    expect(playerQuotesQuerySchema.parse({ date: "2026-10-20" })).toEqual({
      date: "2026-10-20",
    });
  });

  it.each([
    "not-a-uuid",
    "2026-02-30",
    "2026-1-01",
    "2026-10-20T00:00:00Z",
    "",
  ])("rejects invalid player/date input: %s", (value) => {
    const result = value === "not-a-uuid"
      ? playerQuotesParamsSchema.safeParse({ id: value })
      : playerQuotesQuerySchema.safeParse({ date: value });

    expect(result.success).toBe(false);
  });

  it("ignores query parameters outside the MVP contract", () => {
    expect(playerQuotesQuerySchema.parse({ date: "2026-10-20", page: "1" })).toEqual({
      date: "2026-10-20",
    });
  });
});
