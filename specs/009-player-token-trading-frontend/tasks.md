---

description: "Tareas de implementación del trading de tokens en el perfil"
---

# Tasks: Compra y venta de tokens desde el perfil

**Input**: `specs/009-player-token-trading-frontend/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/player-trading-ui.md`, `quickstart.md`).

**Prerequisites**: Antes de implementar, comprobar la aprobación formal de la especificación exigida por `.specify/memory/constitution.md`; el estado `Draft` actual no acredita esa aprobación. Esta lista no ejecuta implementación ni acciones externas.

**Tests**: La especificación contiene escenarios de aceptación y criterios verificables; el plan exige pruebas conductuales con Vitest y comprobación manual de accesibilidad. Escribir cada prueba antes del comportamiento correspondiente y comprobar su fallo pertinente. No crear pruebas declarativas o triviales.

**Organization**: Una fase por historia, con rutas relativas a la raíz. `[P]` indica tareas en archivos distintos sin dependencia entre ellas; los prerequisitos de fase siguen vigentes.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la implementación frontend sobre la base existente, sin dependencias, migraciones ni backend nuevos.

- [X] T001 Comprobar y registrar la aprobación de `specs/009-player-token-trading-frontend/spec.md` requerida por `.specify/memory/constitution.md` antes de cambiar código; documentar el resultado en `specs/009-player-token-trading-frontend/quickstart.md`.
- [X] T002 Preparar en `specs/009-player-token-trading-frontend/quickstart.md` datos locales y comprobaciones reproducibles para INVESTOR, SUPERUSER, jugador con y sin cotización, portfolio vacío/con posición y respuestas controladas de GET/POST; usar las rutas y comandos existentes sin alterar `.env` ni datos productivos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato HTTP de portfolio y una sola lectura compartida de cotizaciones, necesarios para las tres historias.

- [X] T003 [P] Cubrir en `tests/unit/services/client.player-trading.service.spec.ts` GET `/api/portfolio` con Bearer, `AbortSignal`, preservación de `creditBalance` e `items`, 401, error `{error}` con status, JSON ilegible y fallo de red; comprobar que no se envía `userId`.
- [X] T004 [P] Crear `tests/unit/features/profile/player-trading-page.spec.ts` con hooks y componentes hijos simulados para comprobar que la página llama una sola vez a `usePlayerQuotes` para el jugador confirmado y pasa el mismo resultado a cotizaciones y trading, sin montar secciones para jugador o sesión no confirmados.
- [X] T005 Implementar `getPortfolio(token, signal?)` y DTO `PortfolioSnapshot = { creditBalance: number; items: PortfolioItem[] }` en `src/frontend/services/client/player-trading.service.ts`; `PortfolioItem` incluye `playerId: string`, `quantity: number`, `averagePurchasePrice: number` y `currentQuoteValue`, `currentValue`, `unrealizedPnl` como `number | null`; conservar status y texto `{error}` en errores. Depende de T003.
- [X] T006 Elevar `usePlayerQuotes` a `src/app/players/[id]/page.tsx`, invocándolo siempre con token/jugador vacíos hasta confirmar el perfil, y pasar el mismo resultado a cotizaciones y trading; no usar `PlayerApiDetail.currentQuote` ni duplicar GET. Depende de T004.
- [X] T007 Adaptar `src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.tsx` para recibir el resultado de `usePlayerQuotes` desde la página y conservar historial, fecha, errores y reintentos sin montar otro hook. Depende de T006.

**Checkpoint**: Portfolio tipado y cotización vigente compartida; ninguna operación disponible todavía.

---

## Phase 3: User Story 1 — Consultar cotización y posición (Priority: P1) — Primer incremento verificable

**Goal**: Ver cotización, saldo y únicamente la posición del jugador abierto, con estados de carga, vacío y error independientes.

**Independent Test**: Abrir un perfil con cotización y portfolio con posición, vacío y con posiciones de otros jugadores; verificar saldo, métricas exactas, ausencia frente a cero, carga separada y reintento de portfolio sin enviar órdenes.

### Tests

