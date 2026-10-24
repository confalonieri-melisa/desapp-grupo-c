# Implementation Plan: Historial de Operaciones Financieras

**Branch**: `feature/006-operation-history`  
**Base**: `feature/005-player-token-trading`  
**Date**: 2026-10-24  
**Spec**: [spec.md](./spec.md)

## Summary

Agregar una consulta autenticada y de solo lectura para exponer las
operaciones financieras propias del usuario inversor.

La implementación reutilizará `market_operations`, que ya es el registro
persistido e inmutable de las operaciones completadas. La route validará JWT,
UUID y paginación; el `MarketOperationController` y el
`MarketOperationService` existentes incorporarán la consulta de historial; y
el `MarketRepository` leerá las operaciones ordenadas con una fila adicional
para calcular `hasMore`.

No se reconstruirán operaciones desde `token_holdings`, portfolio, saldos,
cotizaciones actuales o auditorías. No se agregan tablas, migraciones,
dependencias, joins para enriquecer jugadores ni funcionalidad frontend.

## Technical Context

**Language/Version**: TypeScript, Node.js `>=22.12.0`  
**Framework**: Next.js 16 App Router  
**Persistence**: PostgreSQL con Drizzle ORM  
**Validation**: Zod  
**Authentication**: JWT mediante `requireAuth`, con sujeto en `auth.sub`  
**Testing**: Vitest; tests unitarios, de rutas e integración PostgreSQL  
**Dependencies**: No se agregan paquetes npm  
**Frontend**: Fuera de alcance  
**Storage changes**: Ninguno; se reutiliza `market_operations`

## Constitution Check

- **Specification First**: PASS. El endpoint, la autorización, la
  paginación, los errores y la fuente de verdad están definidos en `spec.md`.
- **Layered Architecture**: PASS. Se mantiene `route → controller → service →
  repository`; Drizzle queda encapsulado en el repositorio.
- **Validation by Responsibility**: PASS. Zod valida formato y rangos; el
  service valida la coincidencia entre `:id` y `auth.sub`; el repositorio solo
  ejecuta la lectura persistente.
- **Tests and Verifiable Behavior**: PASS. Se cubren aislamiento, orden,
  paginación, historial vacío, errores y ausencia de escrituras.
- **Auditability**: PASS. Se consultan operaciones append-only y no se
  modifican sus registros ni sus auditorías.
- **Incremental Development / YAGNI**: PASS. No se agregan entidad de
  historial, cache, joins, filtros, exportaciones ni permisos administrativos.

## Architecture and Data Flow

```text
GET /api/users/:id/transactions
  -> requireAuth
  -> parse path/query with Zod
  -> MarketOperationController.getHistory()
  -> MarketOperationService.getHistory()
  -> MarketRepository.findOperationsByInvestorId()
  -> SELECT market_operations
  -> map persisted rows to read DTO
  -> { items, limit, offset, hasMore }
```

Reglas del flujo:

1. La route obtiene el JWT antes de acceder a la consulta.
2. Se valida que `:id` sea UUID y que `limit`/`offset` sean enteros válidos.
3. El service compara `:id` con `auth.sub`; si difieren, responde `403` sin
   consultar operaciones.
4. El repositorio filtra por `market_operations.investor_id = :id` y ordena por
   `created_at DESC, id DESC`.
5. Se solicita `limit + 1` filas; se devuelve como máximo `limit` y
   `hasMore = true` si existe la fila adicional.
6. Los campos monetarios se mapean como números desde los valores `numeric` de
   PostgreSQL. No se recalculan `quoteValue` ni `total`.
7. `correlationId` se serializa siempre, con `null` cuando la columna es nula.

## Domain and Application Responsibilities

### `MarketOperation`

Continúa representando el hecho financiero creado por la feature anterior.
No se modifica su semántica ni se crea otra entidad persistida para el
historial.

### Proyección de respuesta

Proyección inmutable de lectura, definida como un `type`/interface local del
`MarketOperationService`, no como clase o entidad nueva. No es una nueva fuente
de verdad y no debe reconstruir ni recalcular una operación.
Incluye `id`, `type`, `playerId`, `quantity`, `quoteId`, `quoteValue`, `total`,
`unit`, `createdAt` y `correlationId`.

### `MarketOperationService.getHistory`

