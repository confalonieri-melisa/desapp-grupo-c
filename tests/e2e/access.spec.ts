import { expect, test } from "@playwright/test";
import { ANONYMOUS_STATE } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

test.use({ storageState: ANONYMOUS_STATE });

for (const route of [
  "/players",
  `/players/${E2E_PLAYERS[0].id}`,
  "/ranking",
  "/comparison",
  "/transactions",
  "/portfolio",
]) {
  test(`signed-out visitor is redirected from ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  });
}
