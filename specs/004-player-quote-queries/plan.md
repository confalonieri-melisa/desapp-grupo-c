# Implementation Plan: Consulta de Cotizaciones Actuales e Históricas

**Branch**: `feature/004-player-quote-queries`  
**Base**: `valuation-strategies`  
**Date**: 2026-10-23  
**Spec**: [spec.md](./spec.md)

## Summary

Agregar una lectura autenticada sobre las cotizaciones ya persistidas por la
feature de estrategias. Se reutilizará `GET /api/players/{id}/quotes`: sin
`date` devuelve el historial completo y con `date=YYYY-MM-DD` devuelve la
última cotización calculada hasta esa fecha.

La solución mantiene la arquitectura existente:

```text
GET route -> PlayerQuotesController -> PlayerQuotesService
          -> PlayerRepository + ValuationRepository -> PostgreSQL
```

No se recalculan precios, no se agregan tablas, no se agregan dependencias y no
se modifica el flujo de recálculo existente.

## Technical Context

**Language/Version**: TypeScript, Node.js `>=22.12.0`  
**Framework**: Next.js 16 App Router  
**Persistence**: PostgreSQL mediante Drizzle ORM  
**Validation**: Zod  
**Testing**: Vitest; unit tests y tests de integración opcionales contra
PostgreSQL real  
**Dependencies**: Ninguna nueva dependencia npm  
**Frontend**: Fuera de alcance para este MVP; el contrato backend queda listo
para consumo posterior por la ficha de jugador.

## Constitution Check

- **Specification First**: PASS. La especificación define el único endpoint,
  reglas temporales, errores, permisos y casos de aceptación.
- **Layered Architecture**: PASS. La route autentica y valida; controller
  adapta la entrada/salida; service resuelve la regla temporal; repositories
  encapsulan Drizzle.
- **Validation by Responsibility**: PASS. Zod valida UUID y fecha; el service
  valida existencia y ausencia de cotización; la base provee relaciones y
  ordenamiento.
- **Tests and Verifiable Behavior**: PASS. Se cubren consultas positivas,
  errores, límites y la garantía de no modificar/recalcular.
- **Incremental Development / YAGNI**: PASS. No hay paginación, filtros,
  endpoint adicional, migración ni UI nueva.
- **Security**: PASS. Se reutiliza `requireAuth`; no se expone lectura pública
  ni se otorgan permisos administrativos especiales.

## Architecture and Data Flow

1. `GET /api/players/{id}/quotes` recibe el request.
2. La route ejecuta `requireAuth`.
3. La route valida `{ id }` y el query param opcional `date` con Zod.
4. `PlayerQuotesController` delega al servicio.
5. `PlayerQuotesService` consulta primero el jugador para distinguir un
   jugador inexistente de un historial vacío.
6. El servicio solicita al repositorio las quotes del jugador, con o sin
   límite temporal.
7. `ValuationRepository` hace un SELECT de `player_quotes` unido a
   `valuation_strategy_versions`, ordenado por `calculated_at DESC, id DESC`.
8. El repositorio mapea numeric strings de Drizzle a números y el controller
   conserva la explicación persistida dentro de `score.components`.
9. La route serializa `{ items }`; los errores pasan por `toHttpResponse`.

Para una fecha `D`, el servicio calcula `nextDayStartUtc(D)` y el repositorio
aplica `calculated_at < nextDayStartUtc`. Se usa `LIMIT 1` solo en la consulta
con fecha.

## Files Affected

### New source files

- `src/app/api/players/[id]/quotes/route.ts`: route GET, JWT, parsing del
  query y manejo HTTP.
- `src/backend/controllers/player-quotes.controller.ts`: contrato de aplicación
  y mapeo de resultado a DTO HTTP.
- `src/backend/services/player-quotes.service.ts`: existencia del jugador,
  regla de selección temporal y diferenciación de historial vacío.
- `src/backend/schemas/player-quotes.schema.ts`: `playerId` y fecha opcional
  estricta `YYYY-MM-DD`.
- `tests/unit/services/player-quotes.service.spec.ts`: regla de selección,
  ausencia y no recálculo.
- `tests/unit/schemas/player-quotes.schema.spec.ts`: UUID y fechas válidas o
  inválidas.
- `tests/integration/player-quotes.repository.spec.ts`: orden, límite temporal,
  join de estrategia y persistencia existente.
- `tests/integration/player-quotes.routes.spec.ts`: JWT, respuestas HTTP y
  contrato del endpoint.

### Existing files to modify

- `src/backend/repositories/valuation.repository.ts`: agregar métodos de
  lecturas `findHistoryByPlayerId` y `findLatestQuoteBefore`, incluyendo join a
  `valuationStrategyVersions`; no modificar `saveQuote`.
- `src/backend/errors/http.error.ts`: reutilizar errores HTTP simples para
  respuestas `400` y `404`, manteniendo compatibilidad con errores existentes.
- `src/backend/errors/to-http-response.ts`: serializar el mensaje y status de
  los errores HTTP.
- `specs/001-player-token-marketplace/contracts/openapi.yaml`: incorporar la
  ruta real al contrato Swagger que carga `/api/docs`.

### Existing files explicitly not to modify for behavior

- `src/backend/db/schema.ts`: ya contiene las columnas y relaciones necesarias.
- `src/backend/db/migrations/*`: no se genera migración.
- `src/backend/services/quote-recalculation.service.ts`.
- `src/backend/services/valuation-engine.ts`.
- `src/backend/adapters/*`.
- Frontend de catálogo/perfil: fuera del MVP.

## Data Model and Migration

No se requiere migración. La consulta usa:

