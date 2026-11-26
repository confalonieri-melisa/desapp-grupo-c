# Tasks: Compra y venta P2P desde el perfil del jugador

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/p2p-trading-ui.md y quickstart.md de specs/019-p2p-trading-frontend.

**Alcance**: Frontend P2P y una consulta autenticada de solo lectura para disponibilidad del pool por jugador. Se agregan ruta, servicio y repositorio de lectura; no se modifican mutaciones, reglas financieras, tablas ni migraciones. La venta al pool deja de mostrarse en el frontend, sin cambiar su backend. La especificación sigue en estado Draft y requiere aprobación formal de la Project Owner antes de implementar, conforme a la constitución.

**Tests**: Se incluyen pruebas de comportamiento pedidas para los recorridos y riesgos financieros. Redactarlas antes de la implementación correspondiente y comprobar que fallan por la conducta ausente; evitar pruebas de markup declarativo o configuración.

**Formato**: [P] indica trabajo en archivos distintos sin depender de otra tarea incompleta de la misma fase. [USn] identifica la historia.

## Phase 1: Setup

**Purpose**: Preparar datos reutilizables para los recorridos de frontend sin duplicar entidades del backend.

- [X] T001 Crear fixtures de respuestas HTTP P2P, dos identidades INVESTOR, ofertas propias y ajenas, portfolio y comprobante en tests/unit/features/profile/fixtures/p2p-ui.ts; usar UUID distintos y una oferta cuyo precio difiera de la cotización.

**Checkpoint**: Hay datos representativos para lista, publicación, aceptación, cancelación y cambios de sesión o jugador.

---

## Phase 2: Foundational

**Purpose**: Proveer una lectura única de ofertas abiertas y un estado aislado por sesión y jugador para todas las historias.

- [X] T002 [P] Escribir pruebas de GET /api/p2p/offers?playerId en tests/unit/services/client.p2p-offers.service.spec.ts: Bearer JWT, filtro del jugador, arreglo OPEN, respuesta malformada, 401 y error real en el campo error.
- [X] T003 [P] Escribir pruebas de carga inicial, lista vacía, error con reintento, refresco explícito, ausencia de polling y descarte de respuestas tardías al cambiar token o playerId en tests/unit/features/profile/use-p2p-offers.spec.ts; un 401 del GET debe invocar onUnauthorized y limpiar lista, borrador, confirmación y datos protegidos.
- [X] T004 Implementar DTO de oferta y lectura tipada de GET /api/p2p/offers?playerId en src/frontend/services/client/p2p-offers.service.ts; preservar status y error de la respuesta, sin esperar nombres públicos ni ofertas cerradas. Depende de T002.
- [X] T005 Implementar estado de lista compartida idle/loading/ready/empty/error/refreshing en src/frontend/features/profile/hooks/useP2POffers.ts; aislar por token y playerId, cancelar o ignorar lecturas obsoletas, no habilitar una oferta anterior como vigente durante refreshing y, ante 401 del GET, invocar onUnauthorized y retirar estado protegido. Depende de T003 y T004.

**Checkpoint**: Una sola lectura alimenta el listado mixto de «Comprar»; un usuario o jugador nuevo nunca recibe ofertas del contexto anterior.

---

## Phase 3: User Story 1 - Comprar una oferta P2P completa (Priority: P1) 🎯 MVP

**Goal**: Comparar la compra al pool con ofertas P2P del jugador y aceptar una oferta ajena completa, con comprobante real y recuperación segura.

**Independent Test**: Con una oferta abierta creada fuera de esta interfaz, el comprador la ve en el perfil, revisa el total fijo, confirma una sola aceptación y observa comprobante, portfolio y lista actualizados. Una oferta propia no se puede aceptar.

### Tests for User Story 1

