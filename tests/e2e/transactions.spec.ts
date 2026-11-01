import { expect } from "@playwright/test";
import { investorTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

investorTest("history loads all operations and filters the loaded entries", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page.getByRole("heading", { name: "Mi historial" })).toBeVisible();

  const operations = page.getByRole("list", { name: "Operaciones" }).getByRole("listitem");
  const summary = page.getByRole("region", { name: "Resumen de operaciones cargadas" });
  await expect(operations).toHaveCount(20);
  await expect(summary).toContainText("Operaciones cargadas20");
  await expect(operations.first()).toContainText(E2E_PLAYERS[0].name);

  await page.getByRole("button", { name: "Ver más operaciones" }).click();
  await expect(operations).toHaveCount(22);
  await expect(summary).toContainText("Operaciones cargadas22");
  await expect(page.getByText("Llegaste al final del historial.")).toBeVisible();

  const filters = page.getByRole("search", { name: "Filtrar operaciones cargadas" });
  await filters.getByLabel("Tipo").selectOption("SELL");
  await expect(operations).toHaveCount(8);
  await expect(operations.first()).toContainText("Venta");
  await filters.getByLabel("Tipo").selectOption("ALL");
  await filters.getByLabel("Período").selectOption("2026-09");
  await expect(operations).toHaveCount(11);
  await filters.getByRole("searchbox", { name: "Buscar jugador" }).fill("Beto");
  await expect(operations).toHaveCount(6);
  await expect(operations.first()).toContainText(E2E_PLAYERS[1].name);

  await filters.getByRole("searchbox", { name: "Buscar jugador" }).fill("Nobody Matches E2E");
  await expect(
    page.getByText("No hay operaciones cargadas que coincidan con los filtros."),
  ).toBeVisible();
  await filters.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(operations).toHaveCount(22);
});
