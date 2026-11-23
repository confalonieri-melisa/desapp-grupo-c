# Data Model: Ofertas P2P a Precio Fijo

## `p2p_offers`

Representa una intención de venta completa publicada por un inversor.

| Campo | Regla | Descripción |
| --- | --- | --- |
| `id` | UUID, PK | Identificador de la oferta |
| `seller_id` | FK a `users`, obligatorio | Vendedor autenticado |
| `player_id` | FK a `players`, obligatorio | Jugador de los tokens |
| `quantity` | Entero positivo | Cantidad completa ofrecida |
| `unit_price` | Decimal positivo, hasta 2 decimales | Precio fijo por token |
| `status` | `OPEN`, `FILLED` o `CANCELLED` | Estado del ciclo de vida |
| `created_at` | Fecha obligatoria | Momento de publicación |
| `completed_at` | Fecha opcional | Momento de aceptación o cancelación |

Restricciones e índices:

- Índice por `status`, `player_id` y fecha descendente para listar ofertas abiertas.
- Índice por `seller_id`, `status` y fecha para gestionar ofertas propias.
- Solo una aceptación puede cambiar una oferta `OPEN` a `FILLED`.
- No se agrega vencimiento automático.

## `market_operations` extendida

Se mantiene como fuente única de operaciones centrales y P2P.

Campos existentes que se conservan:

- `id`, `type`, `investor_id`, `player_id`, `quantity`, `quote_value`, `total`, `unit`, `correlation_id`, `idempotency_key`, `created_at`.

Extensiones P2P:

| Campo | Regla | Descripción |
| --- | --- | --- |
| `buyer_id` | Nullable para operaciones centrales; obligatorio en P2P | Comprador P2P |
| `seller_id` | Nullable para operaciones centrales; obligatorio en P2P | Vendedor P2P |
| `offer_id` | Nullable para operaciones centrales; FK a `p2p_offers` en P2P | Oferta consumida |

Para P2P, `investor_id` conserva el comprador para reutilizar la unicidad de idempotencia existente; `quote_value` conserva el precio unitario efectivamente aplicado y `quote_id` puede ser nulo porque no se requiere una cotización.

La operación P2P debe tener exactamente un comprador, vendedor y oferta. `offer_id` debe ser único entre operaciones P2P para impedir doble consumo. El recibo idempotente se reconstruye desde la operación y el snapshot posterior de su auditoría; no se agregan columnas de estado duplicadas.

## `financial_audit_records` extendida

Se reutiliza la tabla de auditoría. Para P2P, `action` admite `P2P_TRADE` además de las acciones centrales y los snapshots contienen:

```json
{
  "buyer": {
    "creditBalance": 1000,
    "quantity": 0,
    "averagePurchasePrice": 0
  },
  "seller": {
    "creditBalance": 1000,
    "quantity": 5,
    "averagePurchasePrice": 80
  }
}
```

El snapshot es de auditoría y no reemplaza los saldos ni tenencias fuente de verdad.

## Estados

```text
OPEN -> FILLED
OPEN -> CANCELLED
FILLED  --x--> FILLED/CANCELLED
CANCELLED --x--> FILLED/CANCELLED
```

La publicación no cambia la tenencia. La aceptación descuenta tokens del vendedor y los acredita al comprador; los créditos recorren el camino inverso.

## Compatibilidad

- Las filas centrales existentes continúan con `buyer_id`, `seller_id`, `offer_id` y recibos nulos.
- `GET /api/users/{id}/transactions` amplía su filtro para incluir comprador o vendedor.
- Para una fila P2P, la respuesta proyecta `type=BUY` si el usuario es comprador y `type=SELL` si es vendedor.
- El mismo `id` y los mismos importes se conservan en ambas vistas.