- [X] T006 [P] [US1] Probar filtro de oferta propia por sellerId === user.id, etiqueta basada en sellerId con identificador completo disponible, total monetario de oferta y bloqueo por saldo ausente/insuficiente en tests/unit/features/profile/p2p-trading.spec.ts; distinguir precio fijo de cotización del pool.
- [X] T007 [P] [US1] Probar POST /api/p2p/offers/{id}/accept en tests/unit/services/client.p2p-offers.service.spec.ts: Bearer, Idempotency-Key estable, sin cantidad/precio en request, 201 con operation/account/holding, replay compatible y respuesta 201 malformada como incierta.
- [X] T008 [P] [US1] Probar confirmación cancelada sin POST, doble activación con un solo POST, clave nueva para intención nueva y clave conservada para reintento manual de la misma aceptación incierta en tests/unit/features/profile/use-p2p-offers.spec.ts; cubrir 401 de aceptación con onUnauthorized y limpieza, 403/404/409 conocidos, 4xx genéricos, red/5xx, cambio de jugador/sesión, listas obsoletas y comprobante 201 conservado si falla el refresco de portfolio o de ofertas.
- [X] T009 [P] [US1] Probar en tests/unit/features/profile/player-p2p-section.spec.tsx la oferta completa sin campo de cantidad parcial, oferta propia sin Comprar, datos de confirmación, Escape/foco, P2P operable sin cotización mientras el pool queda indisponible y ausencia de controles operativos para SUPERUSER desde esta primera historia.
- [X] T010 [US1] Probar en tests/unit/features/profile/use-player-trading.spec.ts que el refresco de portfolio expone un resultado awaitable de éxito o fallo, sin inferirlo de un snapshot anterior, y que la compra al pool sigue usando su refresco actual; la persistencia del comprobante P2P se prueba en T008.

### Implementation for User Story 1

- [X] T011 [US1] Implementar cálculo monetario a dos decimales, identidad de vendedor derivada solo de sellerId, oferta propia y validación de saldo vigente en src/frontend/features/profile/utils/p2p-trading.ts; no calcular un comprobante final a partir del precio visible. Depende de T006.
- [X] T012 [US1] Añadir aceptación tipada y validación de forma del 201 en src/frontend/services/client/p2p-offers.service.ts; enviar Idempotency-Key, devolver operation/account/holding reales y clasificar error/resultado incierto conforme a contracts/p2p-trading-ui.md. Depende de T007.
- [X] T013 [US1] Exponer en src/frontend/features/profile/hooks/usePlayerTrading.ts un refresco de portfolio awaitable con resultado de éxito/error, conservando retryPortfolio y la compra al pool existente; añadir o adaptar la prueba de T010 sin inferir éxito por un snapshot anterior.
- [X] T014 [US1] Incorporar en src/frontend/features/profile/hooks/useP2POffers.ts confirmación, intento único y resultado de aceptación; usar la misma clave solo para reintento manual de la misma oferta, refrescar lista y portfolio por separado tras 201, conservar comprobante si falla cualquiera y marcar los datos no confirmados; ante 401 de aceptación, invocar onUnauthorized y retirar lista, borrador, confirmación y comprobante protegidos. Depende de T005, T008, T011, T012 y T013.
- [X] T015 [US1] Crear la lista de ofertas abiertas de Comprar en src/frontend/features/profile/components/PlayerTradingSection/P2POfferList.tsx con vendedor identificable, cantidad completa, precio fijo, total, oferta propia sin Comprar y estados loading/empty/error/refreshing con reintento. Depende de T011 y T014.
- [X] T016 [US1] Crear la variante accept de confirmación accesible en src/frontend/features/profile/components/PlayerTradingSection/P2PConfirmationDialog.tsx; mostrar jugador, oferta, cantidad completa, precio y total, foco inicial, Escape, cancelación sin POST y retorno de foco. Depende de T014.
- [X] T017 [US1] Crear progreso, comprobante del 201, rechazo comprobado, incertidumbre y refrescos fallidos independientes en src/frontend/features/profile/components/PlayerTradingSection/P2PFeedback.tsx; nunca atribuir compra a una oferta que desapareció sin comprobante. Depende de T014.
- [X] T018 [US1] Integrar user.id, la lista y el flujo de aceptación en src/app/players/[id]/page.tsx y src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx; conectar onUnauthorized al logout/redirección existente, mostrar controles de aceptación solo a INVESTOR desde US1, presentar Comprar al pool y P2P con etiquetas distintas, mantener el resumen existente y agregar los estilos mínimos en src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss. Depende de T015–T017 y T009.

