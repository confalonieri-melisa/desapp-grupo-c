# Tasks: Ofertas P2P a Precio Fijo

**Input**: Design documents from `/specs/017-p2p-fixed-offers/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/p2p.yaml](./contracts/p2p.yaml)

**Organization**: Tasks are grouped by user story. User Stories 1 and 2 form the MVP; User Story 3 is a subsequent P2 increment.

**Layer rule**: Route/controller adaptan HTTP; services coordinan; dominio aplica invariantes; repositories solo leen, escriben, bloquean y administran el contexto transaccional. Los nombres públicos usan vocabulario de negocio y no exponen SQL, locks, filas, ORM ni métodos de bajo nivel.

## Phase 1: Setup

**Purpose**: Preparar la estructura mínima sin agregar infraestructura nueva.

- [X] T001 Confirmar que la implementación parte de `main` en `feature/017-p2p-fixed-offers`, documentar el vocabulario de negocio (`publicarOferta`, `aceptarOferta`, `cancelarOferta`, `registrarOperacion`) y registrar el alcance MVP en `specs/017-p2p-fixed-offers/plan.md`
- [X] T002 [P] Preparar fixtures reutilizables de dos inversores, jugador, tenencias y saldo para P2P en `tests/fixtures/p2p-offers.ts`

## Phase 2: Foundational

**Purpose**: Crear contratos de dominio y persistencia que bloquean las historias de usuario.

- [X] T003 [P] Implementar `P2POffer` con estados `OPEN`, `FILLED`, `CANCELLED`, cantidad entera positiva, precio positivo de hasta dos decimales y transiciones válidas en `src/backend/models/P2POffer.ts`
- [X] T004 [P] Agregar tests unitarios de creación, validación y transiciones de `P2POffer` en `tests/unit/models/p2p-offer.spec.ts`
- [X] T005 [P] Extender `MarketOperation` y `FinancialAuditRecord` para representar comprador, vendedor, oferta, operación P2P y snapshots `buyer/seller`, preservando las operaciones centrales en `src/backend/models/MarketOperation.ts` y `src/backend/models/FinancialAuditRecord.ts`
- [X] T006 [P] Cubrir las invariantes de operación única P2P, acción `P2P_TRADE` y snapshots de comprador/vendedor en `tests/unit/models/market-operation.spec.ts` y `tests/unit/models/financial-audit-record.spec.ts`
- [X] T007 Agregar `p2p_offers`, campos P2P opcionales en `market_operations`, `quote_id` nullable para P2P y acción de auditoría `P2P_TRADE` en `src/backend/db/schema.ts` y `src/backend/db/migrations/0008_p2p_fixed_offers.sql`
- [X] T008 [P] Implementar los mapeos y operaciones de persistencia de ofertas —crear, listar abiertas, cargar con lock y cancelar— sin reglas de transferencia en `src/backend/repositories/p2p-offer.repository.ts`
- [X] T009 Implementar en `src/backend/repositories/market.repository.ts` el contexto transaccional interno y las operaciones de persistencia con nombres de negocio (`findTradeParticipants`, `findTradeHoldings`, `recordCompletedTrade`, `recordFinancialTransition`), sin invocar dominio ni coordinar el caso de uso
- [ ] T010 Agregar tests de integración de migración, unicidad de `offer_id`, estados y primitivas transaccionales en `tests/integration/p2p-offers.repository.spec.ts`

**Checkpoint**: Los modelos y repositories exponen contratos suficientes; ningún repository coordina una operación completa.

## Phase 3: User Story 1 - Publicar y consultar ofertas (Priority: P1) 🎯 MVP

**Goal**: Un vendedor autenticado puede publicar una oferta válida y otros inversores pueden consultar ofertas abiertas.

**Independent Test**: Crear una oferta con una tenencia existente, consultarla como otro usuario y comprobar que conserva jugador, cantidad, precio, vendedor y estado `OPEN`.

### Tests for User Story 1

- [X] T011 [P] [US1] Agregar schemas estrictos para crear y listar ofertas, incluyendo `playerId`, `quantity`, `unitPrice` y filtro opcional, en `src/backend/schemas/p2p-offer.schema.ts` y sus tests en `tests/unit/schemas/p2p-offer.schema.spec.ts`
- [X] T012 [P] [US1] Escribir tests unitarios del service para validar identidad autenticada, existencia del jugador, tenencia suficiente y creación/listado en `tests/unit/services/p2p-offer.service.spec.ts`
- [X] T013 [P] [US1] Escribir tests de contrato/ruta para `POST /api/p2p/offers` y `GET /api/p2p/offers` en `tests/integration/p2p-offers.routes.spec.ts`

### Implementation for User Story 1

- [X] T014 [US1] Implementar `P2POfferService.publishOffer` y `P2POfferService.findAvailableOffers` como coordinador entre schema, dominio y repositories en `src/backend/services/p2p-offer.service.ts`
- [X] T015 [US1] Implementar `P2POfferController` y las rutas autenticadas `POST/GET /api/p2p/offers` en `src/backend/controllers/p2p-offer.controller.ts` y `src/app/api/p2p/offers/route.ts`
- [ ] T016 [US1] Implementar el cliente HTTP y el hook de estado de listado/publicación reutilizando autenticación y componentes de jugadores en `src/frontend/services/client/p2p-offer.service.ts` y `src/frontend/features/p2p/hooks/useP2POffers.ts`
- [ ] T017 [US1] Completar la integración de publicación y listado en la interfaz existente, sin duplicar portfolio ni cotizaciones, en `src/frontend/features/p2p/components/P2POfferPanel.tsx`, `src/frontend/features/p2p/components/P2POfferList.tsx` y `tests/unit/features/p2p/P2POfferPanel.spec.tsx`

**Checkpoint**: US1 queda demostrable sin aceptar operaciones: publicar, listar y validar ofertas abiertas.

## Phase 4: User Story 2 - Aceptar una oferta completa (Priority: P1) 🎯 MVP

**Goal**: Un comprador autenticado acepta una oferta completa y transfiere tokens/créditos de forma atómica e idempotente.

**Independent Test**: Con dos inversores y una oferta abierta, aceptar una vez y repetir el mismo request; debe existir una sola transferencia, la oferta debe quedar `FILLED` y ambos historiales deben mostrar el mismo `operationId`.

### Tests for User Story 2

- [X] T018 [P] [US2] Escribir tests unitarios de `P2PTrade.complete` para saldo, tenencia, precio fijo, comprador distinto y snapshots buyer/seller en `tests/unit/models/p2p-trade.spec.ts`
- [X] T019 [P] [US2] Escribir tests unitarios de `P2PTradeService` para coordinación service→domain→repositories, idempotencia compatible/incompatible y ocultamiento del saldo del vendedor en `tests/unit/services/p2p-trade.service.spec.ts`
- [X] T020 [P] [US2] Escribir tests de integración para aceptación atómica, doble aceptación concurrente, rollback y conservación de emisión en `tests/integration/p2p-trade.repository.spec.ts`
- [ ] T021 [P] [US2] Escribir tests de ruta para autenticación, saldo/tenencia insuficiente, propia oferta, `Idempotency-Key` y respuesta 201 en `tests/integration/p2p-offers.routes.spec.ts`

### Implementation for User Story 2

- [X] T022 [US2] Implementar `P2PTrade` como modelo puro que componga `User.debit/credit` y `TokenHolding.buy/sell`, sin importar repositories ni infraestructura, en `src/backend/models/P2PTrade.ts`
- [X] T023 [US2] Implementar `P2PTradeService.completeOffer` para coordinar participantes/tenencias solicitados a repositories, ejecutar `P2PTrade`, completar la oferta, registrar operación/transición y reconstruir el replay desde la auditoría en `src/backend/services/p2p-trade.service.ts`
- [X] T024 [US2] Implementar controller y route `POST /api/p2p/offers/[id]/accept`, propagando `Idempotency-Key` y `correlationId` al service en `src/backend/controllers/p2p-offer.controller.ts` y `src/app/api/p2p/offers/[id]/accept/route.ts`
- [X] T025 [US2] Ampliar la consulta de historial para filtrar por comprador o vendedor y proyectar `BUY`/`SELL` según el usuario, preservando el mismo `operationId`, en `src/backend/repositories/market.repository.ts`, `src/backend/services/market-operation.service.ts` y `src/backend/controllers/market-operation.controller.ts`
- [ ] T026 [US2] Actualizar el contrato y cliente de historial para mostrar contraparte, oferta y precio P2P sin exponer balances ajenos en `specs/006-operation-history/contracts/transactions.yaml`, `src/frontend/services/client/transaction-history.service.ts` y `src/frontend/features/history/`
- [ ] T027 [US2] Integrar aceptación, recibo, refresco de portfolio e historial en la interfaz P2P reutilizando los hooks y eventos existentes en `src/frontend/features/p2p/hooks/useP2POffers.ts`, `src/frontend/features/p2p/components/P2POfferList.tsx` y `src/frontend/services/client/portfolio-events.ts`
- [ ] T028 [US2] Agregar prueba E2E del flujo vendedor→listado→comprador→aceptación→historial en `tests/e2e/p2p-trading-journey.spec.ts`

**Checkpoint**: El MVP principal queda completo con publicación, consulta y aceptación idempotente sin alterar el mercado central.

## Phase 5: User Story 3 - Gestionar ofertas propias (Priority: P2)

**Goal**: El vendedor puede consultar/cancelar sus ofertas abiertas y una oferta cerrada no puede reutilizarse.

**Independent Test**: Publicar una oferta, cancelarla como vendedor y comprobar que desaparece del listado abierto y no puede aceptarse.

### Tests for User Story 3

- [ ] T029 [P] [US3] Agregar tests unitarios de autorización y cancelación en `tests/unit/services/p2p-offer.service.spec.ts`
- [ ] T030 [P] [US3] Agregar tests de ruta para cancelar propia, rechazar oferta ajena y rechazar oferta ya cerrada en `tests/integration/p2p-offers.routes.spec.ts`

### Implementation for User Story 3

- [X] T031 [US3] Implementar `P2POfferService.cancelOffer` y consulta de ofertas propias usando `P2POffer.cancel`, sin tocar saldos ni tenencias, en `src/backend/services/p2p-offer.service.ts`
- [X] T032 [US3] Implementar `DELETE /api/p2p/offers/[id]` en `src/app/api/p2p/offers/[id]/route.ts` y mapear autorización/estado a errores existentes en `src/backend/controllers/p2p-offer.controller.ts`
- [ ] T033 [US3] Agregar acciones de cancelar y consulta de ofertas propias en la interfaz P2P reutilizando el cliente y estado de US1 en `src/frontend/features/p2p/hooks/useP2POffers.ts` y `src/frontend/features/p2p/components/P2POfferPanel.tsx`

**Checkpoint**: US3 completa la gestión mínima del ciclo de vida sin agregar expiración automática.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificar compatibilidad, documentación pública y calidad sin ampliar el alcance.

- [ ] T034 [P] Actualizar la especificación OpenAPI agregada y la colección Postman con los endpoints P2P en `specs/001-player-token-marketplace/contracts/openapi.yaml` y `specs/001-player-token-marketplace/contracts/postman_collection.json`
- [ ] T035 [P] Mantener observabilidad y correlation IDs existentes en las rutas P2P, sin registrar credenciales ni payloads sensibles, en `src/backend/observability/request-observation.ts`
- [ ] T036 Ejecutar los escenarios de [quickstart.md](./quickstart.md), incluyendo regresión de compra/venta central, en `specs/017-p2p-fixed-offers/quickstart.md`
- [ ] T037 Ejecutar lint, build y suites unitarias/integración/E2E aplicables y corregir solo regresiones introducidas por la feature en `package.json`, `tests/` y `src/`

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all stories.
- **US1 (Phase 3)**: Depends on Foundational and delivers the offer/listing slice.
- **US2 (Phase 4)**: Depends on Foundational and on the offer contract/model from US1; US1 + US2 are the MVP.
- **US3 (Phase 5)**: Depends on US1 and the offer lifecycle from US2.
- **Polish (Phase 6)**: Depends on the desired MVP stories being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on US2 or US3.
- **US2 (P1)**: Uses the offer created by US1, but its settlement and tests are independently verifiable with fixtures.
- **US3 (P2)**: Uses the offer lifecycle from US1 and the closed-state behavior from US2.

### Parallel Opportunities

- T003–T006 can run in parallel because they touch independent domain/model test files.
- T008–T009 can run in parallel after the schema design is fixed; both must finish before service coordination.
- T011–T013 can run in parallel as test-first work for US1.
- T018–T021 can run in parallel as test-first work for US2.
- T029–T030 can run in parallel as test-first work for US3.
- T034–T035 can run in parallel with each other after the public routes stabilize.

## Parallel Example: MVP

```text
Después de Phase 2:

