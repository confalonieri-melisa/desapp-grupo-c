# Tasks: Consulta de Cotizaciones Actuales e Históricas

**Input**: Design documents from `specs/004-player-quote-queries/`  
**Branch**: `feature/004-player-quote-queries`  
**Scope**: MVP backend read-only; no UI, pagination, range filters, new
tables, migrations or recalculation.

## Phase 1: Foundation and persistence compatibility

**Purpose**: Confirm the existing valuation persistence is sufficient and
prepare shared validation/error behavior without ampliar el esquema.

- [x] T001 Revisar `src/backend/db/schema.ts` y la migración `0003_secret_luckman.sql` para verificar que `player_quotes`, `valuation_strategy_versions` y el índice `(player_id, calculated_at)` cubren la consulta; documentar explícitamente que no se crea migración nueva en `specs/004-player-quote-queries/data-model.md`.
- [x] T002 [P] Escribir tests de validación de parámetros en `tests/unit/schemas/player-quotes.schema.spec.ts` para UUID válido, UUID inválido, fecha `YYYY-MM-DD` válida, fechas imposibles, fecha con hora y fecha vacía.
- [x] T003 Implementar los schemas de request en `src/backend/schemas/player-quotes.schema.ts`, reutilizando `playerParamsSchema` si corresponde y validando estrictamente el parámetro opcional `date`.
- [x] T004 [P] Agregar tests de serialización de códigos de error en `tests/unit/errors/to-http-response.spec.ts` sin romper las respuestas existentes.
- [x] T005 Implementar códigos de error estables para `INVALID_PLAYER_ID`, `INVALID_DATE`, `PLAYER_NOT_FOUND` y `QUOTE_NOT_AVAILABLE` en `src/backend/errors/http.error.ts` y `src/backend/errors/to-http-response.ts`.

**Checkpoint**: Los parámetros y errores de la feature tienen contrato verificable y el esquema de persistencia existente fue validado sin generar migraciones.

---

## Phase 2: User Story 1 - Historial y cotización actual (Priority: P1) 🎯 MVP

**Goal**: Exponer el historial completo de cotizaciones persistidas, con la más
reciente primero; el primer elemento representa la cotización actual.

**Independent Test**: Un jugador con varias filas en `player_quotes` responde
`200` con todos sus registros ordenados por `calculated_at DESC, id DESC` y con
la estrategia/version histórica asociada.

### Tests for User Story 1

- [x] T006 [P] [US1] Escribir el test de integración de lectura histórica en `tests/integration/player-quotes.repository.spec.ts`, verificando orden descendente, desempate por `id`, join de `strategyCode`/`version` y conservación de scores, unidad y explicación.
- [x] T007 [P] [US1] Escribir tests unitarios de `PlayerQuotesService` en `tests/unit/services/player-quotes.service.spec.ts` para jugador inexistente, historial vacío y devolución de todos los registros sin invocar `ValuationEngine`.
- [x] T008 [P] [US1] Escribir tests de ruta en `tests/integration/player-quotes.routes.spec.ts` para `401`, `200` con historial, `200` con `items: []`, `404 PLAYER_NOT_FOUND` y acceso válido de `INVESTOR` y `SUPERUSER`.

### Implementation for User Story 1

- [x] T009 Implementar en `src/backend/repositories/valuation.repository.ts` la lectura de cotizaciones por jugador, unida a `valuation_strategy_versions` y ordenada por `calculatedAt DESC, id DESC`, sin modificar `saveQuote`.
- [x] T010 Implementar `src/backend/services/player-quotes.service.ts` para verificar la existencia del jugador, consultar el historial y distinguir jugador inexistente de historial vacío.
- [x] T011 Implementar `src/backend/controllers/player-quotes.controller.ts` para mapear numeric strings de PostgreSQL a números y proyectar la explicación persistida dentro de `score.components`.
- [x] T012 Implementar `src/app/api/players/[id]/quotes/route.ts` con `requireAuth`, validación Zod, delegación al controller y manejo mediante `toHttpResponse`.

**Checkpoint**: `GET /api/players/{id}/quotes` sin `date` funciona de extremo a extremo y devuelve la cotización actual como primer elemento.

---

## Phase 3: User Story 2 - Cotización a una fecha (Priority: P1)

