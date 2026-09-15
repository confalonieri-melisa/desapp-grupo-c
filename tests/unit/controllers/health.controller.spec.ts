import { describe, expect, it } from "vitest";
import { getHealth } from "@/controllers/health.controller";

describe("getHealth", () => {
  it("returns an ok status", () => {
    expect(getHealth()).toEqual({ status: "ok" });
  });
});
