# Implementation Plan: Ranking de Jugadores por Valuación Activa

**Branch**: `feature/007-player-ranking`  
**Base**: `feature/006-operation-history`  
**Date**: 2026-10-24  
**Spec**: [spec.md](./spec.md)

## Summary

Agregar `GET /api/players/ranking` como lectura autenticada y paginada de los
jugadores que tienen una cotización persistida para la versión activa de
valuación.

La implementación capturará una sola vez la versión activa mediante el
`ValuationRepository`, y delegará en un repositorio de lectura específico la
consulta PostgreSQL que:

1. selecciona la última cotización por jugador para ese `strategyVersionId`;
2. combina esa cotización con los datos del jugador;
3. aplica filtros de liga, equipo y posición;
4. ordena por score y desempates deterministas;
5. calcula el total y aplica `page`/`limit`.

Se reutilizarán la autenticación, errores HTTP, enums, tablas y migraciones
existentes. No se recalculan cotizaciones, no se crea una tabla nueva y no se
agregan dependencias npm.

## Technical Context

**Language/Version**: TypeScript, Node.js `>=22.12.0`  
**Framework**: Next.js 16 App Router  
**Persistence**: PostgreSQL mediante Drizzle ORM  
**Validation**: Zod  
**Testing**: Vitest; tests unitarios, de route e integración opcional contra PostgreSQL real  
**Dependencies**: Ninguna nueva dependencia npm  
**Target Platform**: Servidor Node.js de Next.js  
**Project Type**: Web application con API REST y frontend existente  
**Performance Goals**: Una sola consulta de datos paginada y una consulta de
conteo por solicitud; no cargar ni ordenar todo el catálogo en memoria  
**Constraints**: JWT obligatorio; `limit` máximo 100; solo cotizaciones de la
versión activa; lectura sin efectos secundarios  
**Scale/Scope**: Cinco ligas oficiales, ranking backend MVP, sin UI nueva ni
comparación histórica

## Constitution Check

- **Specification First**: PASS. `spec.md` define endpoint, permisos, filtros,
  selección de cotización, errores, contrato y criterios verificables.
- **Layered Architecture**: PASS. La route autentica/valida, el controller
  adapta DTOs, el service coordina la versión activa y el repositorio encapsula
  el join y la paginación SQL.
- **Validation by Responsibility**: PASS. Zod valida query params; el service
  resuelve la estrategia activa; PostgreSQL aplica relaciones, filtros,
  deduplicación y ordenamiento.
- **Tests and Verifiable Behavior**: PASS. Se cubrirán selección de versión,
  latest quote, filtros, orden, paginación, permisos, errores y lectura pura.
- **Incremental Development / YAGNI**: PASS. No se agregan estrategias,
  recalculación, migraciones, caché, UI ni abstracciones genéricas nuevas.
- **Security**: PASS. Se reutiliza `requireAuth`; no se requiere
  `requireSuperuser` porque el ranking es una lectura para usuarios
  autenticados.

## Architecture and Data Flow

```text
GET /api/players/ranking
  -> requireAuth
  -> playerRankingQuerySchema (strict)
  -> PlayerRankingController
  -> PlayerRankingService
       -> ValuationRepository.findActiveStrategyVersion()
       -> PlayerRankingRepository.findRankedPlayers(strategyVersionId, filters, pagination)
  -> Response JSON / toHttpResponse
```

El servicio captura `strategyVersionId`, `strategyCode` y `version` antes de
consultar el ranking. El repositorio de ranking recibe el ID capturado y nunca
vuelve a resolver una estrategia activa, evitando mezclar versiones durante la
solicitud.

La consulta de ranking usará una subconsulta o CTE PostgreSQL con una fila por
`player_id`, seleccionada por `calculated_at DESC, id DESC`, filtrada por
`strategy_version_id`. Luego aplicará los filtros de jugador, el orden global,
`OFFSET` y `LIMIT`. El conteo se calculará sobre el conjunto deduplicado y
filtrado, antes de paginar.

El service asignará `rank = (page - 1) * limit + índice + 1` a los elementos de
la página. Como el orden SQL es total y estable, el rank representa la posición
global dentro del conjunto filtrado.

## Files Affected

### New source files

- `src/app/api/players/ranking/route.ts`: route GET, JWT, extracción del query,
  validación estricta y serialización de errores.
- `src/backend/controllers/player-ranking.controller.ts`: delegación al
  service y mapeo al DTO mínimo del contrato.
- `src/backend/services/player-ranking.service.ts`: captura de la estrategia
  activa, coordinación del repositorio y cálculo de `rank`/paginación.
- `src/backend/services/player-ranking.types.ts`: criterios, resultado de
  lectura y tipos de la proyección del ranking; no crea una entidad persistida.
- `src/backend/repositories/player-ranking.repository.ts`: consulta
  `findRankedPlayers` read-only entre `players`, `player_quotes` y
  `valuation_strategy_versions`, con deduplicación, filtros, orden, conteo y
  paginación.
