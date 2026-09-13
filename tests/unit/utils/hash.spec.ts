import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/utils/hash";

describe("Password Hashing Utility (hash.ts)", () => {
  it("should hash a password and return a valid bcrypt hash string", async () => {
    const password = "mySecretPassword123";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash).not.toEqual(password);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
  });

  it("should return true when verifying correct password against hash", async () => {
    const password = "mySecretPassword123";
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(password, hash);
    expect(isMatch).toBe(true);
  });

  it("should return false when verifying incorrect password against hash", async () => {
    const password = "mySecretPassword123";
    const wrongPassword = "wrongPassword456";
    const hash = await hashPassword(password);

    const isMatch = await verifyPassword(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });
});
