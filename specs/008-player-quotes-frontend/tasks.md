# Tasks: Cotizaciones desde el perfil del jugador

**Input**: Documentos de `specs/008-player-quotes-frontend/`: plan.md, spec.md, research.md, data-model.md, contracts/player-quotes-ui.md y quickstart.md.

**Prerequisites**: Diseño disponible; antes de implementar, comprobar aprobación de spec.md conforme a la constitución. El estado actual `Ready for Review` no acredita esa aprobación. Generar este backlog no ejecuta implementación ni acciones externas.

**Tests**: Incluidos por los escenarios y criterios verificables explícitos de la especificación. Usar Vitest existente, entorno Node y promesas controladas; verificar DOM y accesibilidad en navegador según quickstart.md. Escribir las pruebas conductuales antes del cambio correspondiente y comprobar el fallo pertinente.

**Organization**: Una fase por historia. Rutas relativas a la raíz. `[P]` señala trabajo en archivos distintos que puede ejecutarse en paralelo tras sus prerrequisitos; no autoriza cambios simultáneos en archivos compartidos.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar validación sin incorporar dependencias, migraciones ni infraestructura productiva.

- [ ] T001 Comprobar aprobación previa a implementación y registrar prerrequisitos locales, disponibilidad de PostgreSQL de prueba y comandos de validación en specs/008-player-quotes-frontend/quickstart.md; reutilizar package.json y .env.example, sin sobrescribir .env existente ni depender del db:seed inexistente.
- [ ] T002 Preparar fixtures de aceptación con jugador A, jugador B sin quotes, empates, segundos/fracciones, ceros, teamScore nulo y JSON anidado en tests/unit/features/profile/fixtures/player-quotes.ts, basados en specs/008-player-quotes-frontend/data-model.md; no agregar escrituras productivas.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cliente de lectura y aislamiento seguro del perfil, comunes a todas las historias.

- [ ] T003 [P] Cubrir GET autenticado, URL codificada, omisión de date, string calendario exacto, AbortSignal, conservación del orden/payload y status/mensaje de errores 400/401/404/500/red en tests/unit/services/client.player-quotes.service.spec.ts.
- [ ] T004 [P] Extender tests/unit/services/client.player.service.spec.ts para comprobar errores compatibles con Error que conservan status/mensaje sin cambiar las firmas ni el comportamiento exitoso existentes.
- [ ] T005 Implementar DTO serializado, JSON recursivo y getPlayerQuotes(token, playerId, date?, signal?) en src/frontend/services/client/player-quotes.service.ts: GET exclusivo con Bearer y URLSearchParams; playerId «string UUID», quoteValue «Valor recibido, cero válido», unit `CREDIT_PER_TOKEN`, calculatedAt «string ISO UTC», strategyCode «Código recibido, sin catálogo cerrado nuevo», strategyVersion «Versión recibida», score «API actual lo garantiza; presentación tolera ausencia»; números de scores toleran null/ausencia al presentar y components conserva objetos, arrays, strings, números, booleanos y null. No usar Date/id de persistencia ni normalizar, ordenar o completar datos.
- [ ] T006 Conservar status y mensaje de errores HTTP en src/frontend/services/client/player.service.ts, manteniendo compatibilidad con Error y consumidores existentes; depende de T004.
- [ ] T007 Ampliar el harness React existente en tests/unit/features/profile/use-player-profile.spec.ts para rerender/cleanup y promesas diferidas; cubrir cambio de jugador/token, ocultación inmediata de identidad anterior y éxito/error/401/finally obsoletos sin eliminar pruebas existentes.
- [ ] T008 Corregir src/frontend/features/profile/hooks/usePlayerProfile.ts para invalidar solicitudes por identidad/generación/abort, retirar datos previos antes de exponer un perfil nuevo y evitar efectos de errores tardíos; conservar callback de autorización actualizado sin recargar por su identidad. Depende de T006–T007.

