import { describe, expect, it } from "vitest";
import { marketOperationRequestSchema } from "@/backend/schemas/market-operation.schema";

describe("market operation schema", () => {
  it("accepts only player and positive integer quantity", () => {
    expect(marketOperationRequestSchema.parse({
      playerId: "00000000-0000-4000-8000-000000000001",
      quantity: 3,
    })).toEqual({
      playerId: "00000000-0000-4000-8000-000000000001",
      quantity: 3,
    });
  });

  it.each([
    { playerId: "not-a-uuid", quantity: 1 },
    { playerId: "00000000-0000-4000-8000-000000000001", quantity: 0 },
    { playerId: "00000000-0000-4000-8000-000000000001", quantity: 1.5 },
    { playerId: "00000000-0000-4000-8000-000000000001", quantity: 1, userId: "other" },
  ])("rejects invalid or client-controlled input: $quantity", (input) => {
    expect(marketOperationRequestSchema.safeParse(input).success).toBe(false);
  });
});
