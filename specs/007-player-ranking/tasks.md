# Tasks: Ranking de Jugadores por Valuación Activa

**Input**: Design documents from `specs/007-player-ranking/`  
**Branch**: `feature/007-player-ranking`  
**Base**: `feature/006-operation-history`  
**Scope**: MVP backend autenticado; ranking read-only basado en la versión
activa, sin UI, cache, scheduler, dependencias ni migraciones nuevas.

## Phase 1: Foundation and shared validation

**Purpose**: Preparar los tipos y schemas compartidos sin cambiar el contrato
existente del catálogo.

- [x] T001 Revisar `src/backend/db/schema.ts`, las migraciones vigentes y
  `specs/007-player-ranking/data-model.md` para confirmar que las tablas,
  constraints y relaciones existentes cubren el ranking; documentar que no se
  crea migración nueva.
- [x] T002 [P] Escribir tests de `playerFiltersSchema` y del schema de ranking
  en `tests/unit/schemas/player-ranking.schema.spec.ts` para enums válidos,
  `team.trim()`, equipo vacío, defaults de `page`/`limit`, límites inválidos y
  rechazo de parámetros desconocidos.
- [x] T003 Implementar `playerFiltersSchema` en
  `src/backend/schemas/player.schema.ts` y hacer que
  `playerCatalogQuerySchema` lo extienda conservando su comportamiento actual.
- [x] T004 Implementar `src/backend/schemas/player-ranking.schema.ts` usando
  el schema de filtros compartido, paginación `page`/`limit` y `.strict()`.
- [x] T005 [P] Crear los tipos de criterios, fila de lectura y resultado del
  ranking en `src/backend/services/player-ranking.types.ts`, sin crear una
  entidad persistida.

**Checkpoint**: Los parámetros comunes no están duplicados, el ranking tiene
validación estricta y el esquema de datos no requiere migración.

---

## Phase 2: User Story 1 - Consultar el ranking activo (Priority: P1) 🎯 MVP

**Goal**: Obtener una entrada por jugador usando la última cotización de la
versión activa, ordenada por score y desempates deterministas.

**Independent Test**: Con dos versiones y varias quotes por jugador,
`GET /api/players/ranking` devuelve únicamente la última quote de la versión
activa y mantiene el orden esperado.

### Tests for User Story 1

- [x] T006 [P] [US1] Escribir el test de integración de
  `tests/integration/player-ranking.repository.spec.ts` para seleccionar la
  última quote por `calculatedAt DESC, id DESC`, excluir la versión inactiva y
  devolver una sola entrada por jugador.
- [x] T007 [P] [US1] Escribir tests unitarios en
  `tests/unit/services/player-ranking.service.spec.ts` para capturar una única
  estrategia activa, pasar su `strategyVersionId`, lanzar `ConflictError` si
  no existe y no invocar `ValuationEngine` ni operaciones de escritura.
- [x] T008 [P] [US1] Escribir tests unitarios en
  `tests/unit/controllers/player-ranking.controller.spec.ts` para verificar el
  DTO mínimo, estrategia/version, `rank` y omisión de `individualScore`,
  `teamScore` y `explanation`.

### Implementation for User Story 1

- [x] T009 Implementar `PlayerRankingRepository.findRankedPlayers` en
  `src/backend/repositories/player-ranking.repository.ts` con una subconsulta
  o CTE de PostgreSQL que deduplica por `player_id`, filtra por
  `strategyVersionId` y selecciona la quote más reciente.
- [x] T010 Extender `PlayerRankingRepository` con filtros de jugador, orden
  `finalScore DESC`, `quoteValue DESC`, `name ASC`, `id ASC`, conteo del
  conjunto deduplicado y `LIMIT/OFFSET` en
  `src/backend/repositories/player-ranking.repository.ts`.
- [x] T011 Implementar `PlayerRankingService` en
  `src/backend/services/player-ranking.service.ts` reutilizando
  `ValuationRepository.findActiveStrategyVersion()`, propagando `409` cuando
  no haya estrategia y calculando el rank global de cada elemento.
- [x] T012 Implementar `PlayerRankingController` en
  `src/backend/controllers/player-ranking.controller.ts` para delegar al
  service y serializar la proyección mínima del contrato.

**Checkpoint**: El service y el read repository producen un ranking correcto
en memoria/DB, sin endpoint ni documentación todavía.

---

## Phase 3: User Story 2 - Filtrar y paginar el ranking (Priority: P1)

**Goal**: Consultar subconjuntos por liga, equipo y posición conservando el
orden global, el total y el rank de la página.

**Independent Test**: Con jugadores de varias ligas/equipos/posiciones,
consultas combinadas devuelven solo el subconjunto solicitado y una paginación
consistente.

### Tests for User Story 2

- [x] T013 [P] [US2] Agregar a
  `tests/integration/player-ranking.repository.spec.ts` casos de filtros
  combinados, coincidencia parcial de equipo sin distinguir mayúsculas,
  conteo después de deduplicar, `LIMIT/OFFSET` y orden global.
- [x] T014 [P] [US2] Agregar a
  `tests/unit/services/player-ranking.service.spec.ts` casos de rank global en
  páginas posteriores y `totalPages=0` cuando `total=0`.
- [x] T015 [P] [US2] Agregar a
  `tests/unit/schemas/player-ranking.schema.spec.ts` casos de filtros válidos,
  parámetros repetidos según el comportamiento del request y valores fuera de
  rango.