- [X] T008 [P] [US1] Crear pruebas de selección y presentación en `tests/unit/features/profile/player-trading.spec.ts`: `items.find(item => item.playerId === player.id)`, portfolio vacío frente a posición ausente, tenencia cero sin métricas ficticias, `null` como «No disponible» y conservación de cero, negativos y `averagePurchasePrice` recibido.
- [X] T009 [P] [US1] Crear pruebas de hook en `tests/unit/features/profile/use-player-trading.spec.ts` con el harness existente: una lectura por contexto, loading/success/empty/error/refreshing, reintento, 401, cambio de jugador/token, abortos y éxito/error/finally obsoletos sin filtrar datos financieros.

### Implementation

- [X] T010 [US1] Crear en `src/frontend/features/profile/utils/player-trading.ts` la selección de la posición del jugador y el formato de saldo/métricas: `items.length === 0` es portfolio vacío; otras posiciones no se muestran; `null` es «No disponible», mientras `0` y negativos son números; sin recalcular valor actual ni PnL. Depende de T008.
- [X] T011 [US1] Crear `src/frontend/features/profile/hooks/usePlayerTrading.ts` para GET de portfolio con `idle/loading/success/empty/error/refreshing`, reintento y aislamiento por token, jugador, generación y `AbortController`; 401 aplica el logout existente y borra datos protegidos. Depende de T005 y T009.
- [X] T012 [US1] Crear `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx` con saldo del GET y solo posición del perfil: cantidad, promedio, cotización actual, valor actual y PnL; anunciar carga y portfolio vacío, distinguir ausencia de posición, mostrar error de portfolio con reintento y conservar cotización válida. Depende de T010–T011.
- [X] T013 [US1] Crear `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss` siguiendo el perfil existente; hacer legibles cifras, unidades, estados y reintento a 360 y 1280 px con foco visible. Depende de T012.
- [X] T014 [US1] Montar trading para el jugador confirmado en `src/app/players/[id]/page.tsx`, pasando token, rol, nombre, cotización compartida y callback de 401; ocultar información financiera al perder sesión y mantener cotización y portfolio como cargas independientes. Depende de T011–T013.

**Checkpoint**: US1 funciona sin enviar órdenes y se comprueba con cualquier rol autorizado a consultar.

---

## Phase 4: User Story 2 — Comprar tokens (Priority: P1)

**Goal**: Permitir a INVESTOR validar, revisar y confirmar una compra única, mostrar el resultado efectivo y refrescar el portfolio.

**Independent Test**: Con saldo y cotización disponibles, confirmar y cancelar compras; comprobar 0 POST al cancelar, un POST al confirmar repetidamente, comprobante del 201 y GET posterior, además de saldo insuficiente, rechazo, incertidumbre y fallo de refresco.

### Tests

- [X] T015 [P] [US2] Extender `tests/unit/services/client.player-trading.service.spec.ts` para POST `/api/orders/buy` con Bearer y JSON exactamente `{playerId, quantity}`, resultado `operation/account/holding`, status y `{error}` de 400/401/404/409, 5xx, JSON no confirmable y red; no enviar `userId` ni reintentar POST.
- [X] T016 [P] [US2] Extender `tests/unit/features/profile/player-trading.spec.ts` con entrada como texto: «texto de dígitos enteros», `Number.isSafeInteger`, mayor que cero y no superior a 2.147.483.647; rechazar vacío, signos, decimales, exponentes y texto mixto; validar costo orientativo redondeado a centavos frente al saldo vigente sin sustituir el total de `operation`.
- [X] T017 [P] [US2] Extender `tests/unit/features/profile/use-player-trading.spec.ts` con cancelación sin POST, snapshot de confirmación, candado sincrónico contra doble activación, progreso, 201 y GET posterior, rechazo que conserva cantidad, red/5xx inciertos, 201 seguido de GET fallido, 401, y POST tardío al cambiar jugador o sesión.

### Implementation

