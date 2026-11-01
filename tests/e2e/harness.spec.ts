import { expect } from "@playwright/test";
import { anonymousTest, investorTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

anonymousTest("signed-out visitor reaches the login page", async ({ page }) => {
  await page.goto("/players");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
});

investorTest("seeded investor sees the catalog", async ({ page }) => {
  await page.goto("/players");
  await expect(page.getByRole("heading", { name: "Jugadores", exact: true })).toBeVisible();
  await expect(page.getByText(E2E_PLAYERS[0].name)).toBeVisible();
});
