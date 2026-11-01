import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { anonymousTest } from "./fixtures/auth";
import { E2E_EMAIL_DOMAIN, E2E_PASSWORD, E2E_USERS } from "./fixtures/data";

anonymousTest("registration validates input, rejects duplicates, and creates an investor", async ({ page }) => {
  await page.goto("/register");

  const name = page.getByLabel("Nombre completo");
  const email = page.getByLabel("Correo electrónico");
  const password = page.getByLabel("Contraseña");
  const submit = page.getByRole("button", { name: "Registrarse" });

  await submit.click();
  await expect(page.getByText("El nombre es obligatorio")).toBeVisible();
  await expect(page.getByText("Ingresa un correo electrónico válido")).toBeVisible();
  await expect(page.getByText("La contraseña es obligatoria")).toBeVisible();

  await name.fill("E2E New Investor");
  await email.fill("invalid-address");
  await password.fill(E2E_PASSWORD);
  await submit.click();
  await expect(page.getByText("Ingresa un correo electrónico válido")).toBeVisible();

  await email.fill(E2E_USERS.investor.email);
  await submit.click();
  await expect(page.getByRole("alert").filter({ hasText: "El correo electrónico ya se encuentra registrado." })).toBeVisible();

  const newEmail = `registration-${randomUUID()}@${E2E_EMAIL_DOMAIN}`;
  await email.fill(newEmail);
  await submit.click();
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByRole("heading", { name: "Jugadores", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mi portfolio" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Jugadores", exact: true })).toBeVisible();
});