Track A: T011 -> T014 -> T015   (schemas, service y API de ofertas)
Track B: T012 -> T016 -> T017   (tests unitarios y UI de publicar/listar)
Track C: T013                  (tests de rutas de US1)

Luego de cerrar US1:

Track A: T018 -> T022 -> T023 -> T024   (dominio, service y API de aceptación)
Track B: T019 -> T025 -> T026           (idempotencia e historial)
Track C: T020 -> T021 -> T028           (integración, rutas y E2E)
```

## Implementation Strategy

### MVP First

1. Completar Phase 1 y Phase 2.
2. Completar US1: publicar y listar ofertas.
3. Validar US1 de forma independiente.
4. Completar US2: aceptación completa, atómica e idempotente.
5. Validar el flujo completo y la regresión central.
6. Detenerse aquí si el objetivo es únicamente el MVP; US3 es un incremento posterior.

### Incremental Delivery

1. Phase 1 + Phase 2: contratos y persistencia listos.
2. US1: oferta visible y validada.
3. US2: transferencia P2P usable y auditable.
4. US3: cancelación y gestión de ofertas propias.
5. Polish: documentación y verificación final.

## Notes

- Todas las tareas siguen el formato de checklist, tienen ID secuencial, labels de story cuando corresponde y path concreto.
- El service es el único coordinador del caso de uso; ningún task habilita que un repository invoque dominio o controle el flujo.
- No se agregan tareas de matching, escrow, reservas, compras parciales, vencimientos, comisiones ni reemplazo del mercado central.
