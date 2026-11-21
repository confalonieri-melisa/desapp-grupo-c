# Tasks: Mercado P2P de Tokens de Jugadores — Backend

**Input**: Design documents from `/specs/015-player-peer-market-backend/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Implementation rule**: Todas las tareas mantienen el MVP, reutilizan las
capas Controller → Service → Domain → Repository y no modifican componentes,
hooks ni servicios frontend.

## Phase 1: Preparación y aprobación de especificación

**Purpose**: Confirmar que los artefactos de diseño están aprobados antes de
modificar código o esquema.

- [ ] T001 Revisar y aprobar [spec.md](spec.md), confirmando los estados `OPEN`, `SOLD`, `CANCELLED`, reserva separada, endpoints y códigos HTTP; dependencia: ninguna; criterio: la revisión no deja decisiones de negocio abiertas.
- [ ] T002 [P] Revisar [plan.md](plan.md), [research.md](research.md) y [data-model.md](data-model.md) contra la constitución; dependencia: T001; criterio: el gate de arquitectura, capas, YAGNI y tests queda documentado como PASS.
- [ ] T003 [P] Validar [contracts/market-p2p.yaml](contracts/market-p2p.yaml) y [contracts/postman-p2p.json](contracts/postman-p2p.json) contra `spec.md`; dependencia: T001; criterio: YAML y JSON son parseables y usan el mismo vocabulario y campos.

## Phase 2: Modelo de dominio de oferta

**Purpose**: Implementar las invariantes puras de una oferta antes de
conectarla con PostgreSQL o HTTP.

- [ ] T004 [P] [US2] Crear `P2POffer` en `src/backend/models/P2POffer.ts` con estados `OPEN`, `SOLD`, `CANCELLED`, cantidad positiva entera, `reservedQuantity`, `unitPrice`, `total` y timestamps; dependencia: T001; criterio: el modelo representa el ciclo completo sin depender de Drizzle.
- [ ] T005 [P] [US2] Implementar `P2POffer.fill` y `P2POffer.cancel` en `src/backend/models/P2POffer.ts`; dependencia: T004; criterio: solo `OPEN` puede pasar a un estado terminal y cada transición consume/libera la reserva una sola vez.
- [ ] T006 [P] [US2] Implementar cálculo decimal de precio y total en `src/backend/models/P2POffer.ts` o helper de dominio existente; dependencia: T004; criterio: precio y total se conservan con dos decimales y `total = unitPrice × quantity` sin redondeo adicional.
- [ ] T007 [US2] Agregar tests unitarios de invariantes en `tests/unit/models/p2p-offer.spec.ts`; dependencia: T004-T006; criterio: cubre publicación válida, cantidad inválida, `OPEN → SOLD`, `OPEN → CANCELLED`, transición terminal repetida y comprador igual al vendedor.

## Phase 3: Migraciones, constraints y contratos de persistencia

**Purpose**: Crear el soporte PostgreSQL que bloquea estados imposibles y
preserva la auditoría existente.

- [ ] T008 [P] Crear tablas `p2p_offers` e `idempotency_keys` en `src/backend/db/schema.ts` con FKs, campos y tipos definidos en `data-model.md`; dependencia: T004; criterio: el schema compila y expone tipos inferidos para ambas tablas.
- [ ] T009 [P] Extender `marketOperations` en `src/backend/db/schema.ts` con `offer_id` y `counterparty_user_id` nullable sin eliminar `BUY`/`SELL`; dependencia: T008; criterio: compras primarias existentes siguen siendo representables y una venta P2P puede referenciar comprador y oferta.
- [ ] T010 Extender `financialAuditRecords` en `src/backend/db/schema.ts` con `offer_id`, `operation_id` nullable cuando corresponda y constraints de combinación de acción/referencia; dependencia: T009; criterio: auditorías existentes siguen siendo válidas y publicación/cancelación/fill tienen una referencia válida.
- [ ] T011 [P] Agregar índices y constraints SQL de `p2p_offers` e `idempotency_keys` en `src/backend/db/schema.ts`; dependencia: T008-T010; criterio: se garantizan cantidad positiva, reserva `0..quantity`, estados permitidos, `OPEN ⇒ reservedQuantity = quantity`, terminal ⇒ `reservedQuantity = 0`, y unicidad `(user_id, idempotency_key)`.
- [ ] T012 Generar la migración Drizzle nueva y actualizar metadatos en `src/backend/db/migrations/`; dependencia: T008-T011; criterio: `npm run db:generate` produce una migración aplicable sin modificar migraciones históricas.
- [ ] T013 [P] Crear pruebas de constraints y rollback en `tests/integration/p2p-offers.repository.spec.ts`; dependencia: T012; criterio: PostgreSQL rechaza FK, estado, cantidad, total, reserva e idempotencia inválidos y revierte la transacción.

## Phase 4: Idempotencia

**Purpose**: Hacer seguros los reintentos de todas las operaciones mutantes.

- [ ] T014 [P] Crear `src/backend/repositories/idempotency.repository.ts` para insertar/leer por `(userId, key)` y guardar hash, status y body final; dependencia: T012; criterio: la capa no duplica filas y distingue replay de conflicto.
- [ ] T015 [P] Crear helper de huella normalizada en `src/backend/services/idempotency.service.ts`; dependencia: T014; criterio: el hash incluye usuario, método, ruta y payload normalizado, y una diferencia en cualquiera de ellos se detecta.
- [ ] T016 Integrar claim/replay de idempotencia dentro de la transacción financiera en `src/backend/services/idempotency.service.ts` y repositorios de mercado; dependencia: T014-T015; criterio: dos requests idénticos concurrentes esperan/reproducen el mismo status/body y no duplican efectos.
- [ ] T017 [P] Agregar tests unitarios de fingerprint y reglas de clave en `tests/unit/services/idempotency.service.spec.ts`; dependencia: T015; criterio: cubre misma clave/payload, misma clave/distinto payload, usuario distinto, ruta distinta, clave vacía y longitud mayor a 255.
- [ ] T018 [US5] Agregar test de integración para repetir cada POST mutante con la misma `Idempotency-Key` en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T016; criterio: compra pool, publicación, compra P2P y cancelación devuelven el mismo resultado lógico sin operaciones/auditorías/reservas duplicadas.
- [ ] T019 [US5] Agregar test de integración de misma clave con payload diferente en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T016; criterio: responde `409` y no altera saldos, holdings, oferta, operación ni auditoría.

## Phase 5: Reserva de tokens

**Purpose**: Implementar disponibilidad derivada sin descontar la tenencia
total del vendedor.

- [ ] T020 Crear funciones de repositorio para sumar reservas `OPEN` por vendedor/jugador en `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T012, T016; criterio: la disponibilidad es `token_holdings.quantity - SUM(reserved_quantity)` bajo la transacción.
- [ ] T021 Implementar lock de holding y ofertas abiertas del vendedor en `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T020; criterio: dos operaciones sobre la misma tenencia se serializan y nunca confirman una reserva superior a la disponibilidad.
- [ ] T022 [P] [US2] Agregar test unitario de disponibilidad/reserva en `tests/unit/services/p2p-offer.service.spec.ts`; dependencia: T020; criterio: vendedor sin tokens disponibles y cantidad mayor a la disponible producen el conflicto de negocio esperado.
- [ ] T023 [US2] Agregar test de integración de dos publicaciones concurrentes que superan la tenencia en `tests/integration/p2p-offers.concurrency.spec.ts`; dependencia: T021; criterio: las reservas confirmadas no superan la tenencia, ninguna cantidad queda negativa y la emisión total sigue en 100.

## Phase 6: Publicación de ofertas

**Purpose**: Exponer la publicación P2P completa con precio capturado y
auditoría atómica.

- [ ] T024 [P] [US2] Crear schemas Zod de publicación y respuestas en `src/backend/schemas/p2p-offer.schema.ts`; dependencia: T004, T008; criterio: acepta exactamente `playerId` y `quantity` positiva entera y rechaza campos extra.
- [ ] T025 [US2] Implementar `publishOffer` en `src/backend/services/p2p-offer.service.ts`; dependencia: T020-T024; criterio: valida rol inversor, jugador, cotización vigente, precio de dos decimales, disponibilidad e idempotencia antes de crear `OPEN`.
- [ ] T026 [US2] Implementar persistencia transaccional de publicación en `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T021, T025; criterio: inserta `reservedQuantity = quantity`, no cambia `token_holdings` ni créditos y registra la auditoría de publicación en el mismo commit.
- [ ] T027 [US2] Crear controller y route `src/backend/controllers/p2p-offer.controller.ts` y `src/app/api/p2p/offers/route.ts` para `POST`; dependencia: T024-T026; criterio: devuelve `201` con oferta `OPEN` y mapea `400/401/403/404/409/503/500` al contrato.
- [ ] T028 [US2] Agregar tests unitarios de publicación en `tests/unit/services/p2p-offer.service.spec.ts`; dependencia: T025; criterio: cubre saldo/tenencia no aplicable, vendedor `SUPERUSER`, jugador inexistente, quote inexistente, vendedor sin tokens disponibles y cantidad superior a disponibilidad.
- [ ] T029 [US2] Agregar test de integración de publicación/rollback en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T026-T027; criterio: publicación exitosa conserva holding total, reduce disponibilidad y un error no deja oferta ni reserva parcial.

