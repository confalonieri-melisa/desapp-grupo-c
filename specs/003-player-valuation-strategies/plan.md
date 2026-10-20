# Implementation Plan: Estrategias de Valuación y Cotización

**Branch**: `valuation-strategies` | **Base branch**:
`football-data-context` | **PR target**: `football-data-context` | **Date**:
2026-10-20 | **Spec**:
[spec.md](./spec.md)

## Summary

Implementar dos estrategias versionadas de valuación sobre datos persistidos:

1. `INDIVIDUAL_PERFORMANCE`, usando exclusivamente estadísticas individuales
   persistidas desde WhoScored.
2. `INDIVIDUAL_PLUS_TEAM_CONTEXT`, reutilizando el score individual y
   agregando un `teamScore` calculado exclusivamente desde el contexto válido
   persistido de football-data.org.

La solución seguirá la arquitectura existente
`route/controller → service → domain → repository`, con un motor de cálculo
determinista y puro, configuraciones inmutables por versión, cotizaciones
append-only y recálculos bajo demanda. No se implementarán scheduler,
procesamiento asíncrono, ranking, consulta histórica por fecha ni operaciones
de tokens.

## Technical Context

**Language/Version**: TypeScript sobre Node.js `>=22.12.0`

**Primary Dependencies**: Next.js 16 App Router, Drizzle ORM, PostgreSQL,
Zod, Vitest y `fetch` nativo solo para las integraciones existentes. No se
requieren nuevas dependencias npm.

**Storage**: PostgreSQL mediante Drizzle ORM. Las configuraciones y
explicaciones extensas se conservarán en JSONB versionado; los campos de
consulta frecuente quedarán tipados y normalizados.

**Testing**: Vitest; tests unitarios de dominio/cálculo con fixtures
deterministas, tests de repositorio y rutas contra PostgreSQL cuando
`RUN_DB_INTEGRATION_TESTS=true`.

**Target Platform**: Backend REST de Next.js ejecutado en Node.js con
PostgreSQL.

**Project Type**: Aplicación web con API REST en `src/app/api`, dominio y
persistencia en `src/backend`, y documentación contractual en `specs`.

**Performance Goals**: Un recálculo debe capturar una sola estrategia/version
activa y una sola referencia de contexto por ejecución; las lecturas del motor
no deben realizar requests externos. Las consultas deben paginar o procesar
el alcance explícito sin cargar snapshots completos innecesarios.

**Constraints**:

- WhoScored sigue siendo la única fuente individual.
- football-data.org sigue siendo la única fuente colectiva.
- La primera versión usa percentiles P5/P95 por liga-temporada-posición,
  congelados en la versión, con clipping a `[0,1]`.
- La mezcla híbrida es 75% individual y 25% equipo.
- La conversión es `1 + 99 * finalScore`, entre 1 y 100 créditos, con dos
  decimales.
- Faltantes individuales excluyen la métrica y renormalizan pesos.
- Contexto faltante degrada a `INDIVIDUAL_ONLY` y se registra.
- El recálculo publica resultados válidos y queda `PARTIAL` si hay errores.
- No se consulta ningún proveedor durante el cálculo.

**Scale/Scope**: Dos estrategias, múltiples versiones inmutables, una
selección activa global, cotizaciones históricas por jugador y ejecuciones
manuales para todos o un subconjunto explícito.

## Constitution Check

- **Specification First**: PASS. Existe `spec.md` con fórmulas, alcance,
  escenarios y decisiones aprobadas.
- **Layered Architecture**: PASS. El cálculo puro queda en modelos/servicios
  de dominio; controllers no acceden a Drizzle.
- **Validation by Responsibility**: PASS. Zod valida requests y
  configuraciones; el dominio valida fórmulas, pesos y rangos; PostgreSQL
  asegura referencias, unicidad e inmutabilidad operacional.
- **Tests and Verifiable Behavior**: PASS. Se cubren fórmulas, fuentes,
  datos faltantes, versionado, publicación parcial y contratos HTTP.
- **Operational Resilience and Auditability**: PASS. Cada ejecución y quote
  conserva versión, fuentes, contexto, explicación y errores.