**Goal**: Resolver la última cotización disponible anterior o igual a una fecha
solicitada, sin seleccionar cotizaciones posteriores ni recalcular.

**Independent Test**: Con cotizaciones en varias fechas, `?date=YYYY-MM-DD`
devuelve un único elemento correspondiente a la última cotización elegible.

### Tests for User Story 2

- [x] T013 [P] [US2] Agregar tests de selección temporal en `tests/unit/services/player-quotes.service.spec.ts` para fecha coincidente, fecha anterior a todo el historial, fecha futura y ausencia de candidato con `QUOTE_NOT_AVAILABLE`.
- [x] T014 [P] [US2] Agregar tests de integración de límite temporal en `tests/integration/player-quotes.repository.spec.ts`, verificando que el repositorio use el inicio del día siguiente UTC como límite exclusivo y `LIMIT 1`.
- [x] T015 [P] [US2] Agregar tests de ruta en `tests/integration/player-quotes.routes.spec.ts` para `200` con un único elemento, `400 INVALID_DATE`, `404 QUOTE_NOT_AVAILABLE` y rechazo de fechas posteriores al criterio solicitado.

### Implementation for User Story 2

- [x] T016 Extender `src/backend/repositories/valuation.repository.ts` con la lectura `findLatestByPlayerIdOnOrBefore`, aplicando el límite temporal, el mismo orden estable y el join de estrategia/version.
- [x] T017 Extender `src/backend/services/player-quotes.service.ts` para transformar `date` en límite UTC exclusivo, solicitar una sola cotización y lanzar `QUOTE_NOT_AVAILABLE` si no existe candidato.
- [x] T018 Extender `src/backend/controllers/player-quotes.controller.ts` y `src/app/api/players/[id]/quotes/route.ts` para devolver `{ items: [quote] }` cuando existe `date`, conservando el mismo DTO del historial.

**Checkpoint**: Las dos user stories funcionan sobre la misma ruta y comparten el contrato de cotización sin recalcular ni persistir datos.

---

## Phase 4: API documentation and validation

**Purpose**: Sincronizar documentación y validar la entrega completa.

- [x] T019 Actualizar `specs/001-player-token-marketplace/contracts/openapi.yaml` con `GET /players/{id}/quotes`, sus parámetros, esquemas `PlayerQuotesResponse`, `PlayerQuoteResponse` y `PlayerQuoteScore`, seguridad Bearer y errores definidos.
- [x] T020 Verificar que `src/app/api/docs/route.ts` siga cargando correctamente el OpenAPI principal y que el contrato documente la unidad persistida `CREDIT_PER_TOKEN`.
- [x] T021 Actualizar `specs/004-player-quote-queries/quickstart.md` si el contrato final difiere del ejemplo y verificar manualmente los comandos de historial y consulta por fecha.
- [x] T022 Ejecutar `npm test -- --run`, incluyendo integración PostgreSQL con `RUN_DB_INTEGRATION_TESTS=true` cuando el entorno esté disponible; corregir solo fallos pertenecientes a esta feature.
- [x] T023 Ejecutar `npm run lint` y `npm run build`; verificar `git diff --check` y confirmar que no se agregaron migraciones, dependencias, UI ni funcionalidades fuera del MVP.

**Checkpoint final**: La ruta, tests, OpenAPI y quickstart están sincronizados; el build y lint pasan.

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 bloquea las user stories porque define validación y errores compartidos.
- US1 depende de T001–T005 y debe establecer la lectura histórica base.
- US2 depende de US1 porque reutiliza el repositorio, servicio, controller y
  DTO de cotización.
- Phase 4 depende de ambas user stories implementadas.

### Parallel opportunities

- T002 y T004 pueden ejecutarse en paralelo.
- T006, T007 y T008 pueden escribirse en paralelo antes de la implementación
  de US1.
- T013, T014 y T015 pueden escribirse en paralelo antes de la implementación
  de US2.
- T019 y T021 pueden prepararse en paralelo una vez fijado el DTO final.

## Out of scope checklist

- No crear migración ni modificar `src/backend/db/schema.ts`.
- No agregar endpoint singular `/quote`.
- No agregar paginación, filtros de rango u orden configurable.
- No modificar `QuoteRecalculationService` ni `ValuationEngine`.
- No llamar WhoScored, football-data.org ni otros adapters.
- No modificar componentes frontend en esta feature.