Orquesta las reglas de aplicación:

- valida que el identificador de ruta sea el sujeto autenticado;
- normaliza los parámetros de paginación ya validados;
- delega la lectura al repositorio;
- proyecta el resultado sin acceder a portfolio, holdings o valuation;
- devuelve `items`, `limit`, `offset` y `hasMore`.

No debe consultar `UserRepository` para resolver el usuario: la identidad ya
fue validada por JWT y el filtro por `investor_id` es suficiente para este
endpoint.

### `MarketOperationController.getHistory`

Se agrega el método de lectura al controller existente del contexto de
mercado. No se crea un controller paralelo para una operación del mismo
agregado.

### `MarketRepository`

Agrega una operación de lectura para `market_operations`. Puede convivir con
las operaciones transaccionales existentes porque pertenece al mismo agregado
de mercado. La consulta no debe compartir ni abrir una transacción de escritura
y no debe llamar a `ValuationRepository`.

## Files to Add or Modify

### New source files

- `src/app/api/users/[id]/transactions/route.ts`: route GET, `requireAuth`,
  parseo de params y delegación HTTP.
- `tests/integration/transaction-history.repository.spec.ts`: lectura desde
  PostgreSQL, orden, límite, desempate y aislamiento por `investor_id`.
- `tests/integration/transaction-history.routes.spec.ts`: respuestas HTTP,
  JWT, UUID, autorización y contrato de respuesta.
- `specs/006-operation-history/contracts/transactions.yaml`: contrato OpenAPI
  aislado de la feature.
- `specs/006-operation-history/research.md`: decisiones y evidencia del
  relevamiento.
- `specs/006-operation-history/data-model.md`: modelo de lectura y ausencia
  de migración.
- `specs/006-operation-history/quickstart.md`: demostración del endpoint.

### Existing files to modify

- `src/backend/controllers/market-operation.controller.ts`: agregar
  `getHistory`.
- `src/backend/services/market-operation.service.ts`: agregar la consulta de
  historial, autorización por sujeto y proyección de respuesta.
- `src/backend/schemas/market-operation.schema.ts`: agregar los schemas de
  params/query del historial junto a los schemas del mismo contexto.
- `src/backend/repositories/market.repository.ts`: método de lectura de
  operaciones persistidas y mapper de filas, sin tocar el flujo de trading.
- `tests/unit/schemas/market-operation.schema.spec.ts`: agregar validaciones
  del historial a la suite existente.
- `tests/unit/services/market-operation.service.spec.ts` y
  `tests/unit/controllers/market-operation.controller.spec.ts`: extender las
  suites existentes con los casos de historial.
- `specs/001-player-token-marketplace/contracts/openapi.yaml`: incorporar la
  ruta `/users/{id}/transactions`, porque `/api/docs` carga este contrato
  global.

### Files explicitly not to modify for behavior

- `src/backend/db/schema.ts`: ya contiene `market_operations` e índices
  necesarios.
- `src/backend/db/migrations/*`: no se requiere migración.
- `src/backend/models/MarketTrade.ts`: no participa en una lectura.
- `src/backend/repositories/portfolio.repository.ts` y
  `src/backend/services/portfolio.service.ts`: no son fuente del historial.
- `src/backend/repositories/valuation.repository.ts`: no se consulta para
  cotizaciones actuales.
- Frontend: fuera del alcance de esta feature.

## Data Model and Query Design

No hay cambios de esquema. La fuente de verdad es `market_operations`.

Consulta prevista:

```sql
SELECT id, type, player_id, quantity, quote_id, quote_value, total, unit,
       created_at, correlation_id
FROM market_operations
WHERE investor_id = :authenticatedUserId
ORDER BY created_at DESC, id DESC
LIMIT :limitPlusOne
OFFSET :offset
```

El índice existente sobre `(investor_id, created_at)` cubre el filtro y el
orden principal. No se agrega un índice nuevo para el desempate por `id` en
esta feature.

No se hacen joins con `players`, `player_quotes` ni `financial_audit_records`.
Los IDs persistidos son suficientes para el contrato MVP y evitan que una
consulta de historial dependa de datos descriptivos actuales.

## API Contract Summary

### `GET /api/users/{id}/transactions?limit=50&offset=0`

