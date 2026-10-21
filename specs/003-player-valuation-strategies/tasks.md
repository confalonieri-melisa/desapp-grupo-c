---

description: "Tasks for implementing the MVP of versioned player valuation strategies"
---

# Tasks: Estrategias de Valuación y Cotización de Jugadores

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`,
`quickstart.md` and `contracts/valuation.yaml`

**Base branch**: `football-data-context`

**Scope rule**: Estas tareas cubren únicamente el cálculo de cotizaciones,
selección de la estrategia activa, rangos de normalización, historial
append-only y documentación API. No incluyen seeds de jugadores o standings,
CRUD genérico de estrategias, consulta histórica por fecha, ranking, dashboard,
mercado de tokens, scheduler ni procesamiento asíncrono.

**Execution rule**: Cada tarea debe completarse y verificarse antes de iniciar
la siguiente tarea dependiente. Las tareas marcadas `[P]` pueden ejecutarse en
paralelo cuando no compartan archivos.

## Phase 1: Domain contracts and fixtures

**Goal**: Definir los tipos mínimos y los datos de prueba sin tocar todavía
persistencia ni rutas.

- [ ] T001 [P] Definir en
  `src/backend/models/valuation.ts` los códigos
  `INDIVIDUAL_PERFORMANCE` e `INDIVIDUAL_PLUS_TEAM_CONTEXT`, DTOs de
  configuración de rangos, scores, explicación y errores
  de dominio.
- [ ] T002 [P] Crear en
  `src/backend/schemas/valuation.schema.ts` schemas Zod para configuración,
  rangos, explicación, activación y request vacío de recálculo.
- [ ] T002a [P] Extender `src/backend/config/env.ts` con la temporada vigente
  del market (por ejemplo, `CURRENT_MARKET_SEASON=2026`), validarla como
  entero y documentar que se comparte entre WhoScored, football-data.org y
  valuación.
- [ ] T003 [P] Crear fixtures locales en
  `tests/fixtures/valuation/` para estadísticas WhoScored, posiciones,
  rangos de normalización, contexto football-data.org, configuración y resultados
  esperados.
- [ ] T004 [P] Crear `tests/unit/models/valuation.spec.ts` para validar códigos,
  DTOs, rangos, pesos, shares, métricas permitidas y políticas de faltantes.

**Checkpoint**: los contratos tipados representan únicamente las dos
estrategias y el request de recálculo global.

## Phase 2: Pure valuation engine

**Goal**: Implementar el cálculo determinista sin Next.js, Drizzle, HTTP ni
acceso directo a repositorios.

- [ ] T005 [P] Crear
  `tests/unit/services/valuation-engine.spec.ts` para clipping de rangos,
  polaridad positiva/negativa, límites iguales, posición `UNKNOWN`, pesos por
  posición, métricas ausentes y renormalización.
- [ ] T006 [P] Agregar casos de prueba para demostrar que el score individual
  no cambia con puntos, partidos jugados, diferencia de gol o resultados del
  equipo, y que no usa métricas colectivas.
- [ ] T007 Implementar
  `src/backend/services/valuation-engine.ts` para calcular el score individual,
  incluyendo contribuciones y explicación de cada métrica.
- [ ] T008 [P] Agregar pruebas para el `teamScore` usando únicamente posición,
  puntos, partidos jugados y diferencia de gol; excluir goleadores,
  asistencias, ratings, fixtures y eventos.
- [ ] T009 Implementar en el mismo motor el `teamScore`, la combinación
  `0.75/0.25`, la degradación `INDIVIDUAL_ONLY` y la conversión
  `1 + 99 * finalScore` con redondeo final a dos decimales.
- [ ] T010 Verificar en tests que ambas estrategias produzcan resultados
  diferentes cuando cambia únicamente el contexto del equipo y que ambas
  conserven el efecto de cambios en el rendimiento individual.

**Checkpoint**: el motor calcula resultados reproducibles y explicables con
fixtures, sin dependencias de infraestructura.

## Phase 3: Database schema and valuation configuration

**Goal**: Persistir versiones de configuración y cotizaciones históricas.

- [ ] T011 Agregar en `src/backend/db/schema.ts` la tabla
  `valuation_strategy_versions`, con estrategia, versión, configuración JSONB,
  `is_active`, auditoría, foreign keys, unique `(strategy_code, version)` e
  índice para la versión activa.
- [ ] T013 Agregar en `src/backend/db/schema.ts` la tabla `player_quotes`, con
  scores, valor, unidad, fecha, versión, contexto opcional, explicación JSONB,
  foreign keys, checks de rangos e índices históricos.
- [ ] T014 Generar una migración nueva en
  `src/backend/db/migrations/` y verificar que no modifique migraciones
  existentes ni tablas de WhoScored o football-data.org.
- [ ] T015 [P] Crear tests de integración en
  `tests/integration/valuation.repositories.spec.ts` para foreign keys,
  unique constraints, rangos, una única versión activa y append-only.

**Checkpoint**: las dos tablas nuevas representan configuración y resultados;
no duplican jugadores ni standings.

## Phase 4: Repositories and persisted context reads

**Goal**: Encapsular lecturas y escrituras de infraestructura.

- [ ] T016 Implementar
  `src/backend/repositories/valuation.repository.ts` para obtener la versión
  activa, persistir versiones inmutables, activar una versión en transacción y
  guardar cotizaciones.
- [ ] T017 Agregar en
  `src/backend/repositories/player.repository.ts` una lectura de todos los
  jugadores elegibles del dataset vigente, sin agregar `season` a `players` ni
  cambiar el catálogo existente.
- [ ] T018 Agregar en
  `src/backend/repositories/competition-context.repository.ts` una lectura
  local de la última actualización válida y del standing asociado mediante
  `team_source_links`, sin invocar el adapter HTTP.
- [ ] T019 [P] Completar pruebas unitarias de repositorios con mocks para
  configuración versionada, cotizaciones
  append-only y resolución de contexto.
- [ ] T020 Verificar con integración que una nueva sincronización de contexto
  no modifica cotizaciones históricas ni duplica standings dentro del módulo
  de valuación.

**Checkpoint**: el dominio puede recibir únicamente datos persistidos y no
realiza requests externos.

## Phase 5: Strategy activation

**Goal**: Permitir elegir la única estrategia activa sin crear CRUD genérico.

- [ ] T021 Implementar
  `src/backend/services/valuation-strategy.service.ts` para validar el código
  de estrategia, obtener la configuración aprobada, crear una versión
  inmutable si corresponde y activar una única versión global.
- [ ] T022 Crear
  `src/app/api/valuation/active/route.ts` con `POST`, validación Zod,
  autenticación existente y autorización exclusiva para `SUPERUSER`.
- [ ] T023 Crear
  `tests/unit/services/valuation-strategy.service.spec.ts` para activación,
  versión inmutable, reactivación y rechazo de códigos desconocidos.
- [ ] T024 Crear tests de ruta en
  `tests/integration/quotes.routes.spec.ts` para `401`, `403`, request
  inválido, activación válida y garantía de una única versión activa.

**Checkpoint**: un administrador puede seleccionar cualquiera de las dos
estrategias conocidas y la selección queda versionada y auditable.

## Phase 6: Quote recalculation

**Goal**: Calcular y persistir cotizaciones para todos los jugadores elegibles.

- [ ] T025 Implementar
  `src/backend/services/quote-recalculation.service.ts` para capturar una
  única versión activa, resolver contexto local y procesar todos los jugadores
  del dataset vigente usando los rangos de la configuración activa.
- [ ] T026 Persistir únicamente cotizaciones válidas y devolver errores por
  jugador sin crear filas con valores por defecto; informar `COMPLETED` o
  `PARTIAL`.
- [ ] T027 Crear
  `src/app/api/quotes/recalculate/route.ts` con `POST`, request vacío,
  autenticación y autorización de superusuario.
- [ ] T028 Crear
  `tests/unit/services/quote-recalculation.service.spec.ts` para captura de
  versión, uso de rangos configurados, publicación parcial,
  datos faltantes, contexto ausente y ausencia de requests externos.
- [ ] T029 Completar tests de ruta en
  `tests/integration/quotes.routes.spec.ts` para `401`, `403`, `400`, `409`,
  respuesta completa, respuesta parcial, `teamScore: null` y explicación de
  degradación.
- [ ] T030 Verificar integración append-only: dos recálculos crean nuevas filas
  y no actualizan cotizaciones existentes.

**Checkpoint**: `POST /api/quotes/recalculate` aplica la única estrategia
activa a todos los jugadores elegibles y conserva el historial.

## Phase 7: API documentation and final validation

- [ ] T031 [P] Actualizar
  `specs/003-player-valuation-strategies/contracts/valuation.yaml` con
  `/valuation/active`, `/quotes/recalculate`, schemas, seguridad y respuestas.
- [ ] T032 [P] Actualizar
  `specs/001-player-token-marketplace/contracts/openapi.yaml` con las dos rutas
  nuevas sin modificar contratos no relacionados.
- [ ] T033 [P] Revisar `src/app/api/docs/route.ts` para confirmar que los
  contratos actualizados se cargan correctamente.
- [ ] T034 [P] Actualizar `quickstart.md` con el flujo real: datos existentes,
  activación y recálculo global.
- [ ] T035 Ejecutar tests unitarios y de rutas offline:
  `npm test -- --run`.
- [ ] T036 Ejecutar tests PostgreSQL con
  `RUN_DB_INTEGRATION_TESTS=true` y validar migraciones, constraints,
  activación, contexto y append-only.
- [ ] T037 Ejecutar `npm run lint` y `npm run build`, corrigiendo únicamente
  problemas introducidos por esta feature.
- [ ] T038 Verificar `git diff --check` y validar el YAML con el parser Node
  disponible.

## Dependencies & execution order

- Phase 1 bloquea Phase 2 y Phase 3.
- Phase 2 puede desarrollarse en paralelo con Phase 3 si no se comparten
  archivos.
- Phase 3 bloquea Phase 4, Phase 5 y Phase 6.
- Phase 4 bloquea Phase 6.
- Phase 5 debe completarse antes de validar el recálculo end-to-end.
- Phase 7 comienza cuando las rutas y migraciones estén implementadas.

## MVP completion criteria

- Las dos estrategias calculan scores distintos cuando cambia únicamente el
  contexto colectivo.
- La estrategia activa se puede seleccionar administrativamente.
- Los rangos de cada métrica se congelan por versión y se reutilizan.
- No se cargan jugadores ni standings mediante seeds.
- No se realizan requests externos durante el cálculo.
- Las cotizaciones históricas son append-only y explicables.
- El endpoint procesa todos los jugadores elegibles de la temporada vigente y
  no mezcla recálculo con paginación del front-end ni temporadas históricas.
