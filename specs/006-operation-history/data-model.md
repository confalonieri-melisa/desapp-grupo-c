# Data Model: Historial de Operaciones Financieras

## Sin cambios de esquema

La feature reutiliza la tabla `market_operations` creada por
`005-player-token-trading`. No se agregan columnas, tablas, migraciones ni
índices.

## Fuente de verdad

| Dato expuesto | Columna persistida |
|---|---|
| Identificador | `market_operations.id` |
| Tipo | `market_operations.type` |
| Jugador | `market_operations.player_id` |
| Cantidad | `market_operations.quantity` |
| Cotización referenciada | `market_operations.quote_id` |
| Cotización aplicada | `market_operations.quote_value` |
| Importe total | `market_operations.total` |
| Unidad | `market_operations.unit` |
| Fecha | `market_operations.created_at` |
| Correlation ID | `market_operations.correlation_id` |

`investor_id` se usa para autorización y filtrado, pero no es necesario
exponerlo en la respuesta porque ya está determinado por `auth.sub` y `:id`.

## Consulta

```text
WHERE investor_id = authenticatedUserId
ORDER BY created_at DESC, id DESC
LIMIT limit + 1
OFFSET offset
```

La fila adicional permite calcular `hasMore` y no se incluye en `items`.

## Proyección de lectura

`TransactionHistoryItem` es un DTO inmutable de aplicación. No es una tabla ni
una nueva entidad de dominio. El mapper debe copiar los valores persistidos y
convertir únicamente los `numeric` de PostgreSQL a números TypeScript.

No se calculan `total`, PnL, precio promedio ni valores actuales durante la
consulta.

## Invariantes de lectura

- La consulta nunca inserta, actualiza ni elimina filas.
- Una operación completada permanece visible aunque la tenencia actual sea
  cero.
- Cambios posteriores en `player_quotes` o `token_holdings` no modifican los
  campos históricos devueltos.
- Dos operaciones con igual `created_at` tienen orden estable por `id`.