**Checkpoint**: Cliente tipado listo; perfil confirmado y errores de identidad/sesión utilizables sin residuos. T001–T008 bloquean las historias.

## Phase 3: User Story 1 — Conocer la cotización actual (Priority: P1) — Primer incremento verificable

**Goal**: Mostrar el primer registro del historial en el perfil autenticado y recuperar fallos sin salir de él.

**Independent Test**: Desde catálogo abrir A como INVESTOR y SUPERUSER, comparar valor/unidad/instante/estrategia/versión con items[0]; abrir B y comprobar ausencia, simular carga/500 y recuperación. No operar historial, fecha ni explicación.

### Tests

- [ ] T009 [P] [US1] Crear harness de rerender/cleanup y pruebas del canal historial en tests/unit/features/profile/use-player-quotes.spec.ts: una carga por identidad válida, actual = items[0], loading/empty/error, reintentos superpuestos, cambio de jugador/token/desmontaje y éxitos/errores/401/finally tardíos; cambiar solo el callback de logout no dispara otra lectura.
- [ ] T010 [P] [US1] Probar fidelidad de valor cero, unidad y timestamp UTC con segundos y fracción recibida, sin redondeo ni conversión porcentual, en tests/unit/features/profile/player-quotes.spec.ts.

### Implementation

- [ ] T011 [US1] Implementar formato de valor/unidad e instante en src/frontend/features/profile/utils/player-quotes.ts, respetando «Mantener segundos/fracciones y zona explícita» y «Valor recibido, cero válido» del modelo; depende de T010.
- [ ] T012 [US1] Crear canal historial en src/frontend/features/profile/hooks/usePlayerQuotes.ts con estados idle/loading/success/empty/error, jugador/token/generación y AbortController; habilitar solo con perfil confirmado, actual = history.items[0], reintento explícito y comprobación de vigencia antes de éxito/catch/unauthorized/finally. Mantener callback actualizado mediante referencia; retirar datos ante 401 vigente y comunicar jugador inexistente/identificador inválido sin clasificarlos como vacío. Depende de T009 y T005.
- [ ] T013 [US1] Crear resumen reutilizable en src/frontend/features/profile/components/QuoteSummary/QuoteSummary.tsx con valor, «créditos por token», fecha/hora UTC completa, estrategia y versión, sin usar currentQuote del perfil; depende de T011.
- [ ] T014 [US1] Crear src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.tsx y src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.module.scss con resumen actual, carga perceptible, ausencia específica, error/reintento, anuncios accesibles y wrapping a 360/1280 px; integrar T012–T013 sin bloquear el resto del perfil por fallo aislado.
- [ ] T015 [US1] Integrar la sección solo para el jugador confirmado en src/app/players/[id]/page.tsx, aislando montaje por identidad; reutilizar logout y router.replace('/login'), retirar datos protegidos al vencer sesión y mostrar jugador inválido/no encontrado con vuelta al catálogo, conservando navegación y acceso equivalente de ambos roles.

**Checkpoint**: US1 verificable como primer incremento sin controles de las historias posteriores. El alcance de entrega del MVP comprende las cuatro historias de spec.md.

## Phase 4: User Story 2 — Recorrer el historial completo (Priority: P2)

**Goal**: Hacer consultables todas las entradas en la secuencia recibida, incluidos empates.

**Independent Test**: Comparar cantidad, secuencia y cinco datos de cada fila con el GET; verificar dos registros de un día, empates exactos, historial vacío y contenido largo sin usar fecha ni explicación.

### Tests

- [ ] T016 [US2] Extender tests/unit/features/profile/use-player-quotes.spec.ts con historial completo, orden recibido, registros idénticos separados, identidad local jugador/superficie/generación/índice y renovación de dataset; comprobar que el historial se obtiene de la carga existente sin requests por fila.

### Implementation

