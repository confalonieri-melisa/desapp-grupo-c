import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.E2E_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("E2E_DATABASE_URL is required to run E2E tests");
}

const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!/e2e/i.test(databaseName)) {
  throw new Error("E2E_DATABASE_URL must point to an E2E database");
}

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "npm run start -- --port 3100" : "npm run dev -- --port 3100",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      JWT_SECRET: process.env.JWT_SECRET ?? "secret-jwt-key-desapp-grupo-c-min-32-chars",
      NODE_ENV: process.env.CI ? "production" : "development",
    },
  },
});
