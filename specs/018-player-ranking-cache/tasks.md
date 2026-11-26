# Tasks: Caché en memoria del ranking de jugadores

> Actualización 2026-11-26: la revisión se persiste en una tabla singleton y se actualiza dentro de la transacción de publicación.

**Input**: Design documents from `specs/018-player-ranking-cache/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/ranking-cache.md](contracts/ranking-cache.md), [quickstart.md](quickstart.md)

**Tests**: La especificación y `quickstart.md` piden pruebas de comportamiento, integración y rendimiento. Escribir primero las pruebas de cada fase y comprobar que fallan por la funcionalidad pendiente.

**Organization**: Las tareas se agrupan por historia de usuario. Las tres historias P1 forman el MVP correcto: reutilización, aislamiento de criterios y frescura tras publicar cotizaciones.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo con otra tarea marcada `[P]` de la misma etapa porque toca archivos distintos y no depende de ella.
- **[Story]**: Identifica la historia de usuario correspondiente.
- Todas las rutas son relativas a la raíz del repositorio.

## Phase 1: Setup

**Purpose**: Preparar datos de prueba para el comportamiento nuevo.

- [X] T001 Preparar fixtures de ranking con varias versiones, filtros, páginas, respuestas vacías y 101 criterios distintos en `tests/fixtures/player-ranking-cache.ts` para las suites de esta feature

---

## Phase 2: Foundational

**Purpose**: Exponer una señal persistida de publicación entre procesos y leer filas y total desde un snapshot coherente. Esta fase bloquea las historias.

- [X] T002 [P] Escribir pruebas de integración del conteo de turnos `QUOTE_RECALCULATION` con estado `COMPLETED` o `PARTIAL` y `succeeded_count > 0`, excluyendo turnos fallidos o sin éxitos, y de la visibilidad atómica de cotizaciones y turno confirmado en `tests/integration/batch-job.repository.spec.ts`
- [X] T003 [P] Escribir pruebas de integración que publiquen cotizaciones entre la lectura de filas y la del total y exijan un mismo snapshot `REPEATABLE READ`, además de verificar orden y filtros existentes, en `tests/integration/player-ranking.repository.spec.ts`
- [X] T004 Implementar en `src/backend/repositories/batch-job.repository.ts` la lectura de la fila singleton `ranking_publication_revision`; devolver un entero no negativo y propagar fallas de base de datos
- [X] T005 Cambiar `findRankedPlayers` en `src/backend/repositories/player-ranking.repository.ts` para ejecutar la consulta de filas y la de total dentro de una transacción de solo lectura con aislamiento `repeatable read`, conservando selección de última cotización, filtros, orden, desempates y mapeo actuales

**Checkpoint**: La aplicación web puede leer la revisión publicada por el worker y el repositorio produce filas y total coherentes.

---

## Phase 3: User Story 1 - Repetir una consulta reciente (Priority: P1)

**Goal**: Reutilizar una respuesta completa `200` reciente, incluso `players: []`, sin cambiar su contenido.

**Independent Test**: Repetir una consulta autenticada idéntica sin publicaciones nuevas y confirmar igualdad de respuesta y una sola lectura de ranking; publicar una cotización y verificar que la siguiente consulta vuelve a leer datos persistidos. Insertar 101 consultas y verificar el descarte de la más antigua aunque haya recibido un acierto intermedio.

### Tests for User Story 1

- [X] T006 [P] [US1] Escribir pruebas de acierto, falta, respuesta vacía, revisión persistida, máximo de 100 entradas y descarte de la más antigua en `tests/unit/services/player-ranking-cache.spec.ts`
- [X] T007 [P] [US1] Ampliar pruebas de `getRanking` para acierto y falta, igualdad de `strategyCode`, `strategyVersion`, `players` con `calculatedAt` y `pagination`, y ausencia de nueva lectura de filas en un acierto en `tests/unit/services/player-ranking.service.spec.ts`

### Implementation for User Story 1

- [X] T008 [US1] Crear en `src/backend/services/player-ranking-cache.ts` una caché local de `PlayerRankingResponse` con clave serializada sin colisiones de `strategyVersionId`, `league | null`, `team | null`, `position | null`, `page` y `limit`; guardar `publicationRevision`, `createdAt` monotónico e `insertionOrder`; reutilizar solo con edad `< 60_000 ms` y revisión igual; purgar vencidas y limitar a 100 entradas descartando la más antigua sin renovar su prioridad en los aciertos
- [X] T009 [US1] Integrar la instancia de caché del proceso en `src/backend/services/player-ranking.service.ts`: obtener versión activa y revisión persistida en cada solicitud, buscar por criterios ya validados, construir el mismo `PlayerRankingResponse` en una falta, registrar `createdAt` solo tras completarlo y guardar respuestas completas, incluidas las vacías

**Checkpoint**: US1 demuestra la mejora de consultas repetidas y sus límites de tiempo y capacidad.

---

## Phase 4: User Story 2 - Filtrar y recorrer páginas sin mezclar resultados (Priority: P1)

**Goal**: Separar resultados por versión activa, filtros y paginación, compartiendo los criterios equivalentes ya normalizados.

**Independent Test**: Alternar `league`, `team`, `position`, `page` y `limit`, y comparar cada respuesta con una lectura sin entrada vigente; repetir valores predeterminados implícitos y explícitos para confirmar que comparten resultado.

### Tests for User Story 2

- [X] T010 [P] [US2] Ampliar las pruebas de validación para confirmar `team` recortado, valores predeterminados `page = 1` y `limit = 20`, límite máximo `limit = 100` y rechazo de parámetros desconocidos en `tests/unit/schemas/player-ranking.schema.spec.ts` y `tests/unit/controllers/player-ranking.controller.spec.ts`
- [X] T011 [US2] Probar claves distintas para `strategyVersionId`, `league`, `team`, `position`, `page` y `limit`, y claves iguales tras los valores predeterminados y normalización existentes, en `tests/unit/services/player-ranking-cache.spec.ts` y `tests/unit/services/player-ranking.service.spec.ts`
- [X] T012 [US2] Probar alternancia de filtros y páginas sin mezclar jugadores, puestos globales, totales ni contexto de estrategia en `tests/integration/player-ranking.routes.spec.ts`

### Implementation for User Story 2

- [X] T013 [US2] Conectar exclusivamente los criterios normalizados que entrega `PlayerRankingController` con la clave de caché en `src/backend/services/player-ranking.service.ts`, preservando `team` recortado sin añadir normalización de mayúsculas y manteniendo `page` y `limit` predeterminados como una sola combinación

**Checkpoint**: US2 reproduce el resultado persistido para cada combinación y reutiliza solicitudes equivalentes.

---

## Phase 5: User Story 3 - Ver cotizaciones nuevas después de recalcular (Priority: P1) 🎯 MVP

**Goal**: La primera consulta posterior a una publicación manual o del worker muestra cotizaciones persistidas nuevas; una lectura anterior en curso no repuebla la caché con datos viejos.

**Independent Test**: Calentar varias entradas, publicar cotizaciones con turnos `COMPLETED` y `PARTIAL`, y comprobar que la primera consulta posterior obtiene valores y puestos nuevos; intercalar una publicación durante una lectura y repetir la consulta para confirmar que no queda una entrada anterior a la publicación.

### Tests for User Story 3

- [X] T014 [P] [US3] Escribir pruebas del servicio con cambio de revisión o versión activa durante una lectura: descartar el primer candidato, reintentar una vez y, si vuelve a cambiar, devolver la segunda respuesta completa sin guardarla; cubrir también fallas de lectura de revisión en `tests/unit/services/player-ranking.service.spec.ts`
- [X] T015 [P] [US3] Probar invalidación global tras turnos manuales `COMPLETED` y `PARTIAL` con `succeeded_count > 0`, y ausencia de invalidación por un turno `FAILED` sin publicación, en `tests/integration/player-ranking.routes.spec.ts`
- [X] T016 [US3] Probar una publicación del worker desde otro proceso sobre la misma base y una consulta concurrente iniciada antes del commit, verificando frescura de la primera solicitud posterior y que el resultado antiguo no vuelve a ser vigente, en `tests/integration/player-ranking.repository.spec.ts` junto con la cobertura HTTP de `tests/integration/player-ranking.routes.spec.ts`

### Implementation for User Story 3

- [X] T017 [US3] Completar en `src/backend/services/player-ranking.service.ts` la comprobación posterior de versión activa y revisión tras construir la respuesta; si cambian, descartar el candidato, repetir la lectura una vez y, si también cambia el segundo intento, devolver su respuesta completa sin insertarla en caché

**Checkpoint**: US1–US3 completan el MVP con reutilización correcta, aislamiento y frescura entre procesos.

---

## Phase 6: User Story 4 - Conservar las respuestas y los errores actuales (Priority: P2)

**Goal**: Mantener autenticación, validación, `409`, errores de lectura y el contrato HTTP tanto en aciertos como en faltas.

**Independent Test**: Con una entrada vigente, repetir sin JWT y con parámetros inválidos; quitar la versión activa y provocar fallas de lectura de revisión, filas o total. Confirmar los códigos actuales y que, después de recuperar la base, la solicitud vuelve a leer los datos.

### Tests for User Story 4

- [X] T018 [P] [US4] Ampliar pruebas de ruta para `401` sin JWT aun con entrada vigente, `400` por parámetros inválidos o desconocidos, `409` sin estrategia activa, respuesta `200` sin campo público de caché y `x-correlation-id` en aciertos y faltas en `tests/integration/player-ranking.routes.spec.ts`
- [X] T019 [P] [US4] Probar fallas de lectura de versión, revisión, filas y total y comprobar que no se guarda una respuesta parcial ni un error y que la solicitud posterior reintenta, en `tests/unit/services/player-ranking.service.spec.ts` y `tests/unit/repositories/player-ranking.repository.spec.ts`

### Implementation for User Story 4

- [X] T020 [US4] Asegurar en `src/backend/services/player-ranking.service.ts` que ninguna falla de versión, revisión, filas o total sirve una entrada vieja ni inserta un resultado incompleto; mantener la propagación de errores existente y el `409` sin versión activa

**Checkpoint**: La optimización conserva el contrato y los errores observables.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificar rendimiento y la entrega completa sin ampliar el contrato público.

- [X] T021 Crear una medición reproducible en `tests/performance/player-ranking-cache.bench.ts` con al menos 1000 jugadores rankeables, 30 consultas frías y 30 vigentes equivalentes, preparación fuera de cada medición y cálculo de medianas y mejora porcentual de SC-001
- [X] T022 Ejecutar las suites y `npm run build` indicados en `specs/018-player-ranking-cache/quickstart.md`; registrar allí las medianas, la mejora (mínimo 25%) y la comprobación manual de reinicio, autenticación y recálculo del worker

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Crear primero la rama desde `main`; T001 prepara fixtures reutilizables.
- **Foundational (Phase 2)**: T002 y T003 pueden escribirse en paralelo; T004 sigue a T002 y T005 sigue a T003. Completar ambas implementaciones antes de las historias.
- **US1 (Phase 3)**: Depende de la fase 2. T006 y T007 pueden escribirse en paralelo; T008 precede a T009.
- **US2 (Phase 4)**: Depende de US1 para probar la caché real. T010 puede avanzar junto a las pruebas de US1 porque cubre otros archivos; T011 y T012 verifican la identidad de la clave antes de T013.
- **US3 (Phase 5)**: Depende de US1 y US2. T014 y T015 pueden escribirse en paralelo; T016 completa las pruebas de concurrencia antes de T017.
- **US4 (Phase 6)**: Depende de la caché completa. T018 y T019 pueden escribirse en paralelo; T020 resuelve los fallos que revelen esas pruebas.
- **Polish (Phase 7)**: Depende de US1–US4. T021 precede a la medición registrada en T022.

### User Story Dependencies

```text
Phase 1 → Phase 2 → US1 → US2 → US3 (MVP) → US4 → Polish
```

US1 permite comprobar el acierto y el vencimiento en aislamiento. US2 completa la separación de criterios. US3 añade la garantía de frescura necesaria para usar el MVP con el worker. US4 verifica los errores y el contrato en todos esos caminos.

### Within Each User Story

- Escribir las pruebas de comportamiento y comprobar el fallo esperado antes de implementar.
- Completar repositorios antes de usarlos desde el servicio; conservar autenticación y validación en ruta y controlador.
- Ejecutar el criterio de prueba independiente al cerrar cada fase.

## Parallel Examples

### User Story 1

- T006 en `tests/unit/services/player-ranking-cache.spec.ts` y T007 en `tests/unit/services/player-ranking.service.spec.ts` pueden escribirse en paralelo.

### User Story 2

- T010 en las pruebas de schema/controlador puede avanzar mientras se escribe T006 o T007; T011 y T012 usan archivos distintos pero T012 depende de tener la caché integrada.

### User Story 3

- T014 en las pruebas unitarias del servicio y T015 en la integración de rutas pueden escribirse en paralelo. T016 usa la misma suite de rutas y sigue a T015.

### User Story 4

- T018 en la integración de rutas y T019 en las pruebas unitarias del servicio/repositorio pueden escribirse en paralelo.

## Implementation Strategy

### MVP First

1. Crear `feature/018-player-ranking-cache` desde `main` y completar Setup y Foundational.
2. Completar US1 y comprobar reutilización, vencimiento y capacidad.
3. Completar US2 y comprobar todas las claves y los valores predeterminados.
4. Completar US3 y validar publicación manual, parcial y desde el worker; este es el MVP desplegable.

### Incremental Delivery

1. Añadir US4 para cerrar los caminos de error y el contrato HTTP.
2. Medir SC-001 y ejecutar `quickstart.md`, suites aplicables y build.
3. Someter la entrega completa a la revisión formal de la Project Owner indicada por la constitución.