### Implementation for User Story 2

- [x] T016 Implementar en `src/backend/repositories/player-ranking.repository.ts`
  la construcción de condiciones para `league`, `team` normalizado y
  `position`, reutilizando los enums existentes y sin reutilizar una
  paginación previa del catálogo.
- [x] T017 Completar en `src/backend/services/player-ranking.service.ts` los
  metadatos `total`, `page`, `limit` y `totalPages`, usando `0` cuando no haya
  resultados.
- [x] T018 Verificar con tests que la selección, orden y paginación ocurren en
  PostgreSQL antes de mapear la respuesta, sin cargar el catálogo completo en
  memoria.

**Checkpoint**: El ranking filtrado y paginado funciona con la misma versión
activa y conserva ranks globales deterministas.

---

## Phase 4: User Story 3 - Autenticación y estados de valuación (Priority: P1)

**Goal**: Exponer el endpoint autenticado con errores claros para JWT inválido
y ausencia de estrategia activa, diferenciando ranking vacío de configuración
inexistente.

**Independent Test**: Requests sin JWT, con query inválido, sin estrategia y
con estrategia sin quotes reciben `401`, `400`, `409` y `200` vacío
respectivamente.

### Tests for User Story 3

- [x] T019 [P] [US3] Escribir tests de route en
  `tests/integration/player-ranking.routes.spec.ts` para `401` sin/contra JWT
  inválido, `400` por query inválido o desconocido, `409` sin estrategia y
  `200` con `players: []`/`totalPages: 0`.
- [x] T020 [P] [US3] Agregar al test de integración del repositorio el caso de
  jugadores sin quote para la versión activa y verificar que no se les asigna
  una cotización por defecto.

### Implementation for User Story 3

- [x] T021 Implementar `GET` en `src/app/api/players/ranking/route.ts` con
  `requireAuth`, lectura del query, validación estricta, delegación al
  controller y `toHttpResponse`.
- [x] T022 Verificar que `ConflictError`, `BadRequestError` y
  `UnauthorizedError` existentes produzcan los statuses del contrato sin
  modificar el manejo global de errores.

**Checkpoint**: El endpoint funciona de extremo a extremo con autenticación,
validación y estados de datos completos, vacíos o inexistentes.

---

## Phase 5: API documentation and final validation

**Purpose**: Sincronizar contratos, quickstart y validar toda la feature.

- [x] T023 [P] Actualizar `specs/007-player-ranking/contracts/ranking.yaml`
  si la implementación final ajusta nombres, tipos, seguridad o respuestas.
- [x] T024 Actualizar `specs/001-player-token-marketplace/contracts/openapi.yaml`
  con `/players/ranking`, Bearer security, parámetros, schemas de ranking y
  errores `400`, `401`, `409` y `500`.
- [x] T025 [P] Verificar `specs/007-player-ranking/quickstart.md` contra el
  endpoint implementado, incluyendo JWT, filtros, ranking vacío y comandos de
  test.
- [x] T026 Ejecutar tests unitarios y de route dirigidos, luego la suite
  completa de Vitest; ejecutar la integración PostgreSQL con
  `RUN_DB_INTEGRATION_TESTS=true` cuando el entorno esté disponible.
- [x] T027 Ejecutar lint dirigido, `npx tsc --noEmit`, `npm run build` y
  `git diff --check`; confirmar que no se agregaron migraciones, dependencias,
  UI, recalculación ni funcionalidades fuera del MVP.
- [x] T028 [P] Extraer `toPagination` a
  `src/backend/utils/pagination.ts`, reutilizarlo en catálogo y ranking, y
  cubrirlo en `tests/unit/utils/pagination.spec.ts`.

**Checkpoint final**: La ruta, persistencia read-only, tests, OpenAPI y
quickstart están sincronizados y verificables.

---

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 bloquea todas las user stories porque define filtros, tipos y
  validación.
- US1 depende de T001–T005 y establece el read model base del ranking.
- US2 depende de T009–T012 porque extiende la consulta con filtros y
  paginación.
- US3 depende de T004, T011 y T012 para conectar validación, errores y route.
- Phase 5 depende de la implementación y tests de US1–US3.

### Parallel opportunities

- T002 y T005 pueden ejecutarse en paralelo.
- T006, T007 y T008 pueden escribirse en paralelo antes de T009–T012.
- T013, T014 y T015 pueden ejecutarse en paralelo después de la base de US1.
- T019 y T020 pueden ejecutarse en paralelo.
- T023 y T025 pueden ejecutarse en paralelo una vez fijado el DTO final.

### Implementation strategy

1. Completar Phase 1 y validar schemas.
2. Implementar US1 y detenerse en su checkpoint para validar la selección de
   versión y latest quote.
3. Agregar US2 para filtros, orden y paginación.
4. Agregar US3 para route, autenticación y estados HTTP.
5. Sincronizar OpenAPI, quickstart y ejecutar validación final.

## Out of scope checklist

- No crear migraciones ni modificar `src/backend/db/schema.ts`.
- No modificar `ValuationEngine`, `QuoteRecalculationService` ni activación de
  estrategias.
- No agregar nuevas estrategias, comparación histórica ni selección manual de
  estrategia.
- No agregar cache, scheduler, adapters externos ni consultas a proveedores.
- No construir componentes frontend ni hooks de UI.
- No agregar filtros de score, fecha, estadísticas, PnL o portfolio.
