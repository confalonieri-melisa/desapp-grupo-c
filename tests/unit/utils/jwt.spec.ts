import { describe, it, expect } from "vitest";
import { generateToken, verifyToken, UserJwtPayload } from "@/utils/jwt";

describe("JWT Utility (jwt.ts)", () => {
  const samplePayload: UserJwtPayload = {
    userId: "usr-123456",
    email: "investor@example.com",
    role: "INVESTOR",
  };

  it("should generate a valid JWT token string", () => {
    const token = generateToken(samplePayload);

    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT format: header.payload.signature
  });

  it("should verify and decode a valid token with user claims", () => {
    const token = generateToken(samplePayload);
    const decoded = verifyToken(token);

    expect(decoded.userId).toBe(samplePayload.userId);
    expect(decoded.email).toBe(samplePayload.email);
    expect(decoded.role).toBe(samplePayload.role);
    expect(decoded.exp).toBeDefined(); // Should have expiration timestamp
  });

  it("should throw an error when verifying an invalid token", () => {
    const invalidToken = "invalid.jwt.token";

    expect(() => verifyToken(invalidToken)).toThrow();
  });

  it("should throw an error when verifying an expired token", async () => {
    const expiredToken = generateToken(samplePayload, "-1s");

    expect(() => verifyToken(expiredToken)).toThrow();
  });
});