- [X] T018 [US2] Añadir `buyPlayerTokens(token, {playerId, quantity})` y el DTO de resultado en `src/frontend/services/client/player-trading.service.ts`; enviar solo ambos campos a `/api/orders/buy`, conservar `operation.type`, `quantity`, `quoteValue`, `total` del 201 y status/texto real de errores. Depende de T015.
- [X] T019 [US2] Añadir a `src/frontend/features/profile/utils/player-trading.ts` validación de compra, total orientativo y clasificación solo de status/texto conocidos: 409 `Insufficient credit balance`, `Insufficient tokens in central pool`, `The central pool cannot operate as an investor`, y 404 `Current quote not available`; los demás rechazos mantienen causa genérica, red/5xx quedan indeterminados. Depende de T016.
- [X] T020 [US2] Extender `src/frontend/features/profile/hooks/usePlayerTrading.ts` con borrador BUY, confirmación inmutable del jugador/cantidad/cotización/total, cancelación sin POST, revalidación y bloqueo sincrónico; tras 201 conservar comprobante y consultar GET, marcar cifras viejas como no actuales mientras refresca, preservar comprobante si GET falla; mantener respuesta tardía del POST etiquetada con jugador original solo en la misma sesión y sin modificar otro perfil. Depende de T017–T019.
- [X] T021 [US2] Extender `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx` con controles de compra solo para INVESTOR, campo etiquetado con `aria-invalid`/`aria-describedby`, error inline, falta de cotización, saldo insuficiente, progreso, comprobante efectivo, rechazo e incertidumbre con acción de consultar portfolio; conservar cantidad corregible. Depende de T019–T020.
- [X] T022 [US2] Añadir a `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx` diálogo de confirmación accesible que muestra jugador, compra, cantidad, cotización en créditos/token y total orientativo; foco inicial y contenido, Escape/cancelación sin POST y retorno de foco; ajustar `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss` para teclado y ambos anchos. Depende de T021.
- [X] T023 [US2] Mantener en `src/app/players/[id]/page.tsx` el estado del resultado de una compra ya enviada a nivel de perfil para etiquetar al jugador original durante cambios de ruta, sin filtrar comprobantes entre sesiones; pasar rol desde `AuthContext` y no ofrecer compra a SUPERUSER. Depende de T020–T022.

**Checkpoint**: La compra se prueba de forma independiente sin venta; el saldo y la posición solo vuelven a figurar como actuales tras GET exitoso.

---

## Phase 5: User Story 3 — Vender tokens poseídos (Priority: P1)

**Goal**: Vender una cantidad no superior a la tenencia visible y reflejar venta parcial o total con los datos nuevos del portfolio.

**Independent Test**: Con posición y cotización, vender parcialmente y toda la tenencia; verificar comprobante y GET, cero tokens y métricas ausentes tras venta total, y bloqueos/rechazos por tenencia insuficiente.

### Tests

- [X] T024 [P] [US3] Extender `tests/unit/services/client.player-trading.service.spec.ts` para POST `/api/orders/sell` con Bearer, solo `{playerId, quantity}`, resultado efectivo, status/error y ausencia de POST automático en red/5xx.
- [X] T025 [P] [US3] Extender `tests/unit/features/profile/player-trading.spec.ts` para venta con tenencia cero, cantidad mayor a `position.quantity`, venta válida y venta total que deja tenencia cero sin promedio, valor ni PnL ficticios tras el nuevo GET.
- [X] T026 [P] [US3] Extender `tests/unit/features/profile/use-player-trading.spec.ts` con confirmación/cancelación SELL, una sola solicitud ante doble activación, 201 y refresco, 409 `Insufficient token holding`, 409 `Insufficient central pool balance`, conflicto desconocido, red/5xx inciertos y respuestas tardías aisladas.

### Implementation

- [X] T027 [US3] Añadir `sellPlayerTokens(token, {playerId, quantity})` en `src/frontend/services/client/player-trading.service.ts` usando `/api/orders/sell`, exactamente los dos campos y el mismo tratamiento de respuesta y error que compra. Depende de T024.
- [X] T028 [US3] Añadir a `src/frontend/features/profile/utils/player-trading.ts` validación de venta frente a la tenencia vigente y clasificación de 409 `Insufficient token holding`/`Insufficient central pool balance` frente a conflictos desconocidos, sin atribuirles una causa falsa. Depende de T025.
- [X] T029 [US3] Extender `src/frontend/features/profile/hooks/usePlayerTrading.ts` con selección y snapshot SELL, bloqueo de envío, comprobante de `operation`, GET posterior y estados de rechazo/incertidumbre; una venta total toma la ausencia de posición del nuevo portfolio como cero sin inventar métricas. Depende de T026–T028.
- [X] T030 [US3] Extender `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx` y `src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss` con venta para INVESTOR, confirmación accesible, cantidad conservada tras rechazo y mensajes de tenencia/pool; usar el mismo progreso, comprobante y recuperación que compra. Depende de T029.

