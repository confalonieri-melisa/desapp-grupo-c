import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Browser } from "@playwright/test";
import { AUTH_STATE } from "./fixtures/auth";
import { seedE2EData } from "./fixtures/database";
import { E2E_USERS } from "./fixtures/data";

type FixtureUser = typeof E2E_USERS.investor | typeof E2E_USERS.superuser;

async function saveAuthenticatedState(
  browser: Browser,
  user: FixtureUser,
  statePath: string,
): Promise<void> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(user.email);
    await page.getByLabel("Contraseña").fill(user.password);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/players$/);
    await expect(page.getByRole("heading", { name: "Jugadores", exact: true })).toBeVisible();
    await context.storageState({ path: statePath });
  } finally {
    await context.close();
  }
}

test("seed E2E data and prepare authenticated browser states", async ({ browser }) => {
  test.setTimeout(120_000);
  await seedE2EData();
  await mkdir(path.dirname(AUTH_STATE.investor), { recursive: true });
  await saveAuthenticatedState(browser, E2E_USERS.investor, AUTH_STATE.investor);
  await saveAuthenticatedState(browser, E2E_USERS.superuser, AUTH_STATE.superuser);
});