- **Incremental Development / YAGNI**: PASS. Se excluyen scheduler,
  consultas temporales, operaciones de mercado, ranking y UI nueva.
- **GitFlow**: PASS. The branch is now restacked on
  `football-data-context`. The PR must target `football-data-context`, not
  `main`, so it remains a stacked PR over the collective-context feature.

### Prerequisite gate

La implementación se desarrolla sobre `football-data-context` y consume sus
tablas, repositorio y asociaciones directamente. En el workspace actual están
presentes `competition_context_updates`, `competition_context_snapshots`,
`team_competition_standings`, `team_source_links`,
`CompetitionContextRepository`, `CompetitionContextService` y las migraciones
`0000`–`0002`. No se debe duplicar su modelo dentro de esta feature. El PR de
`valuation-strategies` debe apuntar al PR/base `football-data-context`; cuando
ese PR se mergee en `main`, el stack podrá promoverse sin cambiar el alcance
de esta feature.

**Bloqueo previo a `tasks`**: la tabla `players` actual no contiene una
temporada. Como la normalización aprobada requiere población por
liga–temporada–posición, debe definirse si la temporada del recálculo será un
parámetro que identifica el dataset WhoScored cargado, si se agregará
procedencia temporal a la persistencia de jugadores/estadísticas, o si la
referencia P5/P95 se almacenará para una temporada declarada aunque el
catálogo no la modele. El plan no debe elegir una de estas alternativas sin
aprobación.

## Architecture and Data Flow

```text
POST /api/valuation/strategies
  -> auth + SUPERUSER
  -> ValuationStrategyController
  -> StrategyService
  -> StrategyRepository

POST /api/valuation/active
  -> auth + SUPERUSER
  -> ActiveStrategyService
  -> StrategyRepository

POST /api/quotes/recalculate
  -> auth + SUPERUSER
  -> QuoteRecalculationController
  -> QuoteRecalculationService
  -> PlayerRepository
  -> CompetitionContextRepository (local published context only)
  -> ValuationEngine
  -> QuoteRepository
```

El `ValuationEngine` debe ser independiente de Next.js, Drizzle y HTTP. Recibe
un jugador, una configuración inmutable, estadísticas de referencia
congeladas y, para la estrategia híbrida, un contexto colectivo ya resuelto.
Devuelve scores, contribuciones, datos faltantes y valor o un error de dominio.

El servicio de recálculo:

1. captura la estrategia/versión activa una sola vez;
2. resuelve el conjunto de jugadores;
3. obtiene la referencia de percentiles correspondiente a la versión;
4. resuelve, sin red, el contexto colectivo publicado;
5. calcula cada jugador;
6. inserta las cotizaciones válidas y errores por jugador;
7. marca `COMPLETED`, `PARTIAL` o `FAILED`.

## Files Affected

### New source files

- `src/backend/models/valuation.ts`: códigos de estrategia, estados,
  configuraciones, métricas, scores, contribuciones y errores de dominio.
- `src/backend/services/valuation-engine.ts`: normalización P5/P95,
  polaridad, pesos efectivos, score individual, teamScore, combinación y
  conversión a crédito.
- `src/backend/schemas/valuation.schema.ts`: schemas Zod de configuraciones,
  publicación, activación y explicación persistida.
- `src/backend/repositories/valuation.repository.ts`: estrategias,
  versiones, activación global, referencias percentiles, ejecuciones y quotes.
- `src/backend/services/valuation-strategy.service.ts`: publicación de
  versiones inmutables y validaciones de administración.
- `src/backend/services/quote-recalculation.service.ts`: captura de versión,
  lectura local de jugadores/contexto y publicación parcial.
- `src/backend/controllers/valuation.controller.ts`: endpoints de
  administración de estrategias y activación.
- `src/backend/controllers/quote-recalculation.controller.ts`: endpoint de
  recálculo y mapeo de resultados.
- `src/app/api/valuation/strategies/route.ts`: alta/listado administrativo.
- `src/app/api/valuation/strategies/[id]/versions/route.ts`: publicación de
  versión inmutable.
