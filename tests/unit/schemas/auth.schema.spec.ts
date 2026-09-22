import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/schemas/auth.schema";

describe("authentication schemas", () => {
  it("trims valid registration and login input", () => {
    expect(
      registerSchema.parse({
        name: "  Lola Gol ",
        email: " lola.gol@example.test ",
        password: "Gol2026!",
      }),
    ).toEqual({
      name: "Lola Gol",
      email: "lola.gol@example.test",
      password: "Gol2026!",
    });

    expect(
      loginSchema.parse({
        email: " lola.gol@example.test ",
        password: "Gol2026!",
      }).email,
    ).toBe("lola.gol@example.test");
  });

  it("rejects missing or malformed credentials", () => {
    expect(() =>
      registerSchema.parse({
        name: "",
        email: "not-an-email",
        password: "",
      }),
    ).toThrow();

    expect(() =>
      loginSchema.parse({ email: "not-an-email", password: "" }),
    ).toThrow();
  });
});