**Checkpoint**: US1 funciona con una oferta preexistente, con y sin cotización; un rechazo o respuesta incierta nunca muestra un comprobante inventado.

---

## Phase 4: User Story 2 - Publicar una oferta de venta (Priority: P1)

**Goal**: Publicar desde el perfil una oferta P2P a precio fijo sin reservar ni transferir tokens.

**Independent Test**: Un inversor con posición ingresa cantidad y precio, revisa el total y la ausencia de reserva, publica y ve su oferta abierta; cancelar la confirmación o ingresar valores inválidos no envía POST.

### Tests for User Story 2

- [X] T019 [P] [US2] Probar en tests/unit/features/profile/p2p-trading.spec.ts cantidad entera positiva no mayor que tenencia ni 2.147.483.647; precio positivo con máximo dos decimales y 99.999.999,99 créditos; total máximo 9.999.999.999,99; texto inválido, cero, fracción y portfolio ausente/refreshing.
- [X] T020 [P] [US2] Probar en tests/unit/services/client.p2p-offers.service.spec.ts POST /api/p2p/offers con solo playerId, quantity y unitPrice, Bearer JWT, 201 con oferta OPEN, errores con campo error y respuesta incierta; no enviar sellerId.
- [X] T021 [P] [US2] Probar en tests/unit/features/profile/use-p2p-offers.spec.ts cancelación de confirmación con borrador conservado, un solo POST, oferta publicada sin cambio artificial de saldo/tenencia, refresco de lista, rechazo 409, publicación incierta sin reenvío automático y 401 de publicación con onUnauthorized y limpieza; tras 201, la oferta aparece como ítem propio confirmado localmente en el listado de «Comprar» mientras GET está pendiente o falla, y un GET exitoso prevalece: la muestra una sola vez si sigue abierta o la retira si ya no aparece.
- [X] T022 [P] [US2] Probar en tests/unit/features/profile/player-p2p-section.spec.tsx etiquetas y errores asociados a cantidad/precio, total, aviso de tokens no reservados y diálogo con foco/Escape; tras publicar, «Vender (P2P)» indica cómo ir a «Comprar» y la oferta aparece allí identificada como propia.

### Implementation for User Story 2

- [X] T023 [US2] Agregar parseo y validación de borrador de publicación en src/frontend/features/profile/utils/p2p-trading.ts con los topes exactos de T019, sin convertir texto inválido a número JSON. Depende de T019.
- [X] T024 [US2] Añadir publicación tipada a src/frontend/services/client/p2p-offers.service.ts; aceptar solo 201 con oferta OPEN válida y clasificar red/5xx o respuesta no verificable como incierta. Depende de T020.
- [X] T025 [US2] Ampliar src/frontend/features/profile/hooks/useP2POffers.ts con borrador por token/playerId, confirmación de publicación, un solo envío, estado rejected/uncertain/succeeded y refresco de lista después del éxito; conservar la oferta del 201 como ítem propio confirmado localmente para el listado de «Comprar» mientras GET está pendiente o falla, marcar el resto de la lista no actualizado y hacer prevalecer el GET exitoso, sin duplicarla si sigue abierta ni mantenerla si desapareció; no modificar portfolio por publicar y, ante 401, invocar onUnauthorized y retirar estado protegido. Depende de T021, T023 y T024.
- [X] T026 [US2] Crear formulario en src/frontend/features/profile/components/PlayerTradingSection/P2PPublishForm.tsx y variante publish en src/frontend/features/profile/components/PlayerTradingSection/P2PConfirmationDialog.tsx; mostrar tenencia, campos y errores, total, jugador y aviso de no reserva; cancelar conserva borrador. Depende de T022 y T025.
- [X] T027 [US2] Agregar la vista «Vender (P2P)» y una indicación de acceso a «Comprar» tras publicar en src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx; mostrar la oferta del 201 como propia y confirmada localmente en el único listado de «Comprar» de src/frontend/features/profile/components/PlayerTradingSection/P2POfferList.tsx mientras GET está pendiente o falla, señalar el resto como no actualizado y hacer prevalecer el GET exitoso; conservar el resultado en src/frontend/features/profile/components/PlayerTradingSection/P2PFeedback.tsx y agregar estilos mínimos en src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss. Depende de T026.

