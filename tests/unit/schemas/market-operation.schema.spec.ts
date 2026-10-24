import { describe, expect, it } from "vitest";
import {
  marketOperationHistoryParamsSchema,
  marketOperationHistoryQuerySchema,
  marketOperationRequestSchema,
} from "@/backend/schemas/market-operation.schema";

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

describe("market operation history schema", () => {
  it("applies the default pagination", () => {
    expect(marketOperationHistoryQuerySchema.parse({})).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it("coerces valid query parameters", () => {
    expect(marketOperationHistoryQuerySchema.parse({ limit: "10", offset: "20" })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it.each([
    { limit: "0", offset: "0" },
    { limit: "101", offset: "0" },
    { limit: "1.5", offset: "0" },
    { limit: "10", offset: "-1" },
    { limit: "invalid", offset: "0" },
    { limit: "10", offset: "0", page: "2" },
  ])("rejects invalid pagination: $limit/$offset", (input) => {
    expect(marketOperationHistoryQuerySchema.safeParse(input).success).toBe(false);
  });

  it("accepts only a valid user id path parameter", () => {
    expect(marketOperationHistoryParamsSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
    }).success).toBe(true);
    expect(marketOperationHistoryParamsSchema.safeParse({ id: "other" }).success).toBe(false);
  });
});
