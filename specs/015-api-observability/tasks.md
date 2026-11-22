---
description: "Task list for operational observability MVP"
---

# Tasks: Observabilidad operativa del marketplace

**Input**: Design documents from `/specs/015-api-observability/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/`, `quickstart.md`

**Organization**: Tasks are grouped by user story. The MVP includes all four
stories because each one maps to an explicit observability capability; Redis,
external cache, persistence and external monitoring remain out of scope.

## Phase 1: Setup

**Purpose**: Confirm the existing API surface and prepare only the files needed
for the observability slice.

- [ ] T001 [P] Confirm the route list under `src/app/api` and map each published route to the common observability wrapper in `specs/015-api-observability/plan.md`.
- [ ] T002 [P] Confirm that `specs/015-api-observability/contracts/observability.yaml` is the source contract for the four new endpoints and record any compatibility notes needed before updating `specs/001-player-token-marketplace/contracts/openapi.yaml`.

---

## Phase 2: Foundational

**Purpose**: Build the smallest shared observability primitives required by all
user stories. No database schema, Redis client, cache abstraction or external
logging service is introduced.

- [ ] T003 [P] Add unit tests for in-memory counters, duration aggregation, secret redaction and correlation ID generation in `tests/unit/observability/observability.test.ts`.
- [ ] T004 Implement the in-memory HTTP metrics state, reset helper for tests and Prometheus text serialization in `src/backend/observability/metrics.ts`.
- [ ] T005 Implement structured JSON audit logging and parameter sanitization for passwords, access tokens and secret fields in `src/backend/observability/logger.ts`.
- [ ] T006 Implement the common request wrapper that assigns or propagates `x-correlation-id`, measures duration, captures status and invokes metrics/logging without changing the route response in `src/backend/observability/request-observability.ts`.
- [ ] T007 Update the shared response/error path only as needed so unexpected route failures are recorded as `5xx` while existing known error responses remain unchanged in `src/backend/errors/to-http-response.ts` and the wrapper integration points.

**Checkpoint**: The shared observability primitives can be tested without
PostgreSQL and are ready to be attached to routes.

---

## Phase 3: User Story 1 - Auditar la ejecución de los servicios (Priority: P1) 🎯 MVP

**Goal**: Every published REST route emits a structured audit event with actor,
operation, sanitized parameters, status, duration and correlation ID.

**Independent Test**: Execute successful, anonymous, authenticated and failing
requests against representative routes and verify the emitted JSON events and
response correlation IDs without exposing secrets.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add route-level audit tests for anonymous and authenticated requests, redacted credentials, `4xx` responses and response correlation IDs in `tests/integration/observability.routes.spec.ts`.

### Implementation for User Story 1

- [ ] T009 [US1] Wrap every handler under `src/app/api` with the common request observability helper, preserving the existing controller/service calls and route-specific authentication behavior.
- [ ] T010 [US1] Extract the authenticated user when available and collect query, path and body parameters through the wrapper without consuming the request body needed by existing handlers in `src/backend/observability/request-observability.ts`.
- [ ] T011 [US1] Verify that audit records use normalized route labels and never use full query values, tokens or user-specific values as metric labels in `src/backend/observability/logger.ts` and `src/backend/observability/metrics.ts`.

**Checkpoint**: All current REST services produce auditable events and preserve
their existing responses.

---

## Phase 4: User Story 2 - Consultar métricas operativas (Priority: P1) 🎯 MVP

**Goal**: Expose request counts, durations and `4xx`/`5xx` errors in a public
Prometheus-compatible endpoint.

**Independent Test**: Execute multiple successful and failing API requests,
call `/api/metrics`, and verify the output contains the expected aggregates.

### Tests for User Story 2

- [ ] T012 [P] [US2] Add endpoint tests for Prometheus content type, request/status labels, error counters, duration aggregates and non-recursive metrics collection in `tests/integration/observability.routes.spec.ts`.

### Implementation for User Story 2

- [ ] T013 [US2] Add the public `GET /api/metrics` route using `src/app/api/metrics/route.ts` and expose the serialized snapshot from `src/backend/observability/metrics.ts` without authentication.
- [ ] T014 [US2] Add the required Prometheus metric names and stable labels for method, normalized operation and status in `src/backend/observability/metrics.ts`.

**Checkpoint**: Operational traffic, duration and error metrics are queryable
without Redis, Prometheus deployment or database persistence.

---

## Phase 5: User Story 3 - Verificar disponibilidad de la aplicación (Priority: P1) 🎯 MVP

**Goal**: Distinguish a live application from one that cannot use PostgreSQL.

**Independent Test**: Call liveness and readiness with PostgreSQL available and
simulate an unavailable database to verify `200` versus `503` behavior.

### Tests for User Story 3

- [ ] T015 [P] [US3] Add liveness and readiness route tests, including database failure behavior and public access, in `tests/integration/observability.routes.spec.ts`.

