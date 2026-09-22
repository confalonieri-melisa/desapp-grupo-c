import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "@/config/env";
import { UnauthorizedError } from "@/errors/http.error";
import { requireAuth } from "@/middlewares/auth.middleware";
import { issueToken } from "@/utils/jwt";

describe("requireAuth", () => {
  it("returns the payload for a valid bearer token", () => {
    const token = issueToken({
      sub: "user-id",
      email: "user@example.com",
      role: "INVESTOR",
    });

    expect(
      requireAuth(
        new Request("http://localhost/api/protected", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    ).toMatchObject({ sub: "user-id" });
  });

  it.each([
    new Request("http://localhost/api/protected"),
    new Request("http://localhost/api/protected", {
      headers: { authorization: "Bearer invalid" },
    }),
    new Request("http://localhost/api/protected", {
      headers: { authorization: "Basic token" },
    }),
  ])("rejects unauthenticated requests", (request) => {
    expect(() => requireAuth(request)).toThrow(UnauthorizedError);
  });

  it("rejects an expired token", () => {
    const token = jwt.sign(
      {
        sub: "user-id",
        email: "user@example.com",
        role: "INVESTOR",
      },
      env.JWT_SECRET,
      { expiresIn: -1 },
    );

    expect(() =>
      requireAuth(
        new Request("http://localhost/api/protected", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    ).toThrow(UnauthorizedError);
  });
});
