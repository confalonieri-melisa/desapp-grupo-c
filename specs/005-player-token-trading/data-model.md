# Data Model: Compra y Venta de Tokens de Jugadores

## Fuentes de verdad existentes

| Dato | Fuente | Regla |
|---|---|---|
| Saldo de créditos | `users.credit_balance` | No se copia en otra tabla de estado |
| Tenencia y precio promedio | `token_holdings` | Incluye la posición del pool |
| Jugador | `players` | FK desde tenencias y operaciones |
| Cotización | `player_quotes` | Se consulta la más reciente y se conserva su referencia |

El portfolio, el valor actual, el PnL, la disponibilidad y el total emitido
son datos derivados o invariantes. No se agregan columnas para ellos.

## Tablas nuevas

### `market_operations`

Registro append-only de una operación completada.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK | Identificador de operación |
| `type` | `varchar(10)` | `BUY` o `SELL` | Tipo de operación |
| `investor_id` | `uuid` | FK `users`, not null | Inversor autenticado |
| `player_id` | `uuid` | FK `players`, not null | Jugador operado |
| `quote_id` | `uuid` | FK `player_quotes`, not null | Cotización usada |
| `quantity` | `integer` | `> 0` | Tokens transferidos |
| `quote_value` | `numeric(10,2)` | `>= 0` | Snapshot del precio ejecutado |
| `total` | `numeric(12,2)` | `> 0` | `quantity * quote_value` |
| `unit` | `varchar(30)` | not null | `CREDIT_PER_TOKEN` |
| `correlation_id` | `varchar(100)` | nullable | Trazabilidad de request |
| `created_at` | `timestamp with time zone` | not null | Momento de ejecución |

`quote_value` es una duplicación deliberada del valor de `player_quotes`: la
operación debe conservar el precio exacto aplicado como hecho financiero,
mientras `quote_id` permite rastrear la cotización original.

No se agrega `status`: solo se insertan operaciones completadas. Los intentos
rechazados no son operaciones financieras persistidas.

Índices:

- `(investor_id, created_at DESC)` para futuras lecturas internas;
- `(player_id, created_at DESC)` para trazabilidad;
- FK e índice de `quote_id`.

### `financial_audit_records`

Registro append-only de la transición producida por una operación.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | `uuid` | PK | Identificador del evento |
| `operation_id` | `uuid` | FK `market_operations`, unique | Operación auditada |
| `actor_user_id` | `uuid` | FK `users`, not null | Actor autenticado |
| `action` | `varchar(50)` | not null | `TOKEN_BUY` o `TOKEN_SELL` |
| `previous_state` | `jsonb` | not null | Saldos y posiciones anteriores |
| `new_state` | `jsonb` | not null | Saldos y posiciones posteriores |
| `correlation_id` | `varchar(100)` | nullable | Trazabilidad de request |
| `created_at` | `timestamp with time zone` | not null | Momento del evento |

Los snapshots contienen únicamente:

```json
{
  "investor": {
    "creditBalance": 1000,
    "quantity": 0,
    "averagePurchasePrice": 0
  },
  "pool": {
    "creditBalance": 1000,
    "quantity": 100
  }
}
```

El audit record no repite jugador, cantidad, total ni cotización: se obtienen
desde `operation_id`.

## Restricciones e invariantes

- `token_holdings.quantity >= 0` y es entero.
- `market_operations.quantity > 0`.
- `market_operations.total = quantity * quote_value` a dos decimales.
- Para cada jugador: `pool quantity + investor quantities = 100`.
- El pool debe corresponder al único usuario `SUPERUSER` resuelto por la
  aplicación/configuración; no se persiste porque es una contraparte única.
- No se permite borrar ni actualizar operaciones o auditorías desde la
  aplicación.

## Inicialización

Por cada jugador, la inicialización idempotente debe garantizar:

1. cotización inicial persistida de `1.00` si no existe cotización;
2. tenencia del pool con `100` tokens si no existe tenencia;
3. ausencia de modificación de una cotización o tenencia ya utilizada.

El saldo inicial del pool debe ser provisto por seed/configuración. No se crea
dinero durante una compra o venta.

## Portfolio

La consulta se resuelve con un `SELECT` de `token_holdings` del actor, unido a
la cotización vigente de cada jugador. No se crea tabla `portfolios` ni se
persisten `currentValue` o `unrealizedPnl`.
