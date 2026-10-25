# Tasks: Historial de Operaciones Financieras

**Input**: Design documents from `specs/006-operation-history/`  
**Base branch**: `feature/005-player-token-trading`  
**Branch**: `feature/006-operation-history`  
**Scope**: Consulta autenticada, paginada y de solo lectura de las operaciones
persistidas del inversor.

## Reglas de ejecución

- La feature extiende el contexto de mercado existente; no crea un controller,
  service, repository ni modelo paralelo para el historial.
- Se reutilizan `MarketOperationController`, `MarketOperationService`,
  `MarketRepository` y `market-operation.schema.ts`.
- `market_operations` es la única fuente de verdad. No se reconstruyen
  operaciones desde holdings, portfolio, saldos, cotizaciones o auditoría.
- No se modifica `src/backend/models/MarketOperation.ts`: su constructor
  calcula `total`, mientras el historial debe devolver el valor persistido.
- No se agrega migración: el esquema, foreign keys e índice necesarios ya
  existen en la rama base.
- No se implementan frontend, filtros, exportaciones, permisos administrativos
  ni joins para enriquecer jugadores o cotizaciones.

## Phase 0: Preparación y verificación de alcance

- [ ] T001 — Confirmar branch y dependencias de la feature

- **Área**: Git y features previas.
- **Acción**: crear o verificar `feature/006-operation-history` a partir de
  `feature/005-player-token-trading`; confirmar que están disponibles
  `market_operations`, `MarketOperationController`,
  `MarketOperationService` y `MarketRepository`.
- **Verificación**: la branch base no se modifica y los archivos existentes se
  reutilizan en el plan.

- [ ] T002 — Confirmar que no corresponde migración

- **Archivos/áreas**: `src/backend/db/schema.ts`,
  `src/backend/db/migrations/*`, `specs/006-operation-history/data-model.md`.
- **Acción**: verificar que `market_operations` ya contiene todos los campos
  del contrato y que `idx_market_operations_investor_date` cubre la consulta.
- **Verificación**: no se generan archivos de migración ni cambios de schema;
  dejar documentado que esta feature es exclusivamente de lectura.

- [ ] T003 — Revisar contrato y casos de aceptación antes de codificar

- **Archivos**: `specs/006-operation-history/spec.md` y
  `specs/006-operation-history/plan.md`.
- **Acción**: confirmar ruta, estados HTTP, `auth.sub`, paginación, orden,
  `hasMore`, campos históricos y comportamiento `correlationId: null`.
- **Verificación**: cualquier implementación posterior puede trazarse a FR y
  escenarios de la especificación.

**Checkpoint 0**: El alcance está cerrado y no requiere nuevos objetos de
dominio ni cambios persistentes.

## Phase 1: User Story 1 — Consultar historial propio (P1)

**Goal**: Permitir que un inversor autenticado consulte sus operaciones de
compra y venta persistidas en una única colección, ordenadas cronológicamente y
con paginación simple.

**Independent Test**: Con operaciones de dos inversores, el usuario obtiene
solo las propias, ordenadas por fecha/id, con `items`, `limit`, `offset` y
`hasMore`.

### Tests y validación de entrada

- [ ] T004 [P] [US1] Agregar al schema existente en
  `src/backend/schemas/market-operation.schema.ts` la validación de `id`,
  `limit` y `offset`, con defaults `50` y `0`, máximo `100` y rechazo de
  valores inválidos.
- [ ] T005 [P] [US1] Extender
  `tests/unit/schemas/market-operation.schema.spec.ts` con UUID válido,
  defaults, límites, decimales, negativos, cero para `limit` y parámetros no
  numéricos.

### Lectura persistida

- [ ] T006 [US1] Extender `src/backend/repositories/market.repository.ts` con
  un método de lectura por `investorId` que seleccione únicamente las columnas
  de `market_operations`, ordene por `created_at DESC, id DESC` y solicite
  `limit + 1` filas.
- [ ] T007 [US1] Agregar
  `tests/integration/transaction-history.repository.spec.ts` para verificar
  lectura de operaciones de dos inversores, orden, empate por `id`, `offset`,
  límite y cálculo de la fila adicional.

### Servicio y respuesta de aplicación

- [ ] T008 [US1] Extender `src/backend/services/market-operation.service.ts`
  con `getHistory`, un tipo/interface local de respuesta y el mapeo de filas
  persistidas a `items`, `limit`, `offset` y `hasMore`; no instanciar
  `MarketOperation` para evitar recalcular `total`.
- [ ] T009 [US1] Extender
  `tests/unit/services/market-operation.service.spec.ts` para verificar
  proyección exacta, conservación de `quoteValue`/`total`, `correlationId`
  nulo e historial vacío sin acceder a portfolio ni cotizaciones.
- [ ] T010 [US1] Extender
  `src/backend/controllers/market-operation.controller.ts` con `getHistory`
  como delegación del caso de uso, sin agregar reglas de persistencia ni
  autorización HTTP duplicada.
- [ ] T011 [US1] Extender
  `tests/unit/controllers/market-operation.controller.spec.ts` para comprobar
  que `getHistory` delega los parámetros y devuelve la respuesta del servicio.