**Checkpoint**: US2 puede probarse sin cancelación de ofertas: la nueva oferta aparece identificada como propia y OPEN en el listado de «Comprar», sin presentar publicación como una venta ejecutada.

---

## Phase 5: User Story 3 - Cancelar una oferta propia desde el listado (Priority: P2)

**Goal**: Distinguir ofertas OPEN propias entre las ajenas del mismo jugador y cancelarlas desde el único listado de «Comprar», con confirmación.

**Independent Test**: El vendedor identifica una oferta propia entre ofertas ajenas en «Comprar», cancela una sola vez y verifica que desaparece del listado; una oferta ajena no expone Cancelar.

### Tests for User Story 3

- [ ] T028 [P] [US3] Probar DELETE /api/p2p/offers/{id} con Bearer y éxito 204 sin cuerpo, 404/409 y resultado incierto en tests/unit/services/client.p2p-offers.service.spec.ts.
- [ ] T029 [P] [US3] Probar en tests/unit/features/profile/use-p2p-offers.spec.ts confirmación abandonada sin DELETE, intento único, 204 con refresco, oferta cerrada concurrentemente, cancelación incierta sin atribuir su desaparición a la solicitud y 401 de cancelación con onUnauthorized y limpieza; tras 204 seguido de GET fallido, conservar cancelación confirmada y no dejar la oferta cancelada operable en la lista anterior.
- [ ] T030 [P] [US3] Probar en tests/unit/features/profile/player-p2p-section.spec.tsx un único listado de «Comprar» con ofertas OPEN propias y ajenas: Comprar solo en ajenas y Cancelar solo en propias, sin panel ni estado vacío separado para propias; probar confirmación de cancelación con foco, Escape y retorno de foco.

### Implementation for User Story 3

- [ ] T031 [US3] Implementar cancelación tipada en src/frontend/services/client/p2p-offers.service.ts; aceptar 204 sin parsear JSON y conservar status/error real en rechazos. Depende de T028.
- [ ] T032 [US3] Ampliar src/frontend/features/profile/hooks/useP2POffers.ts con confirmación y envío único de cancelación, refresco de lista tras 204, rechazo/resultado incierto y aislamiento por sesión y jugador; conservar el 204 confirmado ante GET fallido, retirar o bloquear la oferta cancelada del estado operable anterior y activar onUnauthorized con limpieza ante 401. Depende de T029 y T031.
- [ ] T033 [US3] Ampliar el único listado de «Comprar» en src/frontend/features/profile/components/PlayerTradingSection/P2POfferList.tsx con Cancelar inline para ofertas propias, manteniendo Comprar para ajenas, y agregar la variante cancel en src/frontend/features/profile/components/PlayerTradingSection/P2PConfirmationDialog.tsx; completar src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx y src/frontend/features/profile/components/PlayerTradingSection/P2PFeedback.tsx con cancelación 204 confirmada persistente ante GET fallido y lista anterior sin acciones sobre la oferta cancelada, sin panel ni vacío de propias; agregar estilos mínimos en src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss. Depende de T030 y T032.