- `src/backend/schemas/player-ranking.schema.ts`: schema Zod estricto para
  paginación y parámetros desconocidos, extendiendo la definición compartida
  de filtros del jugador.
- `tests/unit/services/player-ranking.service.spec.ts`: coordinación,
  selección de versión, rank global, ausencia de estrategia y no recálculo.
- `tests/unit/schemas/player-ranking.schema.spec.ts`: defaults, enums,
  normalización de equipo, límites y parámetros desconocidos.
- `tests/unit/controllers/player-ranking.controller.spec.ts`: mapeo del DTO y
  omisión de campos internos del score.
- `tests/integration/player-ranking.repository.spec.ts`: latest quote por
  jugador, versión activa, filtros, orden, deduplicación, conteo y paginación.
- `tests/integration/player-ranking.routes.spec.ts`: JWT, `400`, `401`, `409`,
  `200`, contrato JSON y delegación.
- `specs/007-player-ranking/contracts/ranking.yaml`: contrato aislado de la
  feature para revisión y trazabilidad.

### Existing files to modify

- `specs/001-player-token-marketplace/contracts/openapi.yaml`: agregar la ruta
  `/players/ranking`, schemas y respuestas al documento que actualmente carga
  `/api/docs`.
- `src/backend/schemas/player.schema.ts`: extraer `playerFiltersSchema` con
  `league`, `team` y `position`; el catálogo existente lo extenderá junto con
  sus parámetros actuales y el ranking reutilizará la misma definición.

### Existing files explicitly reused without behavior changes

- `src/backend/middlewares/auth.middleware.ts`: `requireAuth`.
- `src/backend/errors/http.error.ts`: `ConflictError`, `BadRequestError` y
  `UnauthorizedError` existentes.
- `src/backend/errors/to-http-response.ts`: serialización de errores HTTP.
- `src/backend/repositories/valuation.repository.ts`:
  `findActiveStrategyVersion()` únicamente.
- `src/backend/db/schema.ts`: tablas, constraints y relaciones existentes.
- `src/backend/models/enums.ts`: `League` y `Position`.
- `src/backend/models/valuation.ts`: códigos y tipos de estrategia existentes.

No se modifica `ValuationEngine`, `QuoteRecalculationService`, el flujo de
activación de estrategias ni el catálogo actual.

## Data Model and Migration

No se requiere migración ni tabla nueva.

La lectura utilizará:

- `valuation_strategy_versions.id`, `strategy_code`, `version` e `is_active`
  para identificar la versión capturada.
- `player_quotes.player_id`, `strategy_version_id`, `final_score`,
  `quote_value`, `unit`, `calculated_at` e `id` para seleccionar la cotización
  más reciente y devolver su snapshot.
- `players.id`, `name`, `team`, `league` y `position` para la proyección y los
  filtros.

El índice existente `idx_player_quotes_player_date` se conserva. No se agrega
un índice compuesto por `strategy_version_id` en el MVP: primero se valida el
comportamiento con el esquema actual y el límite máximo de 100. Si el volumen
real demuestra una consulta insuficiente, un índice específico será una
decisión posterior con medición y migración separada.

La integridad de valores ya está protegida por los constraints existentes de
`final_score` `[0,1]` y `quote_value` `[1,100]`; el ranking no los recalcula ni
los normaliza.

## API Contract

### `GET /api/players/ranking`

Headers:

```http
Authorization: Bearer <JWT>
```

Query parameters opcionales:

- `league`: enum `PREMIER_LEAGUE`, `BUNDESLIGA`, `LA_LIGA`, `SERIE_A` o
  `LIGUE_1`.
- `team`: texto no vacío después de `trim`; coincidencia parcial
  case-insensitive.
- `position`: enum `UNKNOWN`, `GOALKEEPER`, `DEFENDER`, `MIDFIELDER` o
  `FORWARD`.
- `page`: entero mínimo 1, default `1`.
- `limit`: entero entre 1 y 100, default `20`.

El schema será `.strict()`: cualquier parámetro no contemplado responde `400`.

Respuesta `200`:

