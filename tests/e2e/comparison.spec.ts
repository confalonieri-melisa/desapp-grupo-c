import { expect, type Page } from "@playwright/test";
import { investorTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

async function addPlayer(page: Page, name: string): Promise<void> {
  await page.getByRole("searchbox", { name: "Buscar jugador por nombre" }).fill(name);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByRole("button", { name: `Agregar ${name}` }).click();
}

investorTest("comparison limits selection to three and restores it after reload", async ({ page }) => {
  await page.goto("/comparison");
  await expect(page.getByRole("heading", { name: "Comparador de jugadores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Todavía no seleccionaste jugadores" })).toBeVisible();
  await expect(page.getByText("0 de 3 jugadores seleccionados")).toBeVisible();

  await addPlayer(page, E2E_PLAYERS[0].name);
  await expect(page.getByText("1 de 3 jugadores seleccionados")).toBeVisible();
  await addPlayer(page, E2E_PLAYERS[1].name);
  await expect(page.getByText("2 de 3 jugadores seleccionados")).toBeVisible();

  const matrix = page.getByRole("table", { name: "Comparación de jugadores seleccionados" });
  await expect(matrix.getByRole("columnheader", { name: new RegExp(E2E_PLAYERS[0].name) })).toBeVisible();
  await expect(matrix.getByRole("columnheader", { name: new RegExp(E2E_PLAYERS[1].name) })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evolución de cotizaciones" })).toBeVisible();
  await expect(page.getByRole("img", { name: new RegExp(`${E2E_PLAYERS[0].name}:`) })).toBeVisible();

  await addPlayer(page, E2E_PLAYERS[2].name);
  await expect(page.getByText("3 de 3 jugadores seleccionados")).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar jugador por nombre" }).fill(E2E_PLAYERS[3].name);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Máximo de tres jugadores alcanzado" })).toBeDisabled();

  await page.reload();
  await expect(page.getByText("3 de 3 jugadores seleccionados")).toBeVisible();
  await expect(matrix.getByRole("columnheader", { name: new RegExp(E2E_PLAYERS[2].name) })).toBeVisible();

  await matrix.getByRole("button", { name: `Quitar a ${E2E_PLAYERS[1].name}` }).click();
  await expect(page.getByText("2 de 3 jugadores seleccionados")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar todo" }).click();
  await expect(page.getByText("0 de 3 jugadores seleccionados")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Todavía no seleccionaste jugadores" })).toBeVisible();
});
