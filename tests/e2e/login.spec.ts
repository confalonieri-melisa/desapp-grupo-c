import { expect } from "@playwright/test";
import { anonymousTest } from "./fixtures/auth";
import { E2E_USERS } from "./fixtures/data";

anonymousTest("login validates input, rejects wrong credentials, and signs out", async ({ page }) => {
  await page.goto("/login");

  const email = page.getByLabel("Correo electrónico");
  const password = page.getByLabel("Contraseña");
  const submit = page.getByRole("button", { name: "Iniciar sesión" });

  await submit.click();
  await expect(page.getByText("Ingresa un correo electrónico válido")).toBeVisible();
  await expect(page.getByText("La contraseña es obligatoria")).toBeVisible();

  await email.fill("not-an-email");
  await password.fill("wrong-password");
  await submit.click();
  await expect(page.getByText("Ingresa un correo electrónico válido")).toBeVisible();

  await email.fill(E2E_USERS.investor.email);
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid credentials" })).toBeVisible();

  await password.fill(E2E_USERS.investor.password);
  await submit.click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByRole("heading", { name: "Jugadores", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/portfolio");
  await expect(page).toHaveURL(/\/login$/);
});
