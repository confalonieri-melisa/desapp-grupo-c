import { expect } from "@playwright/test";
import { anonymousTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

for (const route of [
  "/players",
  `/players/${E2E_PLAYERS[0].id}`,
  "/ranking",
  "/comparison",
  "/transactions",
  "/portfolio",
]) {
  anonymousTest(`signed-out visitor is redirected from ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  });
}
