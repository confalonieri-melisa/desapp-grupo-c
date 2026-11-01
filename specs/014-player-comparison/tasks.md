---
description: "Task list for Comparador de jugadores"
---

# Tasks: Comparador de jugadores

**Input**: Design documents from `/specs/014-player-comparison/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-comparison.md`, `quickstart.md`

**Scope**: Solo frontend. No se crean endpoints, tablas, migraciones ni cambios de dominio.

## Phase 1: Setup

- [x] T001 Crear la estructura de la feature en `src/app/comparison/`, `src/frontend/features/comparison/` y `tests/unit/features/comparison/` según `plan.md`.
- [x] T002 [P] Crear `src/frontend/features/comparison/comparison.ts` con tipos, máximo de 3 jugadores, límite de búsqueda 12, máximo de 15 puntos y las cinco filas de la matriz.
- [x] T003 [P] Crear `src/app/comparison/ComparisonPage.module.scss` con variables y patrones visuales existentes.

## Phase 2: Foundational

- [x] T004 [P] [US1] Escribir en `tests/unit/features/comparison/comparison.spec.ts` pruebas de selección ordenada, deduplicación, máximo 3, eliminación y marcado de resultados seleccionados.
- [x] T005 [P] [US2] Escribir en `tests/unit/features/comparison/comparison.spec.ts` pruebas de las cinco filas, `items[0]` como cotización actual y valores faltantes.
- [x] T006 [P] [US3] Escribir en `tests/unit/features/comparison/comparison.spec.ts` pruebas de orden temporal, recorte a 15 puntos, mínimo de 2 puntos y variación entre las dos cotizaciones recientes.
- [x] T007 Implementar `src/frontend/features/comparison/utils/comparison.ts` con selección, eliminación, filas, variación y series históricas; hacer pasar T004-T006.
- [x] T008 Implementar `src/frontend/features/comparison/hooks/usePlayerComparison.ts` reutilizando `getPlayers` y `getPlayerQuotes`, con estado por jugador, abortado/generación y manejo de 401.
- [ ] T009 [P] Crear `tests/unit/features/comparison/usePlayerComparison.spec.ts` para carga, cambio de selección, eliminación durante consulta, error parcial, reintento, respuesta tardía y 401.

**Checkpoint**: derivaciones y carga reutilizan contratos existentes y no requieren backend nuevo.

## Phase 3: User Story 1 - Seleccionar jugadores (P1) 🎯 MVP

**Goal**: Buscar, agregar y quitar entre 0 y 3 jugadores sin duplicar su identidad.

**Independent Test**: Abrir `/comparison`, buscar por nombre, agregar 1/2/3, intentar agregar un cuarto y quitar mediante `X`.

### Tests

- [ ] T010 [P] [US1] Crear `tests/unit/features/comparison/ComparisonSearch.spec.tsx` para `role="search"`, Enter, botón, limpieza, carga, vacío, error, máximo 12 y ausencia de paginación.
- [ ] T011 [P] [US1] Crear `tests/unit/features/comparison/ComparisonPage.spec.tsx` para estado `0 de 3`, estado con un jugador, máximo de 3 y navegación protegida.

### Implementation

- [x] T012 [US1] Implementar `src/frontend/features/comparison/components/ComparisonSearch.tsx` con búsqueda por nombre, resultados de catálogo, acción de agregar y marca de seleccionado.
- [x] T013 [US1] Implementar `src/app/comparison/page.tsx` con sesión, título, buscador, contador y estados inicial/con un jugador.
- [x] T014 [US1] Agregar en `src/frontend/components/GlobalNav/GlobalNav.tsx` el enlace autenticado «Comparador» hacia `/comparison` y `aria-current`.
- [x] T015 [US1] Implementar `src/frontend/features/comparison/components/ComparisonStates.tsx` para carga, búsqueda vacía, error, selección incompleta y reintento.
- [x] T016 [US1] Implementar en `src/frontend/features/comparison/components/ComparisonMatrix.tsx` el encabezado único por jugador con botón `X`, sin chips ni tarjetas duplicadas.
- [x] T017 [US1] Completar `src/app/comparison/ComparisonPage.module.scss` para buscador, contador, encabezados, `X`, estados y foco visible.

**Checkpoint**: búsqueda, selección máxima y eliminación son demostrables sin depender del gráfico.

## Phase 4: User Story 2 - Comparar dos o tres jugadores (P1)

**Goal**: Mostrar una matriz compacta con una columna por jugador y cinco filas exactas.

**Independent Test**: Seleccionar 2 y luego 3 jugadores; verificar cotización, variación, scores, “No disponible” y ausencia de estadísticas/ranking.

- [x] T018 [P] [US2] Crear `tests/unit/features/comparison/ComparisonMatrix.spec.ts` para tabla semántica, orden de selección, cinco filas, unidades, `items[0]` y datos faltantes.
- [ ] T019 [P] [US2] Extender `tests/unit/features/comparison/ComparisonPage.spec.tsx` para transición automática al segundo jugador y eliminación de columna/serie.
- [x] T020 [US2] Completar `src/frontend/features/comparison/components/ComparisonMatrix.tsx` con cotización actual, variación, score individual, score colectivo y score final.
- [x] T021 [US2] Completar `src/frontend/features/comparison/utils/comparison.ts` con formato de créditos, score, porcentaje con signo y “No disponible”, preservando ceros válidos.
- [x] T022 [US2] Integrar matriz, selección y estados en `src/app/comparison/page.tsx`; mostrar comparación automáticamente desde 2 jugadores.
- [x] T023 [US2] Ajustar `src/app/comparison/ComparisonPage.module.scss` para jerarquía de métricas, encabezados y dos/tres columnas.