```json
{
  "strategyCode": "INDIVIDUAL_PERFORMANCE",
  "strategyVersion": "1.0.0",
  "items": [
    {
      "rank": 1,
      "player": {
        "id": "uuid",
        "name": "Player One",
        "team": "Arsenal",
        "league": "PREMIER_LEAGUE",
        "position": "FORWARD"
      },
      "finalScore": 0.87,
      "quoteValue": 87.13,
      "unit": "CREDIT_PER_TOKEN",
      "calculatedAt": "2026-10-24T15:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

Cuando no haya resultados, `items` será `[]`, `total` será `0` y
`totalPages` será `0`.

HTTP outcomes:

- `200`: ranking, incluso si el conjunto filtrado está vacío.
- `400`: query inválido, límite fuera de rango o parámetro desconocido.
- `401`: JWT ausente, inválido o expirado.
- `409`: no existe una versión activa.
- `500`: error inesperado sin detalles internos.

No se exponen `individualScore`, `teamScore` ni `explanation` en este endpoint.

## Testing Strategy

### Unit tests

- Schema: defaults `page=1`/`limit=20`, enums válidos, `team.trim()`, equipo
  vacío, límites inválidos y rechazo de claves desconocidas.
- Service: usa exactamente la estrategia activa recibida; arroja
  `ConflictError` si no existe; pasa el `strategyVersionId` al repositorio;
  calcula rank global por página; conserva `totalPages=0`; no invoca engine,
  recálculo ni operaciones de escritura.
- Repository con mocks/fixtures del executor: forma filtros, orden y mapeo de
  numeric strings a números cuando corresponda.
- Controller: devuelve solo la proyección pública definida y conserva
  estrategia/version y paginación.

### Repository/integration tests

Con `RUN_DB_INTEGRATION_TESTS=true` y PostgreSQL:

- Inserta jugadores de distintas ligas, equipos y posiciones.
- Inserta dos versiones, una activa y una inactiva, con quotes para los mismos
  jugadores.
- Verifica que solo se usa la versión capturada.
- Verifica que múltiples quotes del mismo jugador producen una sola entrada y
  que gana `calculated_at DESC, id DESC`.
- Verifica orden por `final_score DESC`, `quote_value DESC`, `name ASC`,
  `id ASC`.
- Verifica filtros combinados, `total`, `OFFSET`, `LIMIT` y rank global.
- Verifica resultado vacío y jugador sin quote compatible.
- Verifica que la consulta no crea ni actualiza filas.

### Route/API tests

- `401` sin Bearer o con autenticación fallida, sin invocar controller.
- `400` para enum inválido, equipo vacío, `page`/`limit` inválidos y query
  desconocido.
- `409` propagado cuando no hay estrategia activa.
- `200` con respuesta mínima, headers de autenticación, paginación y `rank`.
- `200` vacío con `totalPages=0`.

No se requieren tests de migración, adapters, scheduler, caché ni frontend para
este MVP.

## Dependencies

- Features ya presentes en la rama base: catálogo de jugadores, estrategias
  versionadas, cotizaciones persistidas y middleware JWT.
- PostgreSQL para tests de integración.
- Drizzle ORM, Zod y Vitest ya instalados.
- No se agregan paquetes npm ni servicios externos.

## Risks and Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Elegir una quote de una versión inactiva | Ranking incorrecto | Capturar `strategyVersionId` activo y filtrar por FK, no por código textual |
| Duplicar jugadores por múltiples quotes | Rank y total incorrectos | Subconsulta/CTE deduplicada por `player_id` con orden temporal estable |
| Paginar antes de ordenar o deduplicar | Páginas inconsistentes | Orden y conteo sobre el conjunto deduplicado; `LIMIT/OFFSET` al final |
| Cambiar estrategia durante la lectura | Mezcla de versiones | El service captura una versión y el repository recibe solo ese ID |
| Query params desconocidos silenciosamente ignorados | Contrato ambiguo | Schema Zod estricto y test de `400` |
| Índice insuficiente con mucho historial | Latencia creciente | Mantener query acotada a versión/página y medir antes de agregar migración |
| Filtrar/ordenar en memoria | Uso excesivo de memoria y rank incorrecto | Join, filtros, conteo y orden en PostgreSQL |
| Exponer detalles internos de valuación | Contrato innecesariamente pesado | DTO mínimo sin explicación ni scores secundarios |

## Implementation Order

1. Extraer `playerFiltersSchema` desde el schema de catálogo y crear el schema
   de ranking extendido, estricto para parámetros desconocidos.
2. Implementar `PlayerRankingRepository` con latest quote por jugador,
   filtros, orden, conteo y paginación.
3. Implementar `PlayerRankingService` reutilizando
   `ValuationRepository.findActiveStrategyVersion()`.
4. Implementar controller y route autenticada.
5. Agregar contrato aislado y actualizar el OpenAPI canónico usado por Swagger.
6. Escribir tests unitarios, route/API e integración PostgreSQL.
7. Ejecutar tests dirigidos, suite completa, lint y build.

## Definition of Done for This Plan

- `GET /api/players/ranking` cumple el contrato autenticado y estricto.
- Solo participa la última quote de cada jugador para la versión activa
  capturada.
- El orden, filtros, paginación, rank global, errores y respuesta vacía están
  cubiertos por tests.
- No se agregan migraciones, dependencias, recálculos ni UI.
- Swagger/OpenAPI documenta la ruta real y coincide con la implementación.
- Tests dirigidos, TypeScript, lint y build pasan; la integración PostgreSQL se
  ejecuta cuando el entorno está disponible.