### Endpoint

- [ ] T012 [US1] Crear
  `src/app/api/users/[id]/transactions/route.ts` usando `requireAuth`, params
  dinámicos de App Router, el schema existente, `MarketOperationController` y
  `toHttpResponse`.
- [ ] T013 [US1] Agregar
  `tests/integration/transaction-history.routes.spec.ts` para `200` con
  operaciones, `200` con `items: []`, paginación y serialización del contrato.

**Checkpoint US1**: El endpoint devuelve el historial propio desde
`market_operations`, sin reconstrucción ni escrituras.

## Phase 2: User Story 2 — Respetar permisos del usuario autenticado (P1)

**Goal**: Impedir que un usuario consulte el historial asociado a otro `id`.

**Independent Test**: Un JWT de `user-A` obtiene su historial con `:id=user-A`
y recibe `403` con `:id=user-B`, sin ejecutar la consulta al repositorio.

- [ ] T014 [US2] Implementar en
  `src/backend/services/market-operation.service.ts` la comparación entre
  `:id` y `auth.sub` antes de llamar a `MarketRepository`; usar
  `ForbiddenError` para la discrepancia.
- [ ] T015 [US2] Agregar tests unitarios en
  `tests/unit/services/market-operation.service.spec.ts` para `:id` distinto,
  asegurando que el repository no sea invocado.
- [ ] T016 [US2] Completar
  `tests/integration/transaction-history.routes.spec.ts` con `401` para JWT
  ausente/inválido, `400` para UUID inválido y `403` para otro usuario.
- [ ] T017 [US2] Confirmar que el endpoint opera en el contexto de usuarios
  inversores sin agregar una rama especial para `SUPERUSER` ni permisos de
  consulta administrativa.

**Checkpoint US2**: La identidad del path no puede ampliar los permisos del
JWT y no se filtran operaciones ajenas.

## Phase 3: User Story 3 — Historial inmutable y de solo lectura (P1)

**Goal**: Garantizar que el listado refleje el hecho financiero persistido y no
cambie por modificaciones posteriores de holdings o cotizaciones.

**Independent Test**: Después de modificar la tenencia o crear una nueva quote,
la operación histórica conserva `type`, `quantity`, `quoteValue`, `total` y
`createdAt`.

- [ ] T018 [US3] Completar
  `tests/integration/transaction-history.repository.spec.ts` con cambios
  posteriores en `token_holdings` y `player_quotes`, verificando que la
  respuesta sigue proviniendo de `market_operations`.
- [ ] T019 [US3] Verificar en la misma suite de integración que una consulta
  exitosa no inserta, actualiza ni elimina filas de operaciones, auditoría,
  holdings, usuarios o cotizaciones.
- [ ] T020 [US3] Revisar que no se agreguen dependencias hacia
  `PortfolioRepository`, `PortfolioService`, `ValuationRepository` o
  `financial_audit_records` en la implementación del historial.

**Checkpoint US3**: El historial es una lectura estable del registro financiero
append-only y no altera ninguna fuente de verdad.

## Phase 4: Contrato API y cierre

- [ ] T021 [P] Actualizar
  `specs/001-player-token-marketplace/contracts/openapi.yaml` con
  `/users/{id}/transactions`, BearerAuth, parámetros, schemas y respuestas
  `200`, `400`, `401`, `403` y `500`.
- [ ] T022 [P] Mantener sincronizado
  `specs/006-operation-history/contracts/transactions.yaml` con la route y el
  DTO real, incluyendo `correlationId` nullable y `hasMore`.
- [ ] T023 [P] Actualizar
  `specs/006-operation-history/quickstart.md` con ejemplos de consulta propia,
  paginación y rechazo de un `id` ajeno.
- [ ] T024 Ejecutar `npm test -- --run` y confirmar que las suites existentes de
  mercado, portfolio y autenticación siguen verdes.
- [ ] T025 Ejecutar tests de integración con
  `RUN_DB_INTEGRATION_TESTS=true` cuando PostgreSQL esté disponible y registrar
  cualquier limitación ambiental sin ocultar fallos funcionales.
- [ ] T026 Ejecutar `npm run lint`, `npx tsc --noEmit`, `npm run build` y
  `git diff --check`.
- [ ] T027 Revisar el diff final contra `spec.md` y confirmar que no aparecen
  tablas, migraciones, entidades, controllers o services nuevos fuera de la
  route y la documentación/tests de esta feature.

**Checkpoint final**: endpoint implementado, tests completos, OpenAPI
sincronizado, quickstart verificable y alcance sin sobreingeniería.

## Dependencias y orden

```text
T001-T003
    -> T004-T005
    -> T006-T007
    -> T008-T011
    -> T012-T013
    -> T014-T017
    -> T018-T020
    -> T021-T027
```

T004 y T005 pueden prepararse en paralelo con T006 y T007 porque afectan
archivos y responsabilidades distintas. Las tareas de API dependen de que el
servicio y el repositorio estén definidos. La documentación final debe
validarse contra la implementación terminada.