**Checkpoint**: la comparación completa usa solo datos reales y no duplica la identidad.

## Phase 5: User Story 3 - Consultar evolución histórica (P1)

**Goal**: Mostrar un gráfico multiserie compacto basado únicamente en historiales reales.

**Independent Test**: Usar historiales con 0, 1 y varios registros; verificar series, orden, recorte, estados y ausencia de recomendaciones.

- [x] T024 [P] [US3] Crear `tests/unit/features/comparison/ComparisonChart.spec.ts` para series reales, orden temporal, máximo 15, leyenda, no interpolación y menos de 2 puntos.
- [ ] T025 [P] [US3] Extender `tests/unit/features/comparison/ComparisonPage.spec.tsx` para gráfico parcial y eliminación de serie/leyenda al quitar un jugador.
- [x] T026 [US3] Implementar `src/frontend/features/comparison/components/ComparisonChart.tsx` con `recharts`, una serie por jugador, eje en créditos por token y máximo 15 puntos.
- [x] T027 [US3] Implementar en `src/frontend/features/comparison/components/ComparisonChart.tsx` estados por serie: carga, sin historial, un punto, error y serie válida; conservar series válidas.
- [x] T028 [US3] Integrar `ComparisonChart` en `src/app/comparison/page.tsx` junto a la matriz para 2/3 jugadores.
- [x] T029 [US3] Completar `src/app/comparison/ComparisonPage.module.scss` para panel, leyenda, tooltip, densidad compacta y desktop.

**Checkpoint**: la evolución usa puntos históricos reales, sin interpolación ni conclusiones financieras.

## Phase 6: User Story 4 - Estados y recuperación (P2)

**Goal**: Distinguir y recuperar carga, vacío, error, ausencia de historial, 401 y respuestas tardías.

**Independent Test**: Simular cada estado y comprobar mensaje, datos conservados y recuperación correspondiente.

- [ ] T030 [P] [US4] Completar `tests/unit/features/comparison/usePlayerComparison.spec.ts` con sesión cambiada, 401, reintentos, error de búsqueda y error parcial.
- [ ] T031 [P] [US4] Completar `tests/unit/features/comparison/ComparisonPage.spec.tsx` con `role="status"`, `role="alert"` y ausencia de datos obsoletos.
- [ ] T032 [US4] Refinar `src/frontend/features/comparison/hooks/usePlayerComparison.ts` para fases independientes, invalidación por selección y limpieza por logout.
- [ ] T033 [US4] Refinar `src/frontend/features/comparison/components/ComparisonStates.tsx` y `src/app/comparison/page.tsx` con live regions, alertas sin duplicar y reintentos contextuales.
- [ ] T034 [US4] Agregar en `src/frontend/features/comparison/components/ComparisonChart.tsx` descripción textual accesible con jugador, fechas y valores inicial/final por serie.

**Checkpoint**: todos los estados son distinguibles, recuperables y no muestran respuestas obsoletas.

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Ajustar `src/app/comparison/ComparisonPage.module.scss` para 320 px, 360 px y desktop: matriz desplazable, columna «Métrica» identificable y gráfico apilado en mobile.
- [ ] T036 [P] Completar pruebas accesibles en `tests/unit/features/comparison/ComparisonMatrix.spec.tsx` y `tests/unit/features/comparison/ComparisonChart.spec.tsx`: nombres de `X`, foco, tabla semántica, live regions y alternativa no visual.
- [ ] T037 [P] Ejecutar la validación visual de `specs/014-player-comparison/quickstart.md` en estados vacío, uno, dos, tres, error y datos faltantes; registrar viewport y diferencias respecto de la referencia.
- [ ] T038 Ejecutar `npm test -- --run tests/unit/features/comparison`, `npm run lint`, `npx tsc --noEmit` y `npm run build`; corregir solo fallos de esta feature.
- [ ] T039 Ejecutar manualmente todos los escenarios de `quickstart.md` y registrar evidencia final de búsqueda, selección, matriz, gráfico, responsive, teclado y sesión vencida.

## Dependencies & Execution Order

- Setup (Phase 1) no depende de otras fases.
- Foundational (Phase 2) depende de Setup y bloquea las historias.
- US1 depende de Foundational y es el MVP de selección.
- US2 depende de US1 para reutilizar selección y encabezados.
- US3 depende de US2 para compartir selección y estados.
- US4 depende de US1-US3 para validar la experiencia integrada.
- Polish depende de las historias entregadas.

## Parallel Opportunities

- T002-T003 pueden ejecutarse en paralelo.
- T004-T006 y T009 pueden prepararse en paralelo.
- T010-T011, T018-T019, T024-T025 y T030-T031 pueden ejecutarse en paralelo dentro de sus fases.
- T035-T037 pueden ejecutarse en paralelo después de las historias.

## Implementation Strategy

1. Completar Setup y Foundational.
2. Entregar US1 como MVP de búsqueda, selección y eliminación.
3. Entregar US2 con la matriz de cinco filas.
4. Entregar US3 con el gráfico histórico real.
5. Completar US4 y Polish con resiliencia, responsive, accesibilidad y validación visual.

Todas las tareas siguen el formato obligatorio `- [ ] [TaskID] [P?] [Story?] descripción con ruta`.
