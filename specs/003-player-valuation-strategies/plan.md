# Implementation Plan: Estrategias de Valuación y Cotización

**Branch**: `valuation-strategies` | **Base branch**:
`football-data-context` | **PR target**: `football-data-context` | **Date**:
2026-10-20 | **Spec**:
[spec.md](./spec.md)

## Summary

Implementar un MVP de dos estrategias versionadas de valuación sobre datos
persistidos:

1. `INDIVIDUAL_PERFORMANCE`, usando exclusivamente estadísticas individuales
   persistidas desde WhoScored.
2. `INDIVIDUAL_PLUS_TEAM_CONTEXT`, reutilizando el score individual y
   agregando un `teamScore` calculado exclusivamente desde el contexto válido
   persistido de football-data.org.

La solución seguirá la arquitectura existente
`route/controller → service → domain → repository`, con un motor de cálculo
determinista y pequeño, dos estrategias conocidas en código, una configuración
tipada por versión, cotizaciones append-only y un recálculo bajo demanda. Se
implementará únicamente la activación de las dos estrategias conocidas; no se
agregarán CRUD genérico, scheduler, procesamiento
asíncrono, ranking, consulta histórica por fecha ni operaciones de tokens.

## Technical Context

**Language/Version**: TypeScript sobre Node.js `>=22.12.0`

**Primary Dependencies**: Next.js 16 App Router, Drizzle ORM, PostgreSQL,
Zod, Vitest y `fetch` nativo solo para las integraciones existentes. No se
requieren nuevas dependencias npm.

**Storage**: PostgreSQL mediante Drizzle ORM. La configuración y explicación
se modelan como DTOs tipados en TypeScript y se validan con Zod; se persisten
en JSONB únicamente como snapshots inmutables. Los scores, valor, estrategia,
versión, jugador y fecha quedan en columnas normales.

**Testing**: Vitest; tests unitarios de dominio/cálculo con fixtures
deterministas, tests de repositorio y rutas contra PostgreSQL cuando
`RUN_DB_INTEGRATION_TESTS=true`.

**Target Platform**: Backend REST de Next.js ejecutado en Node.js con
PostgreSQL.

**Project Type**: Aplicación web con API REST en `src/app/api`, dominio y
persistencia en `src/backend`, y documentación contractual en `specs`.

**Performance Goals**: Un recálculo debe capturar una sola estrategia/versión
activa y una sola referencia de contexto por ejecución; las lecturas del motor
no deben realizar requests externos. El procesamiento debe recorrer todos los
jugadores elegibles sin cargar snapshots completos innecesarios.

**Constraints**:

- WhoScored sigue siendo la única fuente individual.
- football-data.org sigue siendo la única fuente colectiva.
- La primera versión usa límites `minimum`/`maximum` fijos por métrica,
  congelados en la configuración de la versión, con clipping a `[0,1]`.
- La mezcla híbrida es 75% individual y 25% equipo.
- La conversión es `1 + 99 * finalScore`, entre 1 y 100 créditos, con dos
  decimales.
- Faltantes individuales excluyen la métrica y renormalizan pesos.
- Contexto faltante degrada a `INDIVIDUAL_ONLY` y se registra.
- El recálculo publica resultados válidos y queda `PARTIAL` si hay errores.
- No se consulta ningún proveedor durante el cálculo.

**Scale/Scope**: Dos estrategias conocidas, múltiples versiones inmutables,
una única versión activa global, configuración de rangos fijos y cotizaciones
históricas por jugador.

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

La tabla `players` actual no contiene una temporada porque representa el
dataset vigente del market. Para este MVP, la temporada vigente del market se
define en la configuración de la aplicación (por ejemplo, `2026`) y se reutiliza
para resolver el contexto de football-data.org y las referencias de
normalización. El endpoint de recálculo no recibe una temporada arbitraria; no
se agrega `season` a `players` ni se introduce una entidad de ingesta temporal.

## Architecture and Data Flow

