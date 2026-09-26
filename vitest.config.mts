import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    passWithNoTests: true,
    include: ["tests/**/*.spec.ts", "tests/**/*.test.ts"],
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