**Checkpoint**: Compra y venta funcionan por separado y ambas actualizan el perfil mediante GET posterior.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 Ejecutar las pruebas focalizadas de `tests/unit/services/client.player-trading.service.spec.ts`, `tests/unit/features/profile/use-player-trading.spec.ts` y `tests/unit/features/profile/player-trading.spec.ts`, más las regresiones de `tests/unit/features/profile/use-player-quotes.spec.ts`; ejecutar `npm run lint`, `npm test` y `npm run build` desde `package.json`, y registrar resultados e incidencias en `specs/009-player-token-trading-frontend/quickstart.md`.
- [ ] T032 Completar aceptación manual de `specs/009-player-token-trading-frontend/quickstart.md` en navegador con INVESTOR/SUPERUSER, sesión vencida, quote ausente, portfolio vacío, errores y respuestas tardías; verificar teclado, foco del diálogo, anuncios y anchos 360/1280 px, además de una lectura de quotes y una de portfolio por carga, un POST por confirmación y GET posterior solo tras éxito o reintento explícito; registrar evidencia y limitaciones reales.
- [X] T033 Registrar en `specs/009-player-token-trading-frontend/quickstart.md` la trazabilidad final de FR-001–022 y SC-001–007, el estado de aprobación formal de Project Owner y las incidencias restantes, sin asumir aprobación ni crear issues, PR o publicación.

---

## Dependencies & Execution Order

```text
Setup T001–T002 → Foundation T003–T007 → US1 T008–T014 → US2 T015–T023
                                                       └────→ US3 T024–T030
US2 + US3 → Polish T031–T033
```

- **US1** depende de Foundation y no de órdenes; es el primer incremento verificable.
- **US2** y **US3** dependen del portfolio y la cotización de US1. La venta usa los componentes y el estado de confirmación introducidos en US2, por lo que en este diseño se integra después de US2; sus pruebas de venta se ejecutan sin comprar en el mismo recorrido.
- En cada historia, escribir y comprobar primero las pruebas relevantes; cliente/utilidades preceden a hook, hook precede a UI e integración. Las tareas marcadas `[P]` pueden avanzar juntas solo una vez cerrados sus prerequisitos.
- T031–T033 siguen a ambas operaciones y son secuenciales porque registran evidencia en el mismo `quickstart.md`.

## Parallel Examples per User Story

- **Foundation**: T003 (cliente HTTP) y T004 (cotización compartida) preparan pruebas en archivos distintos; T005 sigue a T003 y T006–T007 a T004.
- **US1**: T008 (selección y presentación) y T009 (estado asíncrono) preparan pruebas independientes; T010 y T011 avanzan en archivos distintos después de ellas.
- **US2**: T015 (HTTP), T016 (validación) y T017 (hook) preparan pruebas en archivos distintos; T018 y T019 implementan archivos distintos después de sus pruebas.
- **US3**: T024 (HTTP), T025 (validación) y T026 (hook) preparan pruebas en archivos distintos; T027 y T028 implementan archivos distintos después de sus pruebas.

## Implementation Strategy

1. Completar Setup y Foundation con la aprobación de la especificación comprobada antes de implementar.
2. Entregar US1 como MVP de lectura; validar su criterio independiente sin órdenes.
3. Añadir US2 y validar compra, cancelación, rechazo e incertidumbre antes de añadir venta.
4. Añadir US3 y validar venta parcial y total sin depender de una compra en ese recorrido.
5. Ejecutar regresiones y aceptación manual, registrar evidencia y obtener la revisión formal prevista por la constitución antes de considerar terminada la feature.

## Traceability & Validation

| Requisitos | Tareas principales |
|---|---|
| FR-001–005, FR-008, FR-013, SC-001 | T003–T014, T032 |
| FR-006–007, FR-009–011, FR-014–016, SC-002–004 | T015–T030, T032 |
| FR-012, FR-017–018, SC-003, SC-005 | T009, T011, T017, T020, T023, T026, T029, T032 |
| FR-019–022, SC-006–007 | T013–T014, T021–T023, T030, T032–T033 |

33 tareas: Setup 2, Foundation 5, US1 7, US2 9, US3 7, Polish 3. Diez tareas marcadas `[P]`. Todas las tareas usan checkbox, ID secuencial, etiqueta de historia donde corresponde y rutas concretas. Ninguna tarea de implementación queda marcada como completada por generar esta lista.
