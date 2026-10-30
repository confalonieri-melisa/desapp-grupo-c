import { defineConfig } from "vitest/config";
import path from "path";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("TEST_DATABASE_URL is required to run integration tests");
}

const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!/(test|integration)/i.test(databaseName)) {
  throw new Error("TEST_DATABASE_URL must point to a test database");
}

process.env.DATABASE_URL = databaseUrl;
process.env.RUN_DB_INTEGRATION_TESTS = "true";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    include: ["tests/integration/**/*.spec.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
