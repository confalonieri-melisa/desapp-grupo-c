import { defineConfig } from "vitest/config";
import path from "path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
  if (!/(test|integration)/i.test(databaseName)) {
    throw new Error("TEST_DATABASE_URL must point to a test database");
  }
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.RUN_DB_INTEGRATION_TESTS = "true";
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    include: [
      "tests/unit/**/*.spec.ts",
      "tests/unit/**/*.spec.tsx",
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.spec.ts",
      "tests/integration/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/app/**",
        "src/frontend/components/**",
        "src/frontend/context/**",
        "src/backend/config/**",
        "src/backend/db/seeds/**",
        "src/backend/db/migrations/**",
        "src/backend/db/index.ts",
        "src/backend/db/schema.ts",
        "src/backend/middlewares/**",
        "src/backend/utils/password.ts",
        "src/backend/utils/jwt.ts",
        "node_modules/**",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
