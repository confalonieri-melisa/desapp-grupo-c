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
        "src/components/**",
        "src/context/**",
        "src/config/**",
        "src/db/seeds/**",
        "src/db/migrations/**",
        "src/db/index.ts",
        "src/db/schema.ts",
        "src/middlewares/**",
        "src/utils/hash.ts",
        "src/utils/jwt.ts",
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
