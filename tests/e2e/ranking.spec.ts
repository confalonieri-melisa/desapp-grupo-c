import { expect } from "@playwright/test";
import { investorTest } from "./fixtures/auth";
import { E2E_PLAYERS } from "./fixtures/data";

investorTest(
  "ranking supports ordering, pagination, filters, and profile navigation",
  async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByRole("heading", { name: "Ranking", exact: true })).toBeVisible();
    await expect(page.getByText("Estrategia activa: Rendimiento individual")).toBeVisible();

    const ranking = page.getByRole("list", { name: "Ranking de jugadores" });
    const pagination = page.getByRole("navigation", { name: "Paginación del ranking" });
    await expect(ranking.getByRole("listitem")).toHaveCount(20);
    await expect(ranking.getByRole("listitem").first()).toContainText(E2E_PLAYERS[0].name);
    await expect(pagination).toContainText("21 jugadores · Página 1 de 2");

    await pagination.getByRole("button", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/\bpage=2\b/);
    await expect(pagination).toContainText("Página 2 de 2");
    await expect(ranking.getByRole("listitem")).toHaveCount(1);
    await expect(ranking.getByRole("listitem").first()).toContainText(E2E_PLAYERS[20].name);
    await pagination.getByRole("button", { name: "Anterior" }).click();
    await expect(page).toHaveURL(/\/ranking$/);

    const filters = page.getByRole("region", { name: "Filtros del ranking" });
    await filters.getByLabel("Liga").selectOption("PREMIER_LEAGUE");
    await expect(page).toHaveURL(/league=PREMIER_LEAGUE/);
    await filters.getByLabel("Posición").selectOption("FORWARD");
    await expect(page).toHaveURL(/position=FORWARD/);
    await filters.getByLabel("Equipo").fill("United");
    await filters.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/team=United/);
    await expect(pagination).toContainText("1 jugador · Página 1 de 1");
    await expect(ranking.getByRole("listitem")).toHaveCount(1);
    await expect(ranking.getByRole("listitem").first()).toContainText(E2E_PLAYERS[0].name);

    await filters.getByRole("button", { name: "Limpiar filtros" }).click();
    await expect(page).toHaveURL(/\/ranking$/);
    await expect(pagination).toContainText("21 jugadores · Página 1 de 2");

    await filters.getByLabel("Equipo").fill("No Such Team");
    await filters.getByRole("button", { name: "Buscar" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "No hay jugadores rankeados." }),
    ).toBeVisible();

    await filters.getByRole("button", { name: "Limpiar filtros" }).click();
    await ranking.getByRole("link", { name: E2E_PLAYERS[0].name }).click();
    await expect(page).toHaveURL(new RegExp(`/players/${E2E_PLAYERS[0].id}$`));
    await expect(
      page.getByRole("heading", { name: E2E_PLAYERS[0].name, exact: true }),
    ).toBeVisible();
  },
);