```text
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
un jugador, una estrategia conocida, un DTO de configuración inmutable,
  configuración de rangos fijos y, para la estrategia híbrida, un
contexto colectivo ya resuelto. Devuelve scores, contribuciones, datos
faltantes y valor o un error de dominio.

El servicio de recálculo:

1. captura la estrategia/versión activa una sola vez;
2. resuelve el conjunto de jugadores;
3. resuelve, sin red, el contexto colectivo publicado cuando corresponde;
4. calcula cada jugador usando los rangos de la configuración activa;
5. inserta las cotizaciones válidas y acumula errores por jugador en la
   respuesta;
7. marca `COMPLETED`, `PARTIAL` o `FAILED`.

No se crea una jerarquía de clases por métrica. Las métricas se representan
como datos en un DTO validado y el motor aplica funciones pequeñas de
normalización, ponderación y conversión.

## Files Affected

### New source files

- `src/backend/models/valuation.ts`: códigos de las dos estrategias, DTOs
  tipados de configuración/explicación, scores y errores de dominio.
- `src/backend/services/valuation-engine.ts`: normalización por rangos,
  polaridad, pesos efectivos, score individual, teamScore, combinación y
  conversión a crédito.
- `src/backend/schemas/valuation.schema.ts`: schemas Zod de configuración,
  explicación y request de recálculo.
- `src/backend/config/env.ts`: configurar y validar la temporada vigente del
  market, sin permitir que el endpoint seleccione temporadas históricas.
- `src/backend/repositories/valuation.repository.ts`: versión activa,
  configuración versionada y cotizaciones
  históricas.
- `src/backend/services/quote-recalculation.service.ts`: captura de versión,
  lectura local de jugadores/contexto y publicación parcial.
- `src/backend/services/valuation-strategy.service.ts`: activa una de las dos
  estrategias conocidas y persiste su versión/configuración congelada.
- `src/app/api/quotes/recalculate/route.ts`: recálculo bajo demanda.
- `src/app/api/valuation/active/route.ts`: selección administrativa de la
  estrategia activa.
- `tests/unit/services/valuation-engine.spec.ts`: pruebas deterministas del
  motor.
- `tests/unit/services/quote-recalculation.service.spec.ts`.
- `tests/unit/services/valuation-strategy.service.spec.ts`.
- `tests/unit/models/valuation.spec.ts`.
- `tests/unit/schemas/valuation.schema.spec.ts`.
- `tests/integration/valuation.repositories.spec.ts`.
- `tests/integration/quotes.routes.spec.ts`.
- `tests/fixtures/valuation/*.json`: configuraciones, jugadores,
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

### `valuation_strategy_versions`

- `id` UUID primary key.
- `strategy_code` restringido a `INDIVIDUAL_PERFORMANCE` o
  `INDIVIDUAL_PLUS_TEAM_CONTEXT`.
- `version` string único por `strategy_code`.
- `is_active` boolean, con una única versión activa global.
- `configuration` JSONB inmutable, respaldado por el DTO `ValuationConfig`.
- `created_by`, `created_at`, `activated_at`.
- Unique `(strategy_code, version)`.

No se crea una tabla separada para la identidad de cada estrategia ni una
entidad `ActiveValuationStrategy`. La versión activa se resuelve mediante
`is_active` y una operación transaccional que desactiva la anterior y activa
la nueva. La configuración publicada debe contener pesos numéricos aprobados;
no se inventan constantes ocultas.

Las estadísticas y los contextos ya persistidos son la fuente para calcular
las cotizaciones; no se cargan jugadores ni standings mediante seeds. La
aplicación debe ofrecer una operación administrativa mínima
para activar una de las dos estrategias conocidas. Esa operación recupera o
persiste la configuración aprobada y luego marca una única versión activa. No
se agrega un CRUD HTTP genérico de estrategias.

### `player_quotes`

- `id`, `player_id`, `strategy_version_id`.
- `individual_score` nullable solo en errores; `team_score` nullable.
- `final_score`, `quote_value`, `currency`/unidad (`CREDIT_PER_TOKEN`).
- `calculated_at`.
- `context_update_id` nullable.
- `explanation` JSONB como snapshot del DTO `QuoteExplanation`, con
  contribuciones, pesos efectivos, límites, fuentes, métricas faltantes y
  degradación.
- Append-only: no usar upsert ni `updated_at`.
- Índices `(player_id, calculated_at DESC)` y
  `(strategy_version_id, calculated_at DESC)`.

El MVP no persiste una entidad de ejecución de recálculo. La respuesta del
endpoint informa resultados y errores de la solicitud; el historial persistido
es el de `player_quotes`.

### Constraints and references

- `strategy_version_id` debe apuntar a la versión activa capturada para
  calcular.
- Cada normalización debe usar los límites de la métrica definidos en la
  configuración de la versión.
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
2. Para cada métrica configurada, utilizar el rango mínimo y máximo congelado
   en la configuración de la versión. La posición sólo puede seleccionar un
   peso alternativo; `UNKNOWN` utiliza el peso general.
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
4. Normalizar con los rangos definidos en la configuración de la versión.
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

### `POST /api/quotes/recalculate`

Superusuario. Ejecuta para todos los jugadores elegibles usando la única
versión activa global y la temporada vigente del market:

```json
{}
```

El recálculo siempre procesa todos los jugadores elegibles usando la única
versión activa global y la temporada vigente configurada por la aplicación. La
respuesta informa estrategia, versión capturada, cotizaciones creadas y
errores por jugador. No se agrega paginación del front-end, selección parcial
de jugadores ni consulta de temporadas históricas en esta feature.

### `POST /api/valuation/active`

Superusuario. Selecciona la estrategia activa entre las dos estrategias
conocidas:

```json
{
  "strategyCode": "INDIVIDUAL_PLUS_TEAM_CONTEXT"
}
```

La operación no administra identidades arbitrarias ni permite editar fórmulas
libremente. Recupera o persiste una versión/configuración aprobada y deja una
única versión activa.

Respuestas mínimas:

- `200`: ejecución completada o parcial.
- `400`: configuración/alcance inválido.
- `401`: JWT ausente o inválido.
- `403`: no es superusuario.
- `409`: no existe versión activa global.
- `422`: datos insuficientes para uno o más jugadores del market.

Los contratos deben documentar explícitamente que `teamScore` es nullable y
que `sourceBreakdown` distingue `WHOSCORED` de `FOOTBALL_DATA`.

## Testing Strategy

### Unit tests

- Rangos fijos, clipping, polaridad positiva y negativa.
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

- Crear versiones de las dos estrategias y evitar mutaciones.
- Mantener una sola estrategia activa global.
- Persistir cotizaciones y verificar que los errores no generan filas falsas.
- Append-only: recalcular genera nuevas filas.
- Referenciar contexto válido sin duplicar standings.
- Índices, foreign keys, checks y límites numéricos.

### Route/API tests

- Superusuario autorizado en el endpoint de recálculo.
- `401`/`403` sin contactar repositorios de mutación.
- `409` sin estrategia activa.
- `200` completo y parcial con errores por jugador.
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
| Dataset WhoScored temporal implícito | `players` no distingue temporadas históricas | Configurar una única temporada vigente del market y usarla para contexto y referencias, sin exponer temporadas arbitrarias en el recálculo |
| Lectura de contexto aún no expuesta | El motor no puede resolver el standing local | Agregar método de lectura en `CompetitionContextRepository`, sin reutilizar el adapter HTTP |
| Cambios en snapshots | Históricos imposibles de reproducir | Referenciar `context_update_id` y congelar configuración |
| Doble conteo entre fuentes | Score metodológicamente inválido | Whitelist de métricas y tests de separación de fuentes |
| Datos insuficientes | Cotizaciones engañosas | Renormalización explícita, `INDIVIDUAL_ONLY` y errores por jugador |
| Mutación de versiones | Historial no auditable | Estado publicado inmutable y nuevas versiones |
| Publicación parcial | Fechas de actualización diferentes | Estado `PARTIAL`, contadores y detalle por jugador |
| Redondeo intermedio | Resultados no reproducibles | Redondear solo el valor final a dos decimales |

## Implementation Order

1. Configurar la temporada vigente del market y verificar que coincide con los
   datos WhoScored actualmente persistidos y el contexto válido de
   football-data.org, sin modificar `players`.
2. Cerrar y aprobar el set numérico de pesos iniciales; no implementarlo por
   inferencia.
3. Crear DTOs, schemas y motor puro con fixtures.
4. Agregar tablas Drizzle, migración e índices.
5. Implementar repositorio de versión activa y quotes, incluyendo la lectura
   de contexto heredada.
6. Implementar servicio de recálculo.
7. Implementar controller, ruta, autorización y OpenAPI.
8. Ejecutar unit tests, integración, lint y build.

## Definition of Done for This Plan

- Dos estrategias computan con fuentes separadas y resultados explicables.
- Las fórmulas y parámetros están versionados y reproducibles.
- Cotizaciones históricas son append-only y contienen explicación completa.
- La estrategia híbrida consume contexto persistido, no red.
- Existe recálculo bajo demanda con publicación parcial documentada.
- Migración, contratos OpenAPI y tests quedan sincronizados.
- No se implementan funcionalidades fuera de alcance.
