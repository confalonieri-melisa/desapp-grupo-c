import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
mkdirSync(".tmp", { recursive: true });
const id = "33333333-3333-4333-8333-333333333333",
  buyer = "11111111-1111-4111-8111-111111111111",
  seller = "22222222-2222-4222-8222-222222222222";
(async () => {
  const browser = await chromium.launch({
    ...(process.env.P2P_BROWSER_PATH
      ? { executablePath: process.env.P2P_BROWSER_PATH }
      : { channel: "chrome" }),
    headless: true,
  });
  let offers = [
    {
      id: "44444444-4444-4444-8444-444444444444",
      playerId: id,
      sellerId: seller,
      quantity: 2,
      unitPrice: 12.35,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    },
  ];
  let stock = 1,
    who = buyer,
    quote = true,
    accepts = 0,
    publishes = 0,
    cancels = 0,
    failure = 0,
    poolError = false;
  const page = await browser.newPage();
  await page.addInitScript(
    ({ buyer }) => {
      localStorage.setItem("auth_token", "test-jwt");
      localStorage.setItem(
        "auth_user",
        JSON.stringify({ id: buyer, name: "Buyer", email: "buyer@test.example", role: "INVESTOR" }),
      );
    },
    { buyer },
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    let body,
      status = 200;
    if (url.pathname.endsWith("/pool-availability") && poolError)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unavailable" }),
      });
    if (url.pathname.endsWith("/accept") && failure) {
      accepts++;
      return route.fulfill({
        status: failure,
        contentType: "application/json",
        body: JSON.stringify({ error: "Offer is no longer open" }),
      });
    }
    if (url.pathname === `/api/players/${id}`)
      body = {
        id,
        name: "P2P Test Player",
        team: "Test FC",
        position: "FORWARD",
        league: "PREMIER_LEAGUE",
        statistics: { rating: 7 },
        totalTokens: 100,
      };
    else if (url.pathname.endsWith("/quotes"))
      body = {
        items: quote
          ? [
              {
                playerId: id,
                quoteValue: 10,
                unit: "CREDIT_PER_TOKEN",
                calculatedAt: new Date().toISOString(),
                strategyCode: "INDIVIDUAL_PERFORMANCE",
                strategyVersion: "1",
              },
            ]
          : [],
      };
    else if (url.pathname.endsWith("/pool-availability"))
      body = { playerId: id, availableQuantity: stock };
    else if (url.pathname === "/api/portfolio")
      body = {
        creditBalance: 100,
        items: [
          {
            playerId: id,
            quantity: 5,
            averagePurchasePrice: 8,
            currentQuoteValue: 10,
            currentValue: 50,
            unrealizedPnl: 10,
          },
        ],
      };
    else if (url.pathname === "/api/p2p/offers" && req.method() === "GET") body = offers;
    else if (url.pathname === "/api/p2p/offers" && req.method() === "POST") {
      publishes++;
      body = {
        ...offers[0],
        ...req.postDataJSON(),
        sellerId: who,
        id: "55555555-5555-4555-8555-555555555555",
        status: "OPEN",
        createdAt: new Date().toISOString(),
      };
      offers.push(body);
      status = 201;
    } else if (url.pathname.endsWith("/accept")) {
      accepts++;
      const o = offers.find((o) => url.pathname.includes(o.id));
      body = {
        operation: {
          id: "receipt-p2p",
          buyerId: buyer,
          sellerId: seller,
          offerId: o.id,
          playerId: id,
          quantity: o.quantity,
          unitPrice: o.unitPrice,
          total: 24.7,
          createdAt: new Date().toISOString(),
        },
        account: { creditBalance: 75.3 },
        holding: { quantity: 7, averagePurchasePrice: 9 },
      };
      offers = offers.filter((x) => x.id !== o.id);
      status = 201;
    } else if (req.method() === "DELETE") {
      cancels++;
      offers = offers.filter((o) => !url.pathname.endsWith(o.id));
      return route.fulfill({ status: 204 });
    } else if (url.pathname === "/api/orders/buy") {
      stock = 0;
      body = {
        operation: {
          id: "pool-receipt",
          type: "BUY",
          userId: buyer,
          playerId: id,
          quantity: 1,
          quoteValue: 10,
          total: 10,
          createdAt: new Date().toISOString(),
        },
        account: { creditBalance: 90 },
        holding: { quantity: 6, averagePurchasePrice: 9 },
      };
      status = 201;
    } else body = { items: [] };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(`${process.env.P2P_BASE_URL || "http://localhost:3000"}/players/${id}`);
  await page.getByText("Comprar oferta completa").waitFor();
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: `.tmp/p2p-${width}.png`, fullPage: true });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `overflow at ${width}`,
    );
  }
  await page.getByText("Comprar oferta completa").click();
  assert(await page.getByRole("dialog").isVisible());
  await page.keyboard.press("Escape");
  assert.equal(accepts, 0);
  await page.getByText("Comprar oferta completa").click();
  await page.getByRole("button", { name: "Confirmar compra P2P", exact: true }).click();
  await page.getByText(/Compra P2P confirmada/).waitFor();
  assert.equal(accepts, 1);
  await page.getByRole("button", { name: "Vender (P2P)", exact: true }).click();
  await page.getByLabel("Cantidad completa").fill("2");
  await page.getByLabel("Precio fijo por token").fill("12.35");
  await page.getByText(/Revisar publicaci/).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Confirmar publicaci/ })
    .click();
  await page.getByText(/Oferta publicada/).waitFor();
  assert.equal(publishes, 1);
  await page.getByRole("button", { name: "Comprar", exact: true }).click();
  await page.getByRole("button", { name: "Cancelar oferta propia" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Confirmar cancelaci/ })
    .click();
  await page.getByText(/Cancelaci.*confirmada/).waitFor();
  assert.equal(cancels, 1);
  await page.getByLabel("Cantidad de tokens").fill("1");
  await page.getByText("Ver detalle de la compra").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await page.getByText("Comprar al pool").waitFor({ state: "hidden" });
  quote = false;
  stock = 1;
  offers = [
    {
      id: "44444444-4444-4444-8444-444444444444",
      playerId: id,
      sellerId: seller,
      quantity: 2,
      unitPrice: 12.35,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    },
  ];
  await page.reload();
  await page.getByText("Comprar oferta completa").waitFor();
  assert.equal(await page.getByText("Ver detalle de la compra").isDisabled(), true);
  failure = 409;
  await page.getByText("Comprar oferta completa").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar compra P2P", exact: true })
    .click();
  await page.getByText(/Operaci.*rechazada/).waitFor();
  assert.equal(await page.getByText(/Compra P2P confirmada/).count(), 0);
  failure = 500;
  await page.reload();
  await page.getByText("Comprar oferta completa").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar compra P2P", exact: true })
    .click();
  await page.getByText(/Resultado incierto:/).waitFor();
  const count = accepts;
  await page.getByText("Actualizar ofertas").click();
  assert.equal(accepts, count);
  poolError = true;
  await page.reload();
  await page.getByText("Reintentar disponibilidad").waitFor();
  assert.equal(await page.getByText("Comprar al pool").count(), 0);
  poolError = false;
  await page.getByText("Reintentar disponibilidad").click();
  await page.getByText("Comprar al pool").waitFor();
  await page.route("**/api/p2p/offers?*", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Expired" }),
    }),
  );
  await page.reload();
  await page.waitForURL("**/login");
  console.log(
    "PASS: missing quote with P2P operable; 409 rejection; 500 uncertainty no automatic retry; pool error/retry; expired session logout.",
  );
  console.log(
    "PASS: 360/1280 no overflow; Escape no POST; accept receipt; publish own; cancel; pool exhaustion hides action.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
