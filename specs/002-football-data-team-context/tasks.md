---

description: "Tasks for implementing the football-data.org collective team context feature"
---

# Tasks: Contexto Colectivo de Equipos desde football-data.org

**Input**: Design documents from
`specs/002-football-data-team-context/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/competition-context.yaml`

**Scope rule**: Estas tareas cubren únicamente la ingesta, persistencia,
asociación y sincronización manual del contexto colectivo. No incluyen
estrategias, cotizaciones, rankings, mercado, dashboard, scheduler ni
procesamiento asíncrono.

## Phase 1: Foundation

**Purpose**: Preparar configuración, tipos y persistencia sin modificar el
contrato existente de WhoScored.

- [ ] T001 [P] Crear los tipos de dominio mínimos para estados de
  sincronización en   `src/backend/models/competition-context.ts`, reutilizando
  `League`; los códigos del proveedor se mantendrán como detalle privado del
  adapter.
- [ ] T002 [P] Extender `src/backend/config/env.ts` con la URL base, token,
  timeout y máximo de reintentos de football-data.org, manteniendo la
  validación existente y sin registrar la credencial.
- [ ] T003 [P] Crear en
  `src/backend/schemas/football-data.schema.ts` los schemas Zod para el
  request de temporada y el payload mínimo de standings; excluir del contrato
  interno goleadores, asistencias, ratings, fixtures y eventos.
- [ ] T004 Crear en `src/backend/db/schema.ts` las tablas Drizzle
  `competition_context_updates`, `competition_context_snapshots`,
  `team_competition_standings` y `team_source_links`, incluyendo foreign keys, índices,
  checks y restricciones únicas definidas en `data-model.md`.
- [ ] T005 Generar la nueva migración Drizzle en
  `src/backend/db/migrations/` y verificar que no modifique migraciones
  existentes ni tablas de WhoScored.
- [ ] T006 [P] Definir datos inline reutilizables en los tests unitarios para
  las cinco competiciones y casos de payload incompleto, JSON inválido y campos
  individuales que deben ignorarse, siguiendo la convención existente.

**Checkpoint**: configuración, contratos de datos y esquema de persistencia
listos para desarrollar el adapter.

## Phase 2: User Story 1 - Sincronizar tablas de posiciones (P1)

**Goal**: Consultar las cinco tablas de posiciones, conservar snapshots y
normalizar únicamente el contexto colectivo requerido.

### Implementation and verification

- [ ] T007 [P] [US1] Después de implementar el adapter, crear tests unitarios en
  `tests/unit/adapters/football-data.adapter.spec.ts` para verificar el
  endpoint, los cinco códigos de competición, el parámetro `season`, el header
  `X-Auth-Token` y que no se consulten endpoints adicionales.
- [ ] T008 [P] [US1] Después de implementar los schemas, agregar tests unitarios en
  `tests/unit/schemas/football-data.schema.spec.ts` para payloads válidos,
  filas incompletas, valores inválidos y exclusión de datos individuales.

### Implementation

- [ ] T009 [US1] Implementar
  `src/backend/adapters/football-data.adapter.ts` con cliente HTTP
  inyectable, una solicitud de standings por competición, timeout y
  clasificación de respuestas HTTP sin exponer el token.
- [ ] T010 [US1] Implementar en
  `src/backend/schemas/football-data.schema.ts` la validación del payload
  externo y la proyección al registro normalizado con competición, temporada,
  equipo, posición, partidos jugados, puntos y diferencia de gol.
- [ ] T011 [US1] Implementar
  `src/backend/repositories/competition-context.repository.ts` para insertar
  ejecuciones, snapshots y standings dentro de una transacción, incluyendo la
  conservación de los datos originales recibidos.
- [ ] T012 [US1] Crear tests unitarios del repositorio con mocks en
  `tests/unit/repositories/competition-context.repository.spec.ts` para
  verificar el mapeo de snapshots, standings y errores sin tocar internet.
- [ ] T013 [US1] Crear tests de integración en
  `tests/integration/competition-context.repository.spec.ts` para migración,
  inserción de snapshots, standings, constraints, índices lógicos y
  conservación de temporadas históricas.