- [ ] T017 [US2] Exponer historial y generación de dataset en src/frontend/features/profile/hooks/usePlayerQuotes.ts sin sort, deduplicación, agrupación ni selección adicional; mantener distinción entre éxito vacío y fallo. Depende de T016.
- [ ] T018 [US2] Crear src/frontend/features/profile/components/QuoteHistory/QuoteHistory.tsx usando QuoteSummary para todos los items, posición visible y claves locales por generación/índice, sin depender de timestamp o id público; incluir «No existen cotizaciones históricas». Depende de T017.
- [ ] T019 [US2] Integrar QuoteHistory en src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.tsx y adaptar src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.module.scss para lista completa, empates y valores extensos accesibles en ambos anchos, reutilizando la única lectura de historial.

**Checkpoint**: Historial y actual verificables sin consulta puntual ni explicación.

## Phase 5: User Story 3 — Consultar el valor disponible hasta una fecha (Priority: P2)

**Goal**: Consultar una fecha calendario manteniendo independientes historial y actual.

**Independent Test**: Consultar fecha exacta, sin cálculo ese día, anterior al primero y futura; comparar con backend, distinguir fecha pedida de instante efectivo; editar/limpiar/reintentar y resolver solicitudes fuera de orden sin alterar historial/actual.

### Tests

- [ ] T020 [P] [US3] Extender tests/unit/features/profile/player-quotes.spec.ts con calendario real YYYY-MM-DD, vacío/formato inválido, fin de mes, 2028-02-29 válido, 2026-02-29 y 2026-02-30 inválidos, compatibilidad del backend para años 0000–0099 y futuro válido; comprobar con tests/unit/services/client.player-quotes.service.spec.ts fecha exacta en UTC−03 y UTC+14 sin conversión a instante.
- [ ] T021 [P] [US3] Extender tests/unit/features/profile/use-player-quotes.spec.ts con selectedDate/requestedDate independientes, cambio sin consultar, ausencia puntual reconocida, 400 de fecha, 404 de jugador, errores desconocidos, error parcial, limpiar en carga/éxito/error, reintentar criterio vigente, B antes que A y éxito/error/401/finally obsoletos; historial/actual intactos.

### Implementation

- [ ] T022 [US3] Añadir validación calendario compatible con backend en src/frontend/features/profile/utils/player-quotes.ts sin calcular cutoff ni convertir zona; permitir futuro, rechazar fechas inexistentes y conservar string exacto. Depende de T020.
- [ ] T023 [US3] Añadir canal puntual independiente a src/frontend/features/profile/hooks/usePlayerQuotes.ts con selectedDate/requestedDate, estados y generación/abort propios; editar/limpiar invalida inmediatamente pendientes y detalle puntual; reintentar valida criterio vigente. Reconocer ausencia solo por 404 `Quote not available for the requested date` con perfil confirmado; 400 `Invalid date` va al control, 404 `Player not found` y 400 `Invalid player id` retiran cotizaciones, 401 vigente aplica flujo existente y fallos restantes permiten reintento. Depende de T021–T022.
- [ ] T024 [US3] Crear src/frontend/features/profile/components/QuoteDateQuery/QuoteDateQuery.tsx con label/input date, Consultar/Limpiar/Reintentar, aria-describedby/aria-invalid y anuncios; permitir reemplazar cargas, retirar vigencia al editar, mostrar fecha solicitada separada del instante efectivo, regla temporal y ausencia específica; sin max=hoy ni bloqueo de historial. Depende de T023.
- [ ] T025 [US3] Integrar consulta puntual en src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.tsx y sus estilos en src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.module.scss; consultar no roba foco y limpiar mantiene foco, el error puntual conserva actual/historial y cada acción usa jugador/criterio vigentes.

**Checkpoint**: Consulta puntual completa e independiente de recorrer filas o abrir explicación.

## Phase 6: User Story 4 — Comprender una cotización (Priority: P3)

**Goal**: Mostrar explicación persistida completa de cada registro sin lecturas adicionales ni cálculos.

