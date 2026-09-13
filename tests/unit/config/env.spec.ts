import { describe, it, expect } from "vitest";
import { env, parseEnv, envSchema } from "@/config/env";

describe("Environment Configuration (env.ts)", () => {
  it("should have valid default environment variables", () => {
    expect(env).toBeDefined();
    expect(env.PORT).toBeTypeOf("number");
    expect(env.DATABASE_URL).toContain("postgres");
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(16);
    expect(["development", "production", "test"]).toContain(env.NODE_ENV);
  });

  it("should validate custom environment values", () => {
    const customConfig = {
      DATABASE_URL: "postgresql://custom_user:pass@localhost:5432/custom_db",
      JWT_SECRET: "my-custom-super-secure-jwt-secret-key-32",
      NODE_ENV: "test" as const,
      PORT: "4000",
    };

    const parsed = parseEnv(customConfig);
    expect(parsed.DATABASE_URL).toBe(customConfig.DATABASE_URL);
    expect(parsed.JWT_SECRET).toBe(customConfig.JWT_SECRET);
    expect(parsed.NODE_ENV).toBe("test");
    expect(parsed.PORT).toBe(4000);
  });

  it("should reject invalid JWT_SECRET shorter than 16 characters", () => {
    const invalidConfig = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      JWT_SECRET: "short",
      NODE_ENV: "development",
      PORT: 3000,
    };

    const result = envSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it("should throw an error when parseEnv fails validation", () => {
    const invalidConfig = {
      DATABASE_URL: "postgresql://localhost:5432/db",
      JWT_SECRET: "short",
      NODE_ENV: "development",
      PORT: 3000,
    };

    expect(() => parseEnv(invalidConfig)).toThrow("Invalid environment configuration");
  });
});