**Checkpoint**: US3 no depende de un historial de ofertas cerradas ni de nombres de vendedores; una ausencia posterior a un resultado incierto no se atribuye a una causa no probada.

---

## Phase 6: User Story 4 - Mostrar compra al pool según disponibilidad (Priority: P2)

**Goal**: Consultar el inventario actual del pool por jugador y ofrecer la compra central solo cuando hay tokens, sin mostrar venta al pool.

**Independent Test**: Con disponibilidad positiva y cotización, la compra central aparece y limita la cantidad al inventario consultado. Con cero se oculta; con carga o error no se habilita ni se finge cero. Una compra que agota el pool refresca la disponibilidad y oculta la acción, mientras P2P sigue visible.

### Tests for User Story 4

- [ ] T034 [P] [US4] Probar en tests/unit/services/pool-availability.service.spec.ts jugador existente con cantidad positiva o cero, jugador inexistente con 404, independencia de cotización y respuesta limitada a playerId y availableQuantity, sin identidad ni saldo del SUPERUSER.
- [ ] T035 [P] [US4] Probar con PostgreSQL en tests/integration/pool-availability.repository.spec.ts la lectura del mismo pool canónico SUPERUSER que usa el trading central: tenencia positiva, cero o ausente, jugador filtrado y ninguna escritura al consultar.
- [ ] T036 [P] [US4] Probar en tests/integration/pool-availability.routes.spec.ts GET /api/players/{id}/pool-availability con JWT obligatorio, UUID inválido 400, jugador inexistente 404 y 200 con {playerId, availableQuantity} entero no negativo; no aceptar poolId/userId ni exponer datos del SUPERUSER.
- [ ] T037 [P] [US4] Probar en tests/unit/services/client.pool-availability.service.spec.ts GET autenticado de /api/players/{id}/pool-availability, 200 positivo/cero, respuesta malformada, 401/404 y fallo de red sin convertirlo en disponibilidad cero.
- [ ] T038 [P] [US4] Probar en tests/unit/features/profile/use-pool-availability.spec.ts carga, positivo, cero, error con reintento, 401 con onUnauthorized, aislamiento por token/playerId y respuestas tardías; tras compra central 201 reconsultar y pasar a cero si se agotó el inventario.
- [ ] T039 [P] [US4] Probar en tests/unit/features/profile/player-trading-page.spec.ts, tests/unit/features/profile/player-p2p-section.spec.tsx y tests/unit/features/profile/use-player-trading.spec.ts compra al pool visible solo con disponibilidad positiva, cantidad no mayor que availableQuantity, ocultamiento a cero y tras compra que agota existencias, estado de carga/error sin compra y con reintento, cotización ausente, P2P visible, SUPERUSER sin controles y ninguna venta al pool visible; preservar validación, confirmación y comprobante de compra central.

### Implementation for User Story 4