- `players.id` para comprobar existencia.
- `player_quotes.player_id`, `calculated_at`, `id`, scores, valor, unidad y
  explicación.
- `valuation_strategy_versions.id`, `strategy_code` y `version`.

El índice existente `idx_player_quotes_player_date` sobre
`(player_id, calculated_at)` cubre el filtro principal. El desempate por `id`
se resuelve en SQL; no se agrega un índice compuesto en el MVP.

La lectura debe conservar el `strategy_code` y `version` relacionados con cada
quote, aunque la estrategia activa actual sea diferente.

## API Contract

### `GET /api/players/{id}/quotes`

Parameters:

- `id`: UUID requerido.
- `date`: query opcional, fecha real `YYYY-MM-DD`.

Response:

```json
{
  "items": [
    {
      "playerId": "uuid",
      "quoteValue": 82.5,
      "unit": "CREDIT_PER_TOKEN",
      "calculatedAt": "2026-10-20T18:30:00.000Z",
      "strategyCode": "INDIVIDUAL_PLUS_TEAM_CONTEXT",
      "strategyVersion": "1.0.0",
      "score": {
        "individualScore": 0.81,
        "teamScore": 0.74,
        "finalScore": 0.823,
        "components": {
          "individual": [],
          "team": []
        }
      }
    }
  ]
}
```

With `date`, `items` tiene un único elemento o se responde `404` si no existe
una cotización elegible. Sin `date`, `items` puede estar vacío.

HTTP outcomes:

- `200`: historial o resultado puntual.
- `400`: UUID/formato de fecha inválido.
- `401`: JWT ausente, inválido o expirado.
- `404`: jugador inexistente o no existe quote anterior o igual a `date`.

El campo `components` es una proyección directa de `QuoteExplanation`:
`individual` y `team` contienen las contribuciones persistidas. No se invoca
`ValuationEngine`.

## Testing Strategy

### Unit tests

- Schema: acepta UUID y fecha real `YYYY-MM-DD`; rechaza fechas imposibles,
  horas, zonas horarias y valores vacíos.
- Service: jugador inexistente; historial vacío; fecha anterior a todo;
  fecha coincidente; fecha futura; empate por `id`; delegación sin engine ni
  insert/update.
- Repository: mapea numeric strings a números y devuelve `null` cuando no hay
  una cotización elegible para la fecha.
- Controller: conserva `teamScore`, incluso cuando es `null`, y los
  componentes de explicación.

### Repository/integration tests

Con PostgreSQL real y `RUN_DB_INTEGRATION_TESTS=true`:

- Inserta jugadores, versiones y quotes de prueba.
- Verifica historial completo en orden `calculated_at DESC, id DESC`.
- Verifica selección limitada por fecha y que no toma quotes posteriores.
- Verifica join de `strategyCode` y `version` históricos.
- Verifica que el endpoint no crea ni modifica filas.
- Verifica el caso de un jugador existente sin quotes.

### Route/API tests

- `401` sin Bearer o con token inválido.
- `200` para historial y consulta por fecha.
- `400` para UUID/fecha inválidos.
- `404` diferenciado para jugador inexistente y quote ausente.
- `INVESTOR` y `SUPERUSER` pueden consultar; no se llama a
  `requireSuperuser`.

No se requieren tests de migración porque no hay cambio de esquema, ni tests de
adapters porque no se permite red en esta feature.

## Dependencies

- Código y migraciones de `valuation-strategies` ya presentes en la rama base.
- PostgreSQL para los tests de integración.
- JWT/middleware y `UserRole` existentes.
- No se agregan paquetes npm.

## Risks and Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Interpretación de fecha dependiente de zona horaria | Selección histórica incorrecta | Validar fecha calendario y usar inicio del día siguiente UTC como límite exclusivo |
| Leer estrategia activa en vez de la histórica | Se pierde trazabilidad | Join por `strategy_version_id` de la quote |
| Confundir jugador inexistente con historial vacío | Contrato HTTP incorrecto | Comprobar `players` antes de consultar `player_quotes` |
| Recalcular accidentalmente durante una lectura | Modificación de datos y latencia | Dependencia exclusiva del repositorio; tests con mocks que aseguren ausencia del engine |
| Numeric de PostgreSQL serializado como string | Contrato inconsistente | Mapper único en controller y tests del DTO |
| Mensaje o status HTTP inconsistente | Regresión en contratos | Reutilizar errores HTTP existentes y ejecutar suite completa |
| Crecimiento futuro del historial | Lecturas grandes | Mantener índice existente; dejar paginación como feature posterior |

## Implementation Order

1. Crear schemas de parámetros y definir respuestas HTTP con status y mensajes
   descriptivos.
2. Agregar métodos de lectura al `ValuationRepository` con join, orden y límite
   temporal.
3. Implementar `PlayerQuotesService` y su mapper de salida.
4. Implementar `PlayerQuotesController` y la route autenticada.
5. Actualizar el OpenAPI principal y conservar el contrato YAML de la feature.
6. Ejecutar unit tests, integración, lint y build.

## Definition of Done for This Plan

- `GET /api/players/{id}/quotes` funciona con y sin `date`.
- Se reutilizan únicamente cotizaciones persistidas y su explicación.
- No se genera migración ni se agregan dependencias.
- Se diferencian jugador inexistente, historial vacío y ausencia de quote a una
  fecha.
- El contrato OpenAPI coincide con la implementación.
- Tests dirigidos, TypeScript y build pasan. La integración PostgreSQL se
  ejecuta cuando el entorno está disponible; el lint global puede incluir
  archivos preexistentes fuera de esta feature.
- No se implementan paginación, filtros, UI ni funcionalidades fuera del MVP.
