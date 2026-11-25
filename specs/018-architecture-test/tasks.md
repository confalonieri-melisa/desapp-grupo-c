# Tasks: Test de arquitectura por capas

**Input**: Design documents from `/specs/018-architecture-test/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md` y `quickstart.md`

**Organization**: Las tareas están ordenadas por dependencia. La implementación corrige primero las dependencias actuales y luego agrega el test general, sin excepciones.

## Phase 1: Setup

**Purpose**: Confirmar el punto de partida antes de modificar la arquitectura.

- [ ] T001 Revisar las dependencias actuales de `src/backend/controllers/metrics.controller.ts` y `src/backend/controllers/competition-context.controller.ts` y confirmar los fallos esperados en la regla de arquitectura.

## Phase 2: Foundational

**Purpose**: No se requieren nuevas dependencias ni cambios de configuración; esta fase queda documentada para dejar explícito que el test usará la configuración existente de Vitest.

- [ ] T002 Confirmar que `tests/unit/**/*.spec.ts` ya está incluido en `vitest.config.mts` y que no es necesario agregar una dependencia externa.

## Phase 3: User Story 1 - Controlar la separación entre capas (Priority: P1) 🎯 MVP

**Goal**: Mantener controllers, services y repositories separados, y detectar automáticamente cualquier controller que acceda directamente a persistencia.

**Independent Test**: Ejecutar `npm test -- tests/unit/architecture/dependencies.spec.ts`; debe pasar cuando todos los controllers respetan la regla y fallar indicando el archivo si se agrega un import prohibido.

### Tests for User Story 1

- [ ] T003 [US1] Crear `tests/unit/architecture/dependencies.spec.ts` para recorrer `src/backend/controllers` y fallar si un controller importa `src/backend/repositories` o `src/backend/db`, permitiendo imports hacia `src/backend/services`.

### Implementation for User Story 1

- [ ] T004 [P] [US1] Crear `src/backend/services/metrics.service.ts` para mover la consulta de jugadores y estrategia activa que actualmente realiza `src/backend/controllers/metrics.controller.ts`.
- [ ] T005 [US1] Modificar `src/backend/controllers/metrics.controller.ts` para recibir `MetricsService`, conservar la exposición de métricas HTTP y eliminar imports directos de repositories.
- [ ] T006 [P] [US1] Modificar `src/backend/controllers/competition-context.controller.ts` para recibir únicamente `CompetitionContextService` y eliminar el import directo de `CompetitionContextRepository`.
- [ ] T007 [US1] Ajustar `src/app/api/metrics/advanced/route.ts` y `tests/integration/observability.routes.spec.ts` para construir o inyectar `MetricsService` sin cambiar el comportamiento observable.
- [ ] T008 [US1] Ajustar `src/app/api/competition-context/updates/route.ts` para construir `CompetitionContextService` con su adapter y repository fuera del controller, manteniendo el flujo existente.
- [ ] T009 [US1] Ejecutar `npm test -- tests/unit/architecture/dependencies.spec.ts tests/unit/controllers/competition-context.controller.spec.ts tests/integration/observability.routes.spec.ts` y corregir cualquier regresión causada por la reorganización.

**Checkpoint**: La prueba de arquitectura pasa sin excepciones y los tests existentes de métricas y competition context mantienen su comportamiento.

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validar la feature completa y mantener la documentación alineada.

- [ ] T010 [P] Actualizar `specs/018-architecture-test/quickstart.md` si cambian los comandos o archivos de validación.
- [ ] T011 Ejecutar `npm test` y confirmar que la suite completa pasa sin conexión a PostgreSQL para el test de arquitectura.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Puede comenzar inmediatamente.
- **Foundational (Phase 2)**: Depende de T001 y bloquea la implementación.
- **User Story 1 (Phase 3)**: Depende de T002. T003 debe existir antes de T004-T008 para verificar que el test detecta las violaciones iniciales.
- **Polish (Phase 4)**: Depende de T004-T009.

### User Story Dependencies

- **User Story 1 (P1)**: No depende de otras historias; es la única historia y constituye el MVP.

### Parallel Opportunities

- T004 y T006 pueden prepararse en paralelo porque trabajan en archivos separados.
- T005 depende de T004; T007 depende de T005; T008 depende de T006.
- T010 puede ejecutarse en paralelo con la revisión final, después de estabilizar la implementación.

## Implementation Strategy

### MVP First

1. Completar T001-T002.
2. Crear el test en T003 y comprobar que detecta los dos incumplimientos actuales.
3. Completar T004-T008 para corregir la implementación sin excepciones.
4. Ejecutar T009 y detenerse cuando el test arquitectónico y los tests afectados pasen.

### Validation

1. Ejecutar el test arquitectónico aislado.
2. Ejecutar los tests afectados.
3. Ejecutar la suite completa con T011.