### Implementation for User Story 3

- [ ] T016 [US3] Extend `src/backend/controllers/health.controller.ts` with separate live and ready results, using a minimal PostgreSQL connectivity check only for readiness.
- [ ] T017 [US3] Add public `GET /api/health/live` and `GET /api/health/ready` handlers in `src/app/api/health/live/route.ts` and `src/app/api/health/ready/route.ts`, while preserving compatible behavior for `src/app/api/health/route.ts`.

**Checkpoint**: Platform availability and PostgreSQL readiness can be checked
without involving authentication, Redis or external providers.

---

## Phase 6: User Story 4 - Consultar métricas avanzadas del dominio (Priority: P2)

**Goal**: Expose a public aggregate summary of player count, active valuation
strategy and the latest quote recalculation available during the current run.

**Independent Test**: Query the endpoint with and without active strategy or
recalculation data and verify valid aggregate responses without user balances
or portfolio details.

### Tests for User Story 4

- [ ] T018 [P] [US4] Add advanced metrics route tests for active strategy, player count, missing strategy and missing recalculation states in `tests/integration/observability.routes.spec.ts`.

### Implementation for User Story 4

- [ ] T019 [US4] Add the minimal in-memory last-recalculation snapshot and update it from `src/backend/services/quote-recalculation.service.ts` without changing quote persistence or recalculation response behavior.
- [ ] T020 [US4] Implement the aggregate advanced metrics read in `src/backend/controllers/metrics.controller.ts` using existing player and valuation repositories, returning only technical or aggregate data.
- [ ] T021 [US4] Add public `GET /api/metrics/advanced` in `src/app/api/metrics/advanced/route.ts` and keep missing optional data explicit as `null`, absence or zero according to `specs/015-api-observability/contracts/observability.yaml`.

**Checkpoint**: The marketplace exposes current aggregate operational state
without introducing a new domain entity or persisted metric history.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete MVP and keep public documentation aligned.

- [ ] T022 [P] Update the public OpenAPI/Swagger document and any relevant request collection examples for the four observability endpoints in `specs/001-player-token-marketplace/contracts/openapi.yaml` and `specs/001-player-token-marketplace/contracts/postman_collection.json`.
- [ ] T023 [P] Add or update focused unit coverage for edge cases in `tests/unit/observability/observability.test.ts`, including absent correlation ID, secret redaction and metrics reset between tests.
- [ ] T024 Run the validation scenarios from `specs/015-api-observability/quickstart.md` and the applicable unit/integration suites; record no implementation of Redis, cache, migrations or external monitoring as part of this feature.
- [ ] T025 Run `npm run lint`, `npm test` and the relevant integration tests, then resolve only failures introduced by this feature without modifying unrelated existing behavior.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** has no implementation dependency and confirms the existing route surface.
- **Phase 2** depends on the existing application and blocks all user stories because every story uses the shared observability primitives.
- **Phase 3 (US1)** depends on Phase 2 and is the first end-to-end increment.
- **Phase 4 (US2)** depends on Phase 2 and the route instrumentation from US1 for meaningful request aggregates.
- **Phase 5 (US3)** depends on Phase 2 but can be implemented independently of US1 and US2.
- **Phase 6 (US4)** depends on existing player/valuation services and Phase 2; it does not require Redis or the cache work planned for a later feature.
- **Phase 7** depends on the desired user stories being complete.

### User Story Dependencies

- **US1**: Foundational only.
- **US2**: Foundational plus US1 route instrumentation.
- **US3**: Foundational only.
- **US4**: Foundational plus existing valuation/recalculation services.

### Parallel Opportunities

- T003 can run before T004/T005/T006 because it defines the shared behavior.
- T016 and T017 can be developed independently from US1 route instrumentation after Phase 2.
- T015 and T018 can be prepared in parallel because they target separate acceptance groups, although both use the shared integration test file and should be merged carefully.
- T002 and the focused unit test work can proceed in parallel with the foundational implementation when separate contributors are available.

## Parallel Example

```text
After Phase 2:

Developer A: US1 route wrapper integration (T008-T011)
Developer B: US3 health endpoints (T015-T017)
Developer C: OpenAPI contract updates (T022)

After US1 instrumentation:

Developer A: US2 metrics endpoint (T012-T014)
Developer B: US4 advanced metrics (T018-T021)
```

## Implementation Strategy

1. Complete the shared in-memory observability primitives.
2. Complete US1 and validate that all existing REST routes are audited.
3. Add US2 and US3, which together provide the minimum operational surface.
4. Add US4 because the advanced metrics endpoint is an explicit product
   requirement, while keeping it aggregate and non-persistent.
5. Run the quickstart and full applicable tests.
6. Stop: do not add Redis, cache, persistence, dashboards or external
   observability services in this feature.