- `id`: UUID requerido; debe coincidir con `auth.sub`.
- `limit`: entero opcional, default `50`, mínimo `1`, máximo `100`.
- `offset`: entero opcional, default `0`, mínimo `0`.
- `Authorization: Bearer <JWT>` requerido.

Respuesta `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "BUY",
      "playerId": "uuid",
      "quantity": 3,
      "quoteId": "uuid",
      "quoteValue": 82.5,
      "total": 247.5,
      "unit": "CREDIT_PER_TOKEN",
      "createdAt": "2026-10-24T15:00:00.000Z",
      "correlationId": null
    }
  ],
  "limit": 50,
  "offset": 0,
  "hasMore": false
}
```

Estados:

- `200`: consulta exitosa, incluso sin operaciones.
- `400`: UUID, `limit` u `offset` inválidos.
- `401`: JWT ausente, inválido o expirado.
- `403`: `:id` no coincide con `auth.sub`.
- `500`: error inesperado sin exponer detalles internos.

## Testing Strategy

### Unit tests

- Schema: defaults `limit=50`, `offset=0`; acepta `limit` hasta `100` y
  `offset` no negativo; rechaza decimales, negativos, cero para `limit`,
  valores no numéricos y UUID inválidos.
- Service: permite el propio `auth.sub`; rechaza otro `:id` con `403` sin
  invocar el repositorio; conserva el orden y `hasMore`; devuelve historial
  vacío; no consulta servicios de portfolio o cotizaciones.
- Mapper/controller: conserva `quoteValue`, `total`, `createdAt` y
  `correlationId: null` sin recalcular ni omitir campos.

### PostgreSQL integration tests

Con `RUN_DB_INTEGRATION_TESTS=true`:

- inserta operaciones de dos inversores;
- verifica que cada consulta solo devuelve el `investor_id` autenticado;
- verifica `created_at DESC, id DESC` para fechas iguales;
- verifica `limit + 1`, `hasMore`, `offset` y página final;
- verifica que cotizaciones o tenencias posteriores no alteran la respuesta;
- verifica que la consulta no inserta ni actualiza filas.

### Route tests

- `401` sin Bearer o con JWT inválido;
- `400` para UUID, `limit` u `offset` inválidos;
- `403` para un `:id` diferente de `auth.sub`;
- `200` con operaciones y con `items: []`;
- serialización exacta de paginación y `correlationId` nulo.

## Implementation Order

1. Crear el schema Zod de params y paginación.
2. Agregar el método de lectura al `MarketRepository` con orden, `limit + 1`
   y mapeo de `numeric` a números.
3. Extender `MarketOperationService` y `MarketOperationController` con la
   consulta y su tipo de respuesta local.
4. Implementar la route dinámica autenticada usando los objetos existentes.
5. Agregar el contrato OpenAPI global y el contrato aislado de la feature.
6. Agregar tests unitarios, de repositorio y de route.
7. Ejecutar tests dirigidos, integración PostgreSQL cuando esté disponible,
   lint, TypeScript, build y `git diff --check`.

## Risks and Mitigations

| Riesgo | Mitigación |
|---|---|
| Exponer operaciones ajenas | Comparar `:id` con `auth.sub` antes de consultar y filtrar también en SQL |
| Reconstruir datos desde el estado actual | Leer exclusivamente `market_operations`, sin joins ni cálculos |
| Respuestas sin límite | `limit` por defecto 50, máximo 100 y consulta `limit + 1` |
| Orden no determinista | `created_at DESC, id DESC` |
| Cambiar el flujo financiero existente | Agregar solo una lectura al repositorio y tests de regresión |
| Inconsistencia de decimales | Mapear `numeric` una vez a número; no recalcular importes |

## Definition of Done

- La ruta `GET /api/users/{id}/transactions` cumple el contrato definido.
- Solo devuelve operaciones persistidas del inversor autenticado.
- La paginación, el orden y `hasMore` funcionan en casos positivos y límites.
- La consulta no escribe ni modifica operaciones, auditorías, holdings, saldos
  ni cotizaciones.
- OpenAPI global y contrato de feature están sincronizados.
- Tests dirigidos, TypeScript, lint, build y `git diff --check` pasan.
- No se agregan migraciones, dependencias, frontend ni abstracciones de
  sobreingeniería.
