import { expect } from "@playwright/test";
import { anonymousTest, investorTest, superuserTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

investorTest("portfolio shows balances and holdings, then opens the player profile", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { name: "Mi portfolio" })).toBeVisible();
  const summary = page.getByRole("region", { name: "Resumen" });
  await expect(summary.getByText("Saldo disponible").locator("..")).toContainText("1.000 créditos");
  await expect(summary).toContainText("Valor de tenencias");
  await expect(summary).toContainText("Ganancia o pérdida");

  const positions = page.getByRole("region", { name: "Mis jugadores" });
  const row = positions.getByRole("listitem").filter({ hasText: E2E_PLAYERS[0].name });
  await expect(row).toBeVisible();
  await expect(row).toContainText("5 tokens");
  await expect(row).toContainText("150 créditos");

  await positions.getByRole("textbox", { name: "Buscar jugador" }).fill("Beto");
  await expect(positions.getByText("No hay jugadores que coincidan con la búsqueda.")).toBeVisible();
  await positions.getByRole("textbox", { name: "Buscar jugador" }).fill("");
  await row.getByRole("link", { name: "Ver" }).click();
  await expect(page).toHaveURL(new RegExp(`/players/${E2E_PLAYERS[0].id}$`));
});

superuserTest("superuser is redirected away from investor portfolio", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/players$/);
  await page.goto(`/players/${E2E_PLAYERS[0].id}`);
  await expect(page.getByRole("heading", { name: E2E_PLAYERS[0].name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver detalle de la compra" })).toHaveCount(0);
});

anonymousTest("signed-out visitor is redirected from portfolio", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/login$/);
});

investorTest("narrow viewport keeps navigation and portfolio search usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/players");
  const navigation = page.getByRole("navigation", { name: "Navegación principal" });
  await navigation.getByRole("link", { name: "Mi portfolio" }).click();
  await expect(page.getByRole("heading", { name: "Mi portfolio" })).toBeVisible();
  const positions = page.getByRole("region", { name: "Mis jugadores" });
  await positions.getByRole("textbox", { name: "Buscar jugador" }).fill("Ada");
  await expect(positions.getByText(E2E_PLAYERS[0].name)).toBeVisible();
});
