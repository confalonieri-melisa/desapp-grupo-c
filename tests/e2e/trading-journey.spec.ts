import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ANONYMOUS_STATE } from "./fixtures/auth";
import { E2E_EMAIL_DOMAIN, E2E_PASSWORD, E2E_PLAYERS } from "./fixtures/data";

test.use({ storageState: ANONYMOUS_STATE });

test("new investor buys and manages a P2P offer through catalog, profile, portfolio, and history", async ({
  page,
}) => {
  const player = E2E_PLAYERS[0];
  await page.goto("/register");
  await page.getByLabel("Nombre completo").fill("E2E Journey Investor");
  await page.getByLabel("Correo electrónico").fill(`journey-${randomUUID()}@${E2E_EMAIL_DOMAIN}`);
  await page.getByLabel("Contraseña").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Registrarse" }).click();
  await expect(page).toHaveURL(/\/players$/);
  await page.getByText(player.name).click();
  await expect(page.getByRole("heading", { name: player.name, exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: "Cantidad de tokens" }).fill("2");
  await page.getByRole("button", { name: "Ver detalle de la compra" }).click();
  await page
    .getByRole("dialog", { name: "Confirmar compra" })
    .getByRole("button", { name: "Confirmar compra" })
    .click();
  await expect(page.getByText("Compra confirmada", { exact: true })).toBeVisible();

  await page.goto("/portfolio");
  const summary = page.getByRole("region", { name: "Resumen" });
  const positions = page.getByRole("region", { name: "Mis jugadores" });
  const row = positions.getByRole("listitem").filter({ hasText: player.name });
  await expect(summary.getByText("Saldo disponible").locator("..")).toContainText("940 créditos");
  await expect(row).toContainText("2 tokens");
  await expect(row).toContainText("60 créditos");

  await page.goto("/transactions");
  const operations = page.getByRole("list", { name: "Operaciones" }).getByRole("listitem");
  await expect(operations).toHaveCount(1);
  await expect(operations.first()).toContainText("Compra");
  await expect(operations.first()).toContainText(player.name);
  await operations.first().getByRole("link", { name: player.name }).click();
  await expect(page).toHaveURL(new RegExp(`/players/${player.id}$`));

  await page.getByRole("button", { name: "Vender", exact: true }).click();
  await page.getByLabel("Cantidad completa").fill("1");
  await page.getByLabel("Precio fijo por token").fill("30");
  await page.getByRole("button", { name: "Revisar publicación" }).click();
  await page
    .getByRole("dialog", { name: "Confirmar publicación" })
    .getByRole("button", { name: "Confirmar publicación" })
    .click();
  await expect(page.getByText("Oferta publicada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar oferta propia" }).click();
  await page
    .getByRole("dialog", { name: "Confirmar cancelación" })
    .getByRole("button", { name: "Confirmar cancelación" })
    .click();
  await expect(page.getByText("Oferta cancelada", { exact: true })).toBeVisible();

  await page.goto("/portfolio");
  await expect(summary.getByText("Saldo disponible").locator("..")).toContainText("940 créditos");
  await expect(row).toContainText("2 tokens");
  await expect(row).toContainText("60 créditos");
  await page.goto("/transactions");
  await expect(operations).toHaveCount(1);
  await expect(operations.first()).toContainText("Compra");
});