- [ ] T040 [US4] Implementar en src/backend/repositories/pool-availability.repository.ts una consulta de solo lectura a la tenencia del pool canónico SUPERUSER para playerId, coherente con la selección del trading central; devolver entero no negativo y cero cuando no hay tenencia, sin mutar ni exponer datos de la cuenta. Depende de T035.
- [ ] T041 [US4] Implementar en src/backend/services/pool-availability.service.ts la validación de jugador existente mediante PlayerRepository y la respuesta {playerId, availableQuantity} desde PoolAvailabilityRepository, sin depender de cotización ni cambiar reglas de compra. Depende de T034 y T040.
- [ ] T042 [US4] Crear src/backend/controllers/pool-availability.controller.ts que delegue únicamente al servicio la lectura de disponibilidad del jugador. Depende de T041.
- [ ] T043 [US4] Crear GET en src/app/api/players/[id]/pool-availability/route.ts con requireAuth, validación del UUID de jugador, observabilidad y toHttpResponse existentes; no aceptar identidad de pool/usuario enviada por el cliente ni escribir datos. Depende de T036 y T042.
- [ ] T044 [US4] Documentar el GET read-only /players/{id}/pool-availability en specs/001-player-token-marketplace/contracts/openapi.yaml y specs/001-player-token-marketplace/contracts/postman_collection.json: Bearer JWT, parámetro UUID, respuesta 200 {playerId, availableQuantity}, errores 400/401/404 y ejemplo positivo/cero, sin exponer datos del SUPERUSER. Depende de T043.
- [ ] T045 [US4] Implementar cliente tipado de disponibilidad en src/frontend/services/client/pool-availability.service.ts con Bearer JWT y respuesta validada {playerId, availableQuantity}, preservando status/error y distinguiendo fallo de cero real. Depende de T037 y T043.
- [ ] T046 [US4] Implementar src/frontend/features/profile/hooks/usePoolAvailability.ts con estado loading/success/error, reintento, onUnauthorized, aislamiento por token/playerId y refresco al confirmarse una compra central; no reutilizar un valor anterior como disponibilidad vigente. Depende de T038 y T045.
- [ ] T047 [US4] Ajustar src/frontend/features/profile/utils/player-trading.ts, src/frontend/features/profile/hooks/usePlayerTrading.ts y src/frontend/features/profile/components/PlayerTradingSection/PlayerOrderForm.tsx para validar que la cantidad central no supere availableQuantity vigente, conservar confirmación/comprobante de compra y retirar el control visible de venta al pool sin modificar su backend. Depende de T039 y T046.
- [ ] T048 [US4] Conectar disponibilidad en src/app/players/[id]/page.tsx y src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.tsx: mostrar compra al pool solo con cantidad >0, ocultarla a cero, indicar loading/error con reintento sin habilitar compra, reconsultar tras 201 central y ocultar al agotarse; conservar P2P independiente de cotización e inventario central y solo controles operativos para INVESTOR. Depende de T047 y T033.

**Checkpoint**: El endpoint es de solo lectura y no filtra identidad ni saldo del pool; la compra central se oculta a cero o tras agotar inventario, no se muestra venta central y P2P sigue utilizable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Terminar presentación, accesibilidad y validación integral sin ampliar el alcance.

- [ ] T049 Ajustar src/frontend/features/profile/components/PlayerTradingSection/PlayerTradingSection.module.scss para jerarquía visual inspirada vagamente en el mockup, foco visible y anchos de 360/1280 px sin recortes; omitir cifras, porcentajes y gráficos no sustentados por datos reales.
- [ ] T050 Ejecutar los tests conductuales de frontend, servicio de disponibilidad y rutas/repositorio de lectura con PostgreSQL, además de npm run build; corregir solo fallos atribuibles a esta feature en sus archivos modificados y documentar límites reales en specs/019-p2p-trading-frontend/quickstart.md.
- [ ] T051 Recorrer la matriz manual de specs/019-p2p-trading-frontend/quickstart.md con dos inversores y SUPERUSER: ejecutar el nuevo GET desde specs/001-player-token-marketplace/contracts/postman_collection.json con disponibilidad positiva/cero, compra P2P, publicación, cancelación, compra al pool con disponibilidad positiva/cero/loading/error, compra central que agota existencias y oculta la acción, ausencia de venta central visible, cotización ausente, rechazo, red incierta, foco/Escape, sesión/jugador y anchos 360/1280; registrar resultados verificables en el mismo archivo.

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 prepara fixtures; Phase 2 depende de T001 y bloquea las historias.
- US1, US2 y US3 usan el cliente y la lista común. Para este diseño de archivos, ejecutar US1 → US2 → US3 evita cambios simultáneos sobre useP2POffers.ts, PlayerTradingSection.tsx y los tests compartidos. Cada historia conserva su prueba independiente usando ofertas preparadas.
- US4 agrega la consulta de solo lectura y ajusta la composición completa tras US1–US3. Phase 7 depende de las cuatro historias.