## Phase 7: Consulta de ofertas

**Purpose**: Permitir descubrir únicamente ofertas abiertas del MVP.

- [ ] T030 [P] [US2] Implementar query Zod y `listOpenOffers` en `src/backend/services/p2p-offer.service.ts` y `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T024, T026; criterio: filtra solo `OPEN`, admite únicamente `playerId` opcional y ordena de forma estable por `createdAt`/`id`.
- [ ] T031 [US2] Implementar `GET` en `src/app/api/p2p/offers/route.ts` y controller; dependencia: T030; criterio: devuelve `200 { items: [] }` sin ofertas, rechaza parámetros no permitidos y nunca expone `SOLD`/`CANCELLED`.
- [ ] T032 [US2] Agregar test de integración de consulta en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T031; criterio: cubre listado autenticado, filtro `playerId`, lista vacía, JWT ausente y query inválida.

## Phase 8: Compra completa de una oferta

**Purpose**: Transferir créditos y tokens en una única transacción sin doble
aceptación.

- [ ] T033 [US3] Implementar `purchaseOffer` en `src/backend/services/p2p-offer.service.ts`; dependencia: T025-T032; criterio: rechaza `SUPERUSER`, auto-compra, saldo insuficiente y oferta no `OPEN` como errores de negocio `409`.
- [ ] T034 [US3] Implementar locks y transferencia seller/buyer en `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T021, T033; criterio: respeta orden de locks usuarios → oferta → holdings, pone oferta `SOLD`, consume reserva, acredita vendedor, debita comprador y actualiza holdings.
- [ ] T035 [US3] Reutilizar persistencia de `market_operations`, portfolio y auditoría para el fill en `src/backend/repositories/market.repository.ts` y `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T009-T010, T034; criterio: se registra una operación `SELL` con oferta/contraparte y snapshots auditables.
- [ ] T036 [US3] Crear route `src/app/api/p2p/offers/[offerId]/purchase/route.ts`; dependencia: T033-T035; criterio: devuelve `200` con estado `SOLD`, operación, saldos y holdings posteriores conforme al contrato.
- [ ] T037 [US3] Agregar test de integración de saldo insuficiente en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T034-T036; criterio: responde `409` y deja oferta, reservas, saldos, holdings, operación y auditoría sin cambios.
- [ ] T038 [US3] Agregar test de integración de comprador intentando comprar su propia oferta en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T033-T036; criterio: responde `409` sin transferencia ni cambio de estado.
- [ ] T039 [US3] Agregar test de integración de dos compradores aceptando la misma oferta en `tests/integration/p2p-offers.concurrency.spec.ts`; dependencia: T034-T036; criterio: exactamente una solicitud confirma `SOLD`, la otra recibe `409` o replay válido y existe una sola operación/auditoría.

## Phase 9: Cancelación

**Purpose**: Liberar una reserva abierta solo por su vendedor.

- [ ] T040 [US4] Implementar `cancelOffer` en `src/backend/services/p2p-offer.service.ts`; dependencia: T025, T033; criterio: verifica ownership, exige estado `OPEN` y devuelve `403`/`409` sin cambiar datos cuando corresponde.
- [ ] T041 [US4] Implementar cancelación atómica en `src/backend/repositories/p2p-offer.repository.ts`; dependencia: T021, T040; criterio: cambia a `CANCELLED`, pone reserva en cero, conserva holdings/créditos y registra auditoría.
- [ ] T042 [US4] Crear route `src/app/api/p2p/offers/[offerId]/cancel/route.ts`; dependencia: T040-T041; criterio: devuelve `200` con oferta cancelada y respeta idempotencia.
- [ ] T043 [US4] Agregar tests unitarios de cancelación en `tests/unit/models/p2p-offer.spec.ts` y `tests/unit/services/p2p-offer.service.spec.ts`; dependencia: T005, T040; criterio: cubre vendedor correcto, otro usuario, oferta `SOLD`, oferta `CANCELLED` y doble cancelación.
- [ ] T044 [US4] Agregar test de integración de cancelación concurrente con compra en `tests/integration/p2p-offers.concurrency.spec.ts`; dependencia: T034, T041; criterio: exactamente una transición terminal gana y la operación perdedora no libera ni transfiere dos veces.

## Phase 10: Concurrencia y locks

**Purpose**: Hacer explícita y verificable la serialización de todas las
operaciones que comparten cuentas, ofertas y holdings.

- [ ] T045 Refactorizar helpers de locks de `src/backend/repositories/market.repository.ts` y `src/backend/repositories/p2p-offer.repository.ts` al orden global UUID users → offers → token_holdings; dependencia: T021, T034; criterio: compra primaria, publicación, compra P2P y cancelación no adquieren las mismas filas en órdenes incompatibles.
- [ ] T046 [P] Agregar test de invariantes concurrentes en `tests/integration/p2p-offers.concurrency.spec.ts`; dependencia: T045; criterio: con dos operaciones concurrentes, ningún saldo/holding/reserva queda negativo y la suma pool + reservas + inversores por jugador permanece exactamente en 100.
- [ ] T047 Agregar test de aislamiento ante usuario distinto en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T016, T045; criterio: una misma clave de otro usuario no reproduce el resultado ajeno y la operación se evalúa con su propia identidad.

## Phase 11: Retry interno de errores transaccionales

**Purpose**: Reintentar solo fallos técnicos transitorios de PostgreSQL.

- [ ] T048 Crear `runFinancialTransactionWithRetry` en `src/backend/repositories/financial-transaction.ts` o módulo compartido equivalente; dependencia: T016, T045; criterio: reconoce solo SQLSTATE `40P01` y `40001`, usa backoff 50/100 ms y máximo 3 intentos.
- [ ] T049 [P] Agregar `ServiceUnavailableError` y clasificación estable en `src/backend/errors/http.error.ts` y `src/backend/errors/to-http-response.ts`; dependencia: T048; criterio: retry agotado responde `503` con `code`, `message` y `correlationId`, mientras errores de negocio conservan `409`.
- [ ] T050 Agregar test unitario del retry en `tests/unit/repositories/financial-transaction.spec.ts`; dependencia: T048-T049; criterio: deadlock/serialization failure se reintentan, un tercer fallo termina en `503` y `ConflictError`/`NotFoundError` no se reintentan.
- [ ] T051 [US5] Agregar test de timeout simulado después de persistir la operación en `tests/integration/p2p-offers.idempotency.spec.ts`; dependencia: T016, T034, T048; criterio: el timeout deja resultado incierto para el cliente, repetir la misma clave reproduce el resultado y no duplica operación, auditoría ni transferencia.

## Phase 12: Compra al pool y rechazo de venta al SUPERUSER

**Purpose**: Preservar el mercado primario y eliminar la recompra central.

- [ ] T052 [US1] Integrar `Idempotency-Key` y el wrapper de retry en `src/app/api/orders/buy/route.ts` y `src/backend/services/market-operation.service.ts`; dependencia: T016, T048; criterio: compra primaria sigue funcionando, repite seguro y pool sin tokens responde `409` sin efectos parciales.
- [ ] T053 [US1] Reordenar locks de compra primaria en `src/backend/repositories/market.repository.ts`; dependencia: T045; criterio: investor/pool y holdings se bloquean en orden UUID sin alterar el resultado financiero existente.
- [ ] T054 [US1] Rechazar `/api/orders/sell` en `src/app/api/orders/sell/route.ts` y `src/backend/services/market-operation.service.ts` con `CENTRAL_POOL_REPURCHASE_DISABLED`; dependencia: T052; criterio: cualquier venta al `SUPERUSER` responde `409` y no modifica saldo, holding, operación ni auditoría.
- [ ] T055 [US1] Agregar tests de integración de compra primaria y venta al `SUPERUSER` en `tests/integration/market-primary.routes.spec.ts`; dependencia: T052-T054; criterio: cubre compra válida, pool agotado, `SUPERUSER` no comprador y venta al pool rechazada.

## Phase 13: Auditoría y market_operations

**Purpose**: Garantizar trazabilidad append-only de publicación, venta P2P y
cancelación.

- [ ] T056 Implementar mapeo de auditoría y snapshots en `src/backend/models/FinancialAuditRecord.ts`, `src/backend/models/MarketOperation.ts` y repositorios de mercado; dependencia: T009-T010, T026, T035, T041; criterio: cada transición exitosa guarda actor, correlation ID y snapshots correctos en el mismo commit.
- [ ] T057 [P] Agregar tests de auditoría/operación en `tests/integration/p2p-offers.audit.spec.ts`; dependencia: T056; criterio: publicación/cancelación generan acciones P2P y compra genera `SELL` con buyer, offer, precio, total y fecha; ningún rechazo crea registros.

## Phase 14: OpenAPI y Postman

**Purpose**: Sincronizar documentación pública y demostración backend.

- [ ] T058 Actualizar `specs/001-player-token-marketplace/contracts/openapi.yaml`, que es la fuente cargada por `src/app/api/docs/route.ts`, y reflejar el diseño en `specs/015-player-peer-market-backend/contracts/market-p2p.yaml`; dependencia: T027, T031, T036, T042, T054; criterio: documenta headers, body, `SOLD`, `OPEN`, `CANCELLED`, errores `400/401/403/404/409/503/500` y respuestas reales sin crear otra ruta de documentación.
- [ ] T059 Actualizar `specs/001-player-token-marketplace/contracts/postman_collection.json` y reflejar el diseño en `specs/015-player-peer-market-backend/contracts/postman-p2p.json`; dependencia: T058; criterio: la colección existente permite ejecutar listado, publicación, compra completa, cancelación, replay de clave y rechazo de venta al pool con asserts.
- [ ] T060 [P] Validar los contratos canónicos y de diseño con parser YAML/JSON y smoke requests documentados en `specs/015-player-peer-market-backend/quickstart.md`; dependencia: T058-T059; criterio: los contratos parsean, Swagger sigue cargando la fuente existente y los ejemplos no usan endpoints/campos inexistentes.

## Phase 15: Tests unitarios

**Purpose**: Completar cobertura aislada de dominio, servicios y utilidades sin
tests triviales de configuración.

- [ ] T061 Consolidar suite unitaria en `tests/unit/models/p2p-offer.spec.ts`, `tests/unit/services/p2p-offer.service.spec.ts` y `tests/unit/services/idempotency.service.spec.ts`; dependencia: T007, T017, T028, T043; criterio: cubre invariantes, autorización, saldo insuficiente, vendedor sin tokens, auto-compra, estados terminales, payload distinto y errores de negocio.
- [ ] T062 Consolidar tests unitarios de repository/retry en `tests/unit/repositories/idempotency.repository.spec.ts` y `tests/unit/repositories/financial-transaction.spec.ts`; dependencia: T014, T050; criterio: cubre lock/replay conceptual, SQLSTATE permitidos, backoff y límite de intentos sin usar mocks para configuraciones triviales.
- [ ] T063 Ejecutar `npm run test:unit` y corregir únicamente fallos relacionados con la feature; dependencia: T061-T062; criterio: suite unitaria completa en verde sin eliminar tests existentes.

## Phase 16: Tests de integración PostgreSQL

**Purpose**: Verificar transacciones, constraints y carreras contra una base
real.

- [ ] T064 Preparar fixtures reutilizables en `tests/integration/fixtures/p2p-market.ts` usando `TEST_DATABASE_URL`, migraciones y datos de pool/inversores/jugador/quote; dependencia: T012; criterio: cada test puede crear 100 tokens, dos inversores y saldo conocido sin depender de frontend.
- [ ] T065 Consolidar integración de publicación/listado/compra/cancelación en `tests/integration/p2p-offers.routes.spec.ts`; dependencia: T029, T032, T036, T042, T064; criterio: los cuatro flujos principales pasan con PostgreSQL real y rollback comprobable.
- [ ] T066 Consolidar concurrencia en `tests/integration/p2p-offers.concurrency.spec.ts`; dependencia: T023, T039, T044, T046, T064; criterio: cubre dos compradores, compra/cancelación, dos reservas excesivas, doble reserva y emisión exacta de 100 usando pares pequeños de operaciones concurrentes.
- [ ] T067 Consolidar idempotencia/timeout en `tests/integration/p2p-offers.idempotency.spec.ts`; dependencia: T018-T019, T051, T064; criterio: misma clave reproduce, payload distinto da `409`, timeout simulado no duplica y usuario distinto queda aislado.
- [ ] T068 Ejecutar `npm run test:integration` contra PostgreSQL real y documentar resultados en `specs/015-player-peer-market-backend/quickstart.md`; dependencia: T065-T067; criterio: no quedan fallos de migración, aislamiento, constraint, rollback ni concurrencia.

## Phase 17: Validación final

**Purpose**: Confirmar que la feature está lista para revisión y posterior
implementación/merge.

- [ ] T069 Ejecutar `npm run format:check`, `npm run lint` y `npm run build`; dependencia: T063, T068; criterio: compilación, formato y lint pasan sin tocar frontend fuera de lo autorizado.
- [ ] T070 Ejecutar el quickstart completo y revisar OpenAPI/Postman contra las rutas implementadas; dependencia: T060, T068-T069; criterio: todos los escenarios del quickstart son reproducibles y los contratos no divergen.
- [ ] T071 Revisar `git diff` para confirmar que solo se modificaron backend, migraciones, documentación y tests de la feature; dependencia: T069; criterio: no hay componentes, hooks ni servicios frontend modificados.
- [ ] T072 Preparar checklist de entrega con cobertura de los criterios SC-001 a SC-010 y solicitar aprobación de Project Owner; dependencia: T070-T071; criterio: cada criterio tiene test o evidencia y la feature queda lista para PR hacia `main`.

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 bloquea todo: la especificación y contratos deben estar aprobados.
- Phase 2 bloquea el dominio y Phase 3; Phase 3 bloquea idempotencia y todos
  los flujos que persisten datos.
- Phase 4 bloquea publicación, compra, cancelación y compra primaria idempotente.
- Phase 5 bloquea publicación y las pruebas de doble reserva.
- Phase 6 bloquea consulta y compra P2P.
- Phase 8 bloquea la carrera compra/cancelación y la auditoría de fill.
- Phase 11 bloquea el comportamiento final ante deadlock/serialization failure.
- Phases 14–17 se ejecutan después de los endpoints y pruebas principales.

### User story order

- **US1 — Compra al pool (P1)**: T052-T055; depende de T016, T045 y T048.
- **US2 — Publicación y consulta (P1)**: T020-T032; depende de dominio,
  migraciones e idempotencia.
- **US3 — Compra completa (P1)**: T033-T039; depende de publicación,
  reservas, locks y persistencia financiera.
- **US4 — Cancelación (P1)**: T040-T044; depende de la misma reserva y locks.
- **US5 — Reintentos seguros (P1)**: T014-T019 y T048-T051; cruza todos los
  mutantes, pero sus helpers se implementan antes de los endpoints.

### Parallel opportunities

- T002-T003 pueden ejecutarse en paralelo después de T001.
- T004-T006, T008-T010 y T014-T015 pueden dividirse por archivos después de
  sus respectivas dependencias.
- T007, T013 y T017 pueden prepararse en paralelo una vez definidos dominio,
  schema e idempotencia.
- T030 y T056 pueden avanzar en paralelo cuando publicación y persistencia
  base estén listas.
- T037-T039 y T043-T044 son suites independientes de escenarios distintos,
  aunque comparten fixtures.
- T061-T062 pueden ejecutarse en paralelo antes de T063.

## Implementation Strategy

1. Aprobar la especificación y congelar `SOLD`, reservas separadas y contrato
   de idempotencia.
2. Implementar dominio, migración, constraints e idempotencia.
3. Entregar el vertical mínimo de publicar + listar + comprar + cancelar con
   PostgreSQL real y auditoría.
4. Integrar concurrencia y retry acotado antes de la validación final.
5. Mantener la compra al pool y rechazar la venta al `SUPERUSER` sin reabrir
   el mercado secundario del pool.
6. No implementar órdenes parciales, matching, vencimientos, comisiones,
   subastas, scheduler ni frontend.