**Checkpoint**: el adapter obtiene fixtures de las cinco ligas y el
repositorio puede persistir una ejecución y sus datos normalizados.

## Phase 3: User Story 3 - Publicar solo datos válidos y conservar la última versión (P1)

**Goal**: Orquestar la ejecución completa, publicar atómicamente las cinco
competiciones y conservar la última versión válida ante fallos.

### Implementation and verification

- [ ] T014 [P] [US3] Después de implementar el servicio, crear tests unitarios en
  `tests/unit/models/competition-context.spec.ts` para
  publicación cuando las cinco ligas son válidas, rechazo de ejecuciones
  parciales, persistencia de errores y conservación de la última publicación.
- [ ] T015 [P] [US3] Agregar casos de `429`, `5xx`, timeout, `401`/`403`,
  JSON inválido y respuesta incompleta en
  `tests/unit/adapters/football-data.adapter.spec.ts`, verificando retry finito
  solo para fallos transitorios.
- [ ] T016 [P] [US3] Agregar tests de integración de publicación e idempotencia
  en `tests/integration/competition-context.repository.spec.ts`, verificando
  que una ejecución fallida o repetida no reemplace ni duplique la referencia
  vigente.

### Implementation

- [ ] T017 [US3] Implementar
  `src/backend/services/competition-context.service.ts` para validar la
  temporada, consultar las cinco competiciones, crear la ejecución,
  persistir snapshots y standings, y publicar solo cuando todas sean válidas.
- [ ] T018 [US3] Implementar en el repositorio la consulta de la última
  ejecución `VALID` por temporada, manteniendo las ejecuciones anteriores
  cuando la nueva queda `PARTIAL` o `FAILED`.
- [ ] T019 [US3] Implementar la idempotencia con las constraints definidas y
  la consulta de la última ejecución válida, sin agregar locks, scheduler ni
  mecanismos de coordinación externos.
- [ ] T020 [US3] Incorporar registro estructurado de errores de sincronización
  con ejecución, competición, temporada y estado HTTP en el servicio o
  repositorio correspondiente, sin incluir credenciales.

**Checkpoint**: una ejecución completa publica una única versión válida y
ningún fallo del proveedor elimina la última versión válida.

## Phase 4: User Story 2 - Asociar equipos de ambas fuentes (P1)

**Goal**: Persistir únicamente asociaciones confirmadas entre equipos de
WhoScored y football-data.org.

### Implementation and verification

- [ ] T021 [P] [US2] Después de implementar la resolución, crear tests unitarios en
  `tests/unit/models/competition-context.spec.ts` para coincidencia exacta, alias validado,
  competición/temporada incompatible y ambigüedad.
- [ ] T022 [P] [US2] Agregar tests de integración en
  `tests/integration/competition-context.repository.spec.ts` para las
  restricciones únicas de `team_source_links` y para confirmar que no se
  modifican `players` ni sus estadísticas.

### Implementation

- [ ] T023 [US2] Implementar en
  `src/backend/models/competition-context.ts` la resolución mediante nombre,
  competición y temporada, aceptando solamente aliases previamente validados.
- [ ] T024 [US2] Implementar en
  `src/backend/repositories/competition-context.repository.ts` la persistencia
  de asociaciones confirmadas en `team_source_links`; dejar sin vincular
  los casos ambiguos o no confirmados.

**Checkpoint**: los jugadores pueden relacionarse con un equipo colectivo
únicamente cuando la correspondencia fue confirmada.

## Phase 5: User Story 4 - Sincronización manual autorizada (P2)

**Goal**: Exponer la sincronización manual solo a superusuarios, sin aceptar
la credencial del proveedor desde la API.

### Implementation and verification

- [ ] T025 [P] [US4] Después de implementar el controller, crear tests en
  `tests/unit/controllers/competition-context.controller.spec.ts` para request
  válido, temporada inválida y transformación de la respuesta de sincronización.
- [ ] T026 [P] [US4] Crear tests de la ruta en
  `tests/integration/competition-context.routes.spec.ts` para superusuario,
  inversor, solicitud anónima y errores del proveedor, verificando que los
  casos no autorizados no invocan el adapter.

