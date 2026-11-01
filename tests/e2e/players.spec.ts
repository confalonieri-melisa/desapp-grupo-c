import { expect } from "@playwright/test";
import { investorTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

investorTest("catalog supports pagination, filters, search, and profile navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByText("21 jugadores encontrados")).toBeVisible();

  const pagination = page.getByRole("navigation", { name: "Paginación de jugadores" });
  await expect(pagination).toContainText("Página 1 de 2");
  await pagination.getByRole("button").last().click();
  await expect(page).toHaveURL(/\bpage=2\b/);
  await expect(pagination).toContainText("Página 2 de 2");
  await pagination.getByRole("button").first().click();
  await expect(page).toHaveURL(/\/players$/);

  await page.getByLabel("Liga").selectOption("PREMIER_LEAGUE");
  await expect(page).toHaveURL(/league=PREMIER_LEAGUE/);
  await page.getByLabel("Posición").selectOption("FORWARD");
  await expect(page).toHaveURL(/position=FORWARD/);
  await page.getByLabel("Equipo").selectOption("E2E United");
  await expect(page).toHaveURL(/team=E2E\+United/);
  await expect(page.getByText("1 jugador encontrado")).toBeVisible();
  await expect(page.getByText(E2E_PLAYERS[0].name)).toBeVisible();

  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByText("21 jugadores encontrados")).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Buscar jugador por nombre" });
  await search.fill("Ada");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/name=Ada/);
  await expect(page.getByText("1 jugador encontrado")).toBeVisible();

  await search.fill("Nobody Matches E2E");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByText("No hay jugadores que coincidan con los filtros seleccionados.")).toBeVisible();

  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.getByText("21 jugadores encontrados")).toBeVisible();
  await page.getByText(E2E_PLAYERS[0].name).click();
  await expect(page).toHaveURL(new RegExp(`/players/${E2E_PLAYERS[0].id}$`));
  await expect(page.getByRole("heading", { name: E2E_PLAYERS[0].name, exact: true })).toBeVisible();
});