**Independent Test**: Abrir detalles de actual, filas y resultado puntual; comparar scores/componentes, null/ausencia, cero/false, arrays/objetos anidados y vacíos; reemplazar dataset/cambiar fecha/jugador y comprobar cierre y asociación correcta.

### Tests

- [ ] T026 [P] [US4] Extender tests/unit/features/profile/player-quotes.spec.ts para proyección recursiva de componentes preservando nombres/estructura/valores, cero/false, null interno, scores ausentes y colecciones vacías, sin fórmulas, defaults ni mezcla de registros.
- [ ] T027 [P] [US4] Extender tests/unit/features/profile/use-player-quotes.spec.ts para comprobar renovación de identidad de datasets al reintentar y aislamiento de identidad entre superficies; cambio de fecha renueva solo puntual, cambio de jugador/token renueva todas. Verificar cierre DOM de details en la aceptación manual de quickstart.md.

### Implementation

- [ ] T028 [US4] Añadir en src/frontend/features/profile/utils/player-quotes.ts la proyección de presentación necesaria para scores y JSON: «Conservar nombres, estructura y todos los valores», «Colecciones vacías indican ausencia de componentes; null interno conserva su propiedad y muestra indisponibilidad» y «No usar valores por defecto ni fórmulas»; distinguir null/undefined de cero/false. Depende de T026.
- [ ] T029 [US4] Crear src/frontend/features/profile/components/QuoteExplanation/QuoteExplanation.tsx con details/summary nativos «Ver explicación», contexto/posición y scores individual/colectivo/final; representar recursivamente todos los componentes usando escapado React y ausencias explícitas. Depende de T028.
- [ ] T030 [US4] Integrar QuoteExplanation en src/frontend/features/profile/components/QuoteSummary/QuoteSummary.tsx, src/frontend/features/profile/components/QuoteHistory/QuoteHistory.tsx, src/frontend/features/profile/components/QuoteDateQuery/QuoteDateQuery.tsx y src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.tsx; aplicar identidad jugador/superficie/generación/índice para cerrar detalles al reemplazar dataset, fecha o jugador sin requests adicionales; ajustar wrapping/foco en src/frontend/features/profile/components/PlayerQuotesSection/PlayerQuotesSection.module.scss. Depende de T027 y T029.

**Checkpoint**: Las tres superficies explican exclusivamente su propio objeto recibido, incluidos registros con metadatos iguales.

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T031 Ejecutar pruebas focalizadas de tests/unit/services/client.player-quotes.service.spec.ts, tests/unit/services/client.player.service.spec.ts y tests/unit/features/profile/, incluidos TZ opuestos restaurando el entorno; ejecutar lint, suite completa, build y coverage de package.json y registrar resultados/incidencias en specs/008-player-quotes-frontend/quickstart.md sin eliminar tests ni inflar cobertura.
- [ ] T032 Ejecutar regresiones existentes de tests/integration/player-quotes.repository.spec.ts contra PostgreSQL real aislado con RUN_DB_INTEGRATION_TESTS=true y esquema migrado, restaurar variables previas y registrar evidencia en specs/008-player-quotes-frontend/quickstart.md; distinguir tests/integration/player-quotes.routes.spec.ts con dobles de la integración real, sin modificar backend ni contratos 004.
- [ ] T033 Completar aceptación manual de specs/008-player-quotes-frontend/quickstart.md y registrar evidencia SC-001–007: ambos roles, catálogo/perfil, estados/recuperación/sesión, detalles, foco/teclado/lector de pantalla, capturas 360/1280 px y DevTools con solo GET, una lectura inicial de historial por carga válida del perfil y una lectura adicional por cada reintento explícito del historial, una lectura puntual por consulta/reintento explícito y ninguna solicitud por detalle/polling. Registrar limitaciones reales y estado de revisión formal de Project Owner sin asumir aprobación ni publicar cambios.

