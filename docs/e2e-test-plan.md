# Browser E2E test plan

## Goal and scope

Cover every user-facing route with browser tests against the running Next.js app and a dedicated PostgreSQL database. Exercise real API routes for the primary flows. Keep the existing Vitest unit and integration suites separate.

Routes: `/` (redirect), `/login`, `/register`, `/players`, `/players/[id]`, `/ranking`, `/comparison`, `/transactions`, and `/portfolio`. Add a lightweight `/api/docs` smoke check because it serves a browser UI. API-only endpoints are already covered by integration tests and are outside this page matrix.

## Harness and data

1. Use the existing TypeScript `@playwright/test` setup: `playwright.config.ts` already points at `tests/e2e`, runs Chromium against port 3100, requires `E2E_DATABASE_URL`, rejects database names without `e2e`, and starts Next.js. `npm run test:e2e`, the separate Vitest discovery, and the CI E2E job are already present. Add specs and shared helpers under `tests/e2e/`; extend the config only when a test needs a missing capability.
2. Run migrations on the **dedicated E2E database** before tests as documented in `README.md`. Add a deterministic, idempotent fixture script under `tests/e2e/fixtures/` rather than relying on `npm run db:seed`: its target file is absent in this checkout. Apply the same E2E database-name guard to fixture setup and cleanup. Use a namespace or fixed IDs so cleanup touches only E2E records.
3. Fixture data should include an investor and a superuser, at least 21 players across leagues/positions/teams (to exercise both catalog and ranking pagination), an active valuation strategy, current and historical quotes with explanations, an investor balance, one existing holding, and buy/sell history. Keep dates and values fixed. No scraper or external football API calls during tests.
4. Create authenticated browser state through the real login form or API, then save separate investor and superuser states for read-only tests. Keep `/login` and `/register` tests unauthenticated. Use a fresh account or reset its data for trading tests; the config currently uses one worker. Add any auth-state output path to `.gitignore`; Playwright reports and test results are already ignored.
5. Use role, label, heading, and URL assertions, plus stable fixture names. Wait for visible loaded states or specific responses; avoid fixed sleeps and CSS class selectors. Intercept an API only for a narrowly scoped error-state test, not for the main journeys.

## Page coverage

| Route | Minimum browser checks |
| --- | --- |
| `/` | Redirects to `/players`; signed-out visitor is then sent to `/login`. |
| `/login` | Required/invalid input feedback; wrong credentials; successful login leads to catalog; logout clears session and protected-route access. |
| `/register` | Field validation and duplicate email; unique registration signs in and reaches catalog. |
| `/players` | Catalog loads fixture players; search and league/team/position filters update results and URL; reset restores results; next/previous page; card opens the matching profile; empty result state. |
| `/players/[id]` | Header, statistics, current quote, history/trend, and explanation display for a fixture player; invalid ID shows recovery link; investor can preview a trade, cancel it, and complete one buy and one sell with visible balance/holding updates. |
| `/ranking` | Active-strategy list and rank order; league/team/position filters and clear; pagination; player link; empty/error state through a scoped response override if the real fixture cannot produce it safely. |
| `/comparison` | Empty state; search and select two players; matrix/chart render their values; add third, enforce maximum of three, remove and clear; verify selection survives navigation/reload for the same user. |
| `/transactions` | Seeded buy/sell entries and summary; search, type, and period filters; clear; load-more when the fixture exceeds one page; new trade appears after returning from profile. |
| `/portfolio` | Investor balance, positions, valuation/P&L, search, and link to profile; new trade updates the position; superuser and signed-out redirects. |
| `/api/docs` | HTML response/title smoke check. Its Swagger assets currently load from a CDN, so full UI rendering would need a locally served asset to be reliable in offline CI. |

## Cross-page journeys and access

- Run one full investor journey: login → catalog → profile → buy → portfolio → history → profile → sell; assert the same player and changed balances/quantities across pages.
- Verify each protected route redirects a signed-out browser to `/login`. Verify a superuser cannot reach investor-only `/portfolio` and cannot see trading controls on a profile.
- Cover at least one viewport narrower than desktop for global navigation and primary interactions after the desktop suite is stable.

## Delivery order

1. Add guarded fixtures and auth setup to the existing Playwright suite; prove `/login` and `/players` run locally with `npm run test:e2e`.
2. Add one spec per page, starting with read-only catalog/profile/ranking/comparison, then portfolio/history.
3. Add the isolated buy/sell journey and redirect/role checks.
4. Let the existing CI E2E job run when the first `tests/e2e/*.spec.ts` file lands; verify its migration, build, browser installation, test run, and report upload. Update `README.md` only for new fixture or auth setup steps.

## Done when

- Every route in the page matrix has a passing browser check, and the investor journey verifies persisted server-side results across pages.
- Tests run from a clean database without scraper/network data, can be repeated without manual cleanup, and never mutate the developer database.
- CI runs the suite on pull requests; a failed run retains a trace or screenshot for diagnosis.