- `src/app/api/valuation/active/route.ts`: selección global activa.
- `src/app/api/quotes/recalculate/route.ts`: recálculo bajo demanda.
- `tests/unit/services/valuation-engine.spec.ts`: pruebas deterministas del
  motor.
- `tests/unit/services/valuation-strategy.service.spec.ts`.
- `tests/unit/services/quote-recalculation.service.spec.ts`.
- `tests/unit/models/valuation.spec.ts`.
- `tests/unit/schemas/valuation.schema.spec.ts`.
- `tests/integration/valuation.repositories.spec.ts`.
- `tests/integration/quotes.routes.spec.ts`.
- `tests/integration/valuation.routes.spec.ts`.
- `tests/fixtures/valuation/*.json`: configuraciones, percentiles, jugadores,
  contexto y resultados esperados.

### Existing files to modify

- `src/backend/db/schema.ts`: tablas, índices, checks y tipos de valuación.
- `src/backend/models/enums.ts`: estados/códigos compartidos solo si no se
  mantienen dentro del módulo de valuación.
- `src/backend/repositories/player.repository.ts`: agregar lecturas por
  alcance/IDs sin alterar el contrato de catálogo.
- `src/backend/repositories/competition-context.repository.ts`: agregar una
  lectura interna de la última actualización `VALID` por temporada y del
  standing vinculado mediante `team_source_links`, sin invocar al proveedor.
  El repositorio heredado actualmente solo expone escritura/sincronización y
  `listWhoScoredTeams`; la lectura para valuación todavía no existe.
- `src/backend/errors/http.error.ts`: errores de validación, conflicto,
  permisos o datos insuficientes solo si no existe una clase reutilizable.
- `src/app/api/docs/route.ts`: reflejar los contratos nuevos.
- `specs/001-player-token-marketplace/contracts/openapi.yaml`: documentar
  administración y recálculo.
- `src/backend/db/migrations/*`: generar una migración nueva; no modificar
  migraciones aplicadas.

### Files explicitly not to modify for source behavior

- `src/backend/adapters/whoscored.adapter.ts`
- `src/backend/adapters/player-data-source.ts`
- `src/backend/services/player-sync.service.ts`
- `src/backend/adapters/football-data.adapter.ts`
- `src/backend/services/competition-context.service.ts`

Esos módulos siguen siendo responsables de ingestión y sincronización, no de
valuación.

## Data Model and Migration

La migración debe agregar, como mínimo, las siguientes tablas:

### `valuation_strategies`

- `id` UUID primary key.
- `code` único (`INDIVIDUAL_PERFORMANCE`,
  `INDIVIDUAL_PLUS_TEAM_CONTEXT`).
- `name`, `description`, `status`, timestamps.

### `valuation_strategy_versions`

- `id` UUID primary key.
- `strategy_id` foreign key.
- `version` entero o string semántico único por estrategia.
- `status` (`DRAFT`, `PUBLISHED`, `RETIRED`).
- `configuration` JSONB inmutable, con métricas, polaridad, pesos, overrides,
  shares, fórmula monetaria, política de faltantes y precisión.
- `reference_population` JSONB con liga, temporada, posición, tamaño y
  percentiles congelados.
- `created_by`, `published_at`, timestamps.
- Unique `(strategy_id, version)`.

La configuración publicada debe contener los pesos numéricos definitivos. La
especificación define la estructura y reglas, pero no inventa silenciosamente
los pesos académicos concretos; esos valores deben quedar aprobados antes de
crear la versión inicial.

### `active_valuation_strategy`

- Una sola fila vigente global, o una constraint equivalente.
- `strategy_version_id` foreign key.
- `activated_by`, `activated_at`.
- Historial de cambios separado o append-only para auditoría.

### `quote_recalculations`

- `id`, `strategy_version_id`, `context_update_id` nullable.
- `scope` JSONB o filtros normalizados.
- `status` (`RUNNING`, `COMPLETED`, `PARTIAL`, `FAILED`).
- `requested_by`, timestamps.
- contadores de total, calculados y rechazados.
- `errors` JSONB sin secretos.

### `player_quotes`