### Implementation

- [ ] T027 [US4] Implementar `src/backend/controllers/competition-context.controller.ts`
  para validar la entrada y devolver el resultado público de la sincronización
  sin incluir payloads originales, tokens ni detalles sensibles.
- [ ] T028 [US4] Implementar
  `src/app/api/competition-context/updates/route.ts` reutilizando `requireAuth`,
  validando `role === SUPERUSER` antes de contactar al proveedor y obteniendo
  `requested_by` desde el claim `sub`.
- [ ] T029 [US4] Agregar el error `Forbidden` en
  `src/backend/errors/http.error.ts` únicamente si el mapeo de errores actual
  no permite responder HTTP 403 de forma consistente.

**Checkpoint**: la sincronización manual funciona para superusuarios y se
rechaza para inversores o solicitudes anónimas antes de consumir la API.

## Phase 6: Documentación API y validación final

- [ ] T030 [P] Actualizar
  `specs/001-player-token-marketplace/contracts/openapi.yaml` con
  `POST /competition-context/updates`, request, respuestas, seguridad Bearer y
  códigos `400`, `401`, `403`, `429` y `502`.
- [ ] T031 [P] Verificar que
  `specs/002-football-data-team-context/contracts/competition-context.yaml`
  coincide con la ruta implementada y con el contrato OpenAPI principal.
- [ ] T032 [P] Revisar `src/app/api/docs/route.ts` para confirmar que la
  documentación actualizada se carga sin cambiar el comportamiento de las
  rutas existentes.
- [ ] T033 Ejecutar la suite offline de tests unitarios y de rutas con
  `npm test -- --run`, confirmando cobertura de las cinco competiciones,
  errores, permisos, asociación e idempotencia.
- [ ] T034 Ejecutar tests de PostgreSQL con
  `RUN_DB_INTEGRATION_TESTS=true` y validar migraciones, constraints,
  publicación y preservación de la última versión válida.
- [ ] T035 Ejecutar `npm run lint` y `npm run build`, corregir únicamente
  problemas introducidos por esta feature y verificar que el contrato de
  WhoScored y el catálogo existente siguen funcionando.
- [ ] T036 Validar `specs/002-football-data-team-context/quickstart.md` con una
  ejecución local y documentar cualquier ajuste estrictamente necesario en el
  quickstart.

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1** bloquea todas las demás fases.
- **Phase 2** depende de la configuración, schemas y migración de Phase 1.
- **Phase 3** depende del adapter y repositorio de Phase 2.
- **Phase 4** depende del modelo persistido y del repositorio de Phase 2; puede
  comenzar junto con Phase 3 si no comparte cambios simultáneos en los mismos
  métodos.
- **Phase 5** depende del servicio de Phase 3.
- **Phase 6** depende de la implementación de las Phases 2 a 5.

### Parallel opportunities

- T001, T002, T003 y T006 pueden realizarse en paralelo.
- T007 y T008 pueden realizarse en paralelo.
- T014, T015 y T016 pueden prepararse en paralelo antes de ajustar el servicio.
- T021 y T022 pueden realizarse en paralelo.
- T025 y T026 pueden realizarse en paralelo.
- T030, T031 y T032 pueden realizarse en paralelo después de fijar el contrato
  de la ruta.

## Implementation Strategy

1. Completar Phase 1 y validar la migración.
2. Completar Phase 2 y validar consultas mockeadas de las cinco ligas.
3. Completar Phase 3 para obtener el MVP funcional de sincronización y
   publicación.
4. Completar Phase 4 para habilitar la relación con jugadores de WhoScored.
5. Completar Phase 5 para exponer la operación manual protegida.
6. Completar Phase 6 y ejecutar la validación final.

## Out of Scope

- Scheduler o ejecución periódica automática.
- Procesamiento asíncrono.
- Cálculo de score colectivo o estrategia de cotización.
- Quotes, rankings, compras, ventas, portfolio o dashboard.
- Fixtures, partidos, alineaciones, forma reciente o goleadores.
- Endpoint público de lectura del contexto colectivo.
