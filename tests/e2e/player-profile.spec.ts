import { expect } from "@playwright/test";
import { investorTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

investorTest(
  "profile shows quotes and trade preview, with recovery for missing players",
  async ({ page }) => {
    const player = E2E_PLAYERS[0];
    await page.goto(`/players/${player.id}`);
    await expect(page.getByRole("heading", { name: player.name, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rendimiento" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estadísticas detalladas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cotización actual" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Valor del jugador" })).toBeVisible();

    await page.getByRole("button", { name: "Mostrar historial" }).click();
    const quoteHistory = page.getByRole("region", { name: "Historial de cotizaciones" });
    await expect(quoteHistory.getByRole("heading", { name: "Registro 2" })).toBeVisible();
    await page.getByLabel("Ver detalle del cálculo de cotización actual").click();
    await expect(page.getByText("Score final").first()).toBeVisible();

    await page.getByLabel("Fecha de consulta").fill("2026-09-26");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(
      page.getByText(/Último valor disponible hasta el 26 de septiembre de 2026/),
    ).toBeVisible();

    await page.getByRole("textbox", { name: "Cantidad de tokens" }).fill("2");
    await page.getByRole("button", { name: "Ver detalle de la compra" }).click();
    const confirmation = page.getByRole("dialog", { name: "Confirmar compra" });
    await expect(confirmation).toContainText(player.name);
    await expect(confirmation).toContainText("2 tokens");
    await confirmation.getByRole("button", { name: "Cancelar" }).click();
    await expect(confirmation).not.toBeVisible();

    await page.goto("/players/00000000-0000-4000-8000-00000000ffff");
    await expect(
      page.getByRole("alert").filter({ hasText: "No se encontró al jugador" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Volver a jugadores" }).click();
    await expect(page).toHaveURL(/\/players$/);
  },
);
