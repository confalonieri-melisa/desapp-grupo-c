import { describe, expect, it } from "vitest";
import { z } from "zod";
import { validate } from "@/utils/validate";

describe("validate", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns the parsed value", () => {
    expect(validate(schema, { name: "Lola Gol" })).toEqual({
      name: "Lola Gol",
    });
  });

  it("propagates schema validation errors", () => {
    expect(() => validate(schema, { name: "" })).toThrow();
  });
});