### User Story Dependencies

- **US1**: T001–T005; no requiere publicar desde la UI porque puede consumir una oferta abierta preexistente.
- **US2**: T001–T005 y los componentes de confirmación/feedback creados por US1; se valida sin la acción de cancelar de US3.
- **US3**: T001–T005 y el listado compartido de «Comprar» ampliado en US2; agrega Cancelar inline a las ofertas propias sin cambiar el contrato de oferta.
- **US4**: Requiere composición US1–US3 para verificar coexistencia; sus pruebas de servicio, repositorio y ruta de lectura pueden prepararse de forma independiente antes de integrar cliente y UI.

### Within Each Story

- Escribir los tests conductuales de la fase antes de sus tareas de implementación y comprobar la falla por comportamiento ausente.
- Cliente HTTP y utilidades anteceden al hook de mutación; hook antecede a la conexión visual.
- Las marcas [P] solo habilitan trabajos de archivos distintos dentro de una fase después de cumplir sus predecesores. No ejecutar en paralelo tareas que escriban el mismo archivo.

### Parallel Opportunities

- Tras T001, T002 y T003 pueden redactarse en paralelo; T004 y T005 son secuenciales.
- En US1, T006–T009 pueden redactarse en paralelo; T010 modifica otro archivo pero comparte la revisión de la aceptación. T011 y T012 pueden avanzar en paralelo después de sus tests.
- En US2, T019–T022 pueden redactarse en paralelo y, después, T023 y T024 implementan archivos distintos.
- En US3, T028–T030 pueden redactarse en paralelo; T031 y los componentes de T033 no comparten archivo, pero T033 depende del hook T032.
- En US4, T034–T039 pueden redactarse en paralelo en archivos de prueba distintos; T040–T043 implementan la lectura backend en orden, T044 documenta su contrato público y T045–T048 conectan cliente, hook y UI.

## Parallel Example: User Story 1

Una vez completada Phase 2, se pueden redactar a la vez T006 (tests de utilidades), T007 (contrato HTTP de aceptación), T008 (estado del hook) y T009 (interacción visible). T011 y T012 implementan archivos separados tras esos tests. T014 reúne esas piezas; T018 integra la pantalla al final.

## Parallel Example: User Story 2

Después de US1, se pueden redactar a la vez T019 (límites de borrador), T020 (POST), T021 (estado de publicación) y T022 (formulario). T023 y T024 implementan utilidades y cliente sin tocar el mismo archivo. T025–T027 completan la historia en orden.

## Parallel Example: User Story 3

Después de US2, T028–T030 pueden redactarse a la vez para DELETE, estado y acciones del listado mixto. T031 agrega el cliente; T032 lo usa; T033 expone Cancelar inline en «Comprar».

## Parallel Example: User Story 4

Después de US3, T034–T039 pueden redactarse a la vez para servicio, repositorio, ruta, cliente, hook y pantalla. T040–T043 implementan la consulta backend sin mutaciones; T044 actualiza OpenAPI y Postman; T045–T048 conectan la disponibilidad con la compra central.

## Implementation Strategy

### MVP First

Completar Setup, Foundational y US1; validar una compra P2P completa contra una oferta ya publicada. US2 permite publicar desde la UI; US3 agrega cancelación; US4 incorpora la disponibilidad del pool de solo lectura, oculta compra a cero y retira la venta central visible; el pulido verifica la experiencia integrada.

### Incremental Delivery

Cada historia se prueba con su recorrido independiente y sin esperar a que existan funciones posteriores. La única API nueva es GET /api/players/{id}/pool-availability; no fusionar la lógica del pool con P2P ni añadir una API para nombres o historial. La aprobación formal de la Project Owner precede a la implementación y entrega.