- `id`, `player_id`, `recalculation_id`, `strategy_version_id`.
- `individual_score` nullable solo en errores; `team_score` nullable.
- `final_score`, `quote_value`, `currency`/unidad (`CREDIT_PER_TOKEN`).
- `calculated_at`.
- `context_update_id` nullable.
- `explanation` JSONB con contribuciones, pesos efectivos, límites,
  fuentes, métricas faltantes y degradación.
- Append-only: no usar upsert ni `updated_at`.
- Índices `(player_id, calculated_at DESC)` y
  `(recalculation_id, player_id)`.

### Constraints and references

- `strategy_version_id` debe apuntar a una versión publicada para calcular.
- `final_score` debe estar en `[0,1]`; `quote_value` en `[1,100]`.
- Shares suman `1`, son no negativos y la primera versión exige `0.75/0.25`.
- Pesos no negativos y al menos un peso efectivo.
- Una quote híbrida con `team_score` informado debe referenciar la versión
  válida de contexto colectivo utilizada.
- La tabla de contexto colectivo no se replica: se referencia por su
  `context_update_id`.

## Calculation Design

### Individual component

1. Leer únicamente `players.statistics` y `players.position`.
2. Para cada métrica configurada, buscar el P5/P95 congelado para
   `league + season + position`; para `UNKNOWN` usar la población definida por
   la versión.
3. Aplicar clipping y polaridad positiva/negativa.
4. Excluir ausentes o inválidas y renormalizar los pesos efectivos.
5. Calcular:
   `individualScore = Σ(weight * normalized) / Σ(weight)`.

La posición puede seleccionar pesos por posición, pero no es una métrica
individual adicional ni recibe score propio.

### Team component

1. Resolver `team_source_links` para `league + season + players.team`.
2. Resolver el standing dentro de la última actualización válida de esa
   temporada.
3. Usar solamente `position`, `points`, `playedGames` y `goalDifference`.
4. Normalizar con referencias colectivas congeladas en la versión.
5. Calcular el `teamScore` ponderado y registrar cada contribución.

Si no existe contexto, aplicar `INDIVIDUAL_ONLY`, dejar `teamScore` null y
explicar la degradación.

### Final value

Con contexto:

`finalScore = 0.75 * individualScore + 0.25 * teamScore`

Sin contexto bajo la política aprobada:

`finalScore = individualScore`

En ambos casos:

`quoteValue = roundTo2(1 + 99 * finalScore)`

No se redondean scores intermedios.

## API Contracts

### `POST /api/valuation/strategies`

Superusuario. Crea la identidad lógica de una estrategia.

```json
{
  "code": "INDIVIDUAL_PERFORMANCE",
  "name": "Rendimiento individual",
  "description": "Valuación basada en WhoScored"
}
```

### `POST /api/valuation/strategies/{strategyId}/versions`

Superusuario. Publica una configuración inmutable, incluyendo métricas,
pesos, overrides por posición, referencias P5/P95, shares y fórmula.
Versiones publicadas no se editan.

### `POST /api/valuation/active`

Superusuario. Selecciona globalmente una versión publicada:

```json
{ "strategyVersionId": "uuid" }
```

### `POST /api/quotes/recalculate`

Superusuario. Ejecuta para todos o para IDs explícitos:

```json
{
  "playerIds": ["uuid"],
  "season": 2026
}
```

`playerIds` es opcional. La respuesta informa `recalculationId`, estrategia,
versión capturada, estado, contadores, cotizaciones creadas y errores por
jugador. No se agrega endpoint de consulta histórica en esta feature.

Respuestas mínimas:

- `200`: ejecución completada o parcial.
- `400`: configuración/alcance inválido.
- `401`: JWT ausente o inválido.
- `403`: no es superusuario.
- `409`: no existe estrategia activa o versión no publicable.
- `422`: datos insuficientes para una solicitud individual.

Los contratos deben documentar explícitamente que `teamScore` es nullable y
que `sourceBreakdown` distingue `WHOSCORED` de `FOOTBALL_DATA`.

## Testing Strategy

### Unit tests

