import { expect, test } from "@playwright/test";
import { ANONYMOUS_STATE, AUTH_STATE } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

test.describe("signed-out visitor", () => {
  test.use({ storageState: ANONYMOUS_STATE });

  test("reaches the login page", async ({ page }) => {
    await page.goto("/players");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });
});

test.describe("seeded investor", () => {
  test.use({ storageState: AUTH_STATE.investor });

  test("sees the catalog", async ({ page }) => {
    await page.goto("/players");
    await expect(page.getByRole("heading", { name: "Jugadores", exact: true })).toBeVisible();
    await expect(page.getByText(E2E_PLAYERS[0].name)).toBeVisible();
  });
});