## Dependencies & Execution Order

```text
Setup T001–T002 → Foundation T003–T008 → US1 T009–T015 (primer incremento)
                                           ├→ US2 T016–T019
                                           └→ US3 T020–T025
US2 + US3 → US4 T026–T030 → Polish T031–T033
```

- US1 necesita la base y ninguna historia posterior. US2 y US3 agregan capacidades independientes sobre US1: cada una se prueba sin usar la otra.
- US2 y US3 comparten hook, utilidades, sección y estilos: implementar por prioridad en serie o coordinar integración de esos archivos. No editar esos archivos simultáneamente.
- US4 puede desarrollar su presentación tras US1; T030 requiere US2 y US3 para cubrir las tres superficies. Su prueba básica usa actual/historial sin operar la fecha; el resultado puntual se verifica además por separado.
- Dentro de cada historia: pruebas pertinentes primero, utilidades/estado antes de componentes e integración. Dependencias explícitas de cada tarea prevalecen sobre cualquier oportunidad de paralelo.
- T031–T033 siguen a todas las historias y se ejecutan secuencialmente para registrar evidencia en el mismo quickstart.md. La revisión formal de entrega es un gate constitucional posterior; este backlog no concede esa aprobación.

## Parallel Examples per User Story

- **Foundation**: T003 y T004 modifican archivos de pruebas diferentes y pueden prepararse juntos; implementaciones T005 y T006 siguen a sus pruebas.
- **US1**: T009 (harness/estado) y T010 (formato) pueden ejecutarse juntos. Tras sus pruebas, T011 y T012 trabajan en archivos distintos; T013 espera T011 y T014 espera T012–T013.
- **US2**: T016 → T017 → T018 → T019 es secuencial. Tras T016, preparar markup de T018 contra la interfaz acordada puede avanzar mientras se completa T017, pero su integración/verificación espera T017; no hay tareas completas marcadas [P] en esta historia.
- **US3**: T020 (calendario/cliente) y T021 (estado) pueden prepararse juntos; T022 → T023 → T024 → T025 permanecen secuenciales por dependencia.
- **US4**: T026 (proyección) y T027 (identidad) pueden prepararse juntos; T028 → T029 → T030 siguen sus dependencias. No paralelizar modificaciones a utilidades o al harness con otra historia.

## Implementation Strategy

1. Completar Setup y Foundation sobre la rama de feature existente, con la aprobación de especificación comprobada antes de implementar.
2. Entregar US1 como primer incremento verificable: actual, sesión, identidad y recuperación. Validar su criterio independiente antes de sumar superficies.
3. Agregar US2 y luego US3 sin alterar orden/selección backend ni mezclar sus estados. Validar cada historia por separado y conservar lo anterior.
4. Agregar US4 reutilizando los objetos recibidos y controles nativos.
5. Ejecutar validación transversal y registrar evidencia. No ejecutar publicación, issues, PR ni pasos posteriores de Spec Kit como parte de generar este archivo.

## Traceability & Validation

| Alcance | Tareas principales |
|---|---|
| FR-001, FR-002, FR-017 | T004, T006–T009, T012, T015, T033 |
| FR-003–006 | T005, T009–T019 |
| FR-007–011 | T003, T020–T025 |
| FR-012–013 | T026–T030 |
| FR-014–016 | T007–T009, T012, T021, T023, T027 |
| FR-018–019 | T014–T015, T019, T024–T025, T029–T030, T033 |
| FR-020 | T003, T005, T032–T033 |
| SC-001–007 | T031–T033 y criterios independientes de cada historia |

33 tareas: Setup 2, Foundation 6, US1 7, US2 4, US3 6, US4 5, Polish 3. Ocho tareas marcadas [P]. Todos los ítems ejecutables usan checkbox, ID secuencial, etiqueta de historia solo en fases de historia y rutas concretas. No hay tareas de implementación marcadas como completadas por generar este documento.