- P5/P95, clipping, polaridad positiva y negativa.
- Grupo homogéneo con `lower === upper`, usando el neutral definido por la
  versión y sin división por cero.
- Pesos generales, overrides por posición y fallback `UNKNOWN`.
- Exclusión de métricas faltantes y renormalización.
- Rechazo sin métricas válidas.
- Score individual independiente del equipo.
- Team score con los cuatro campos aprobados y exclusión de scorers,
  asistencias, ratings, fixtures y eventos.
- Mezcla 75/25, degradación `INDIVIDUAL_ONLY` y fórmula monetaria.
- Explicación reproducible y ausencia de fuentes incorrectas.
- Validación de configuraciones, pesos, shares, límites y versiones.

### Repository/integration tests

Con PostgreSQL real y migraciones:

- Crear/publicar versiones y evitar mutaciones.
- Mantener una sola estrategia activa global.
- Persistir ejecución, cotizaciones y errores parciales.
- Append-only: recalcular genera nuevas filas.
- Referenciar contexto válido sin duplicar standings.
- Índices, foreign keys, checks y límites numéricos.

### Route/API tests

- Superusuario autorizado en los cuatro endpoints.
- `401`/`403` sin contactar repositorios de mutación.
- `409` sin estrategia activa.
- `200` completo y `PARTIAL` con errores por jugador.
- Contratos con `teamScore: null` y explicación de degradación.

Todos los tests deben usar fixtures locales y repositorios/adapters
inyectables; no se permite red durante el cálculo.

## Dependencies

- Rama base/PR `football-data-context` disponible, especialmente sus tablas y
  método de lectura de contexto publicado.
- PostgreSQL para migraciones e integración.
- No se requiere instalar paquetes nuevos.
- Aprobación de los pesos numéricos iniciales por métrica y posición antes de
  publicar las primeras versiones.

## Risks and Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pesos académicos no definidos | Resultados no reproducibles o arbitrarios | No hardcodear pesos silenciosamente; exigir configuración validada y aprobada |
| Procedencia temporal ausente en `players` | No se puede formar de manera verificable la población P5/P95 por temporada | Resolver la temporada del dataset o agregar procedencia temporal antes de publicar referencias |
| Lectura de contexto aún no expuesta | El motor no puede resolver el standing local | Agregar método de lectura en `CompetitionContextRepository`, sin reutilizar el adapter HTTP |
| Cambios en snapshots | Históricos imposibles de reproducir | Referenciar `context_update_id` y congelar configuración |
| Doble conteo entre fuentes | Score metodológicamente inválido | Whitelist de métricas y tests de separación de fuentes |
| Datos insuficientes | Cotizaciones engañosas | Renormalización explícita, `INDIVIDUAL_ONLY` y errores por jugador |
| Mutación de versiones | Historial no auditable | Estado publicado inmutable y nuevas versiones |
| Publicación parcial | Fechas de actualización diferentes | Estado `PARTIAL`, contadores y detalle por jugador |
| Redondeo intermedio | Resultados no reproducibles | Redondear solo el valor final a dos decimales |

## Implementation Order

1. Resolver la procedencia de temporada para las estadísticas de `players`;
   sin esta decisión no se puede generar correctamente la población
   liga–temporada–posición.
2. Cerrar y aprobar el set numérico de pesos iniciales; no implementarlo por
   inferencia.
3. Crear modelos, schemas de configuración y motor puro con fixtures.
4. Agregar tablas Drizzle, migración e índices.
5. Implementar repositorios de estrategias, referencias, ejecución y quotes.
6. Implementar servicios de publicación/activación y recálculo.
7. Implementar controllers, rutas, autorización y OpenAPI.
8. Ejecutar unit tests, integración, lint y build.

## Definition of Done for This Plan

- Dos estrategias computan con fuentes separadas y resultados explicables.
- Las fórmulas y parámetros están versionados y reproducibles.
- Cotizaciones históricas son append-only y contienen explicación completa.
- La estrategia híbrida consume contexto persistido, no red.
- Existe recálculo bajo demanda con publicación parcial documentada.
- Migración, contratos OpenAPI y tests quedan sincronizados.
- No se implementan funcionalidades fuera de alcance.
