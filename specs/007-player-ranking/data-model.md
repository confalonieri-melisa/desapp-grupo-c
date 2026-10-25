# Data Model: Ranking de Jugadores por Valuación Activa

## Tablas existentes reutilizadas

### `valuation_strategy_versions`

Se lee la fila con `is_active = 1`.

| Campo | Uso |
|---|---|
| `id` | Identificador exacto que se pasa al filtro de quotes |
| `strategy_code` | `strategyCode` de la respuesta |
| `version` | `strategyVersion` de la respuesta |
| `is_active` | Resolución de la única versión activa |

La constraint/index parcial `idx_valuation_active` ya impide más de una fila
activa.

### `player_quotes`

Se filtra por `strategy_version_id` y se deduplica por `player_id`.

| Campo | Uso |
|---|---|
| `player_id` | Join con `players` y clave de deduplicación |
| `strategy_version_id` | Coincidencia exacta con la versión activa capturada |
| `final_score` | Primer criterio de orden descendente y salida `finalScore` |
| `quote_value` | Segundo criterio de orden descendente y salida `quoteValue` |
| `unit` | Unidad de la cotización |
| `calculated_at` | Selección de la última quote y salida `calculatedAt` |
| `id` | Desempate temporal y estabilidad de selección |

### `players`

Se usa para identidad y filtros.

| Campo | Uso |
|---|---|
| `id` | Identidad y desempate final |
| `name` | Salida y desempate ascendente |
| `team` | Filtro parcial case-insensitive y salida |
| `league` | Filtro exacto y salida |
| `position` | Filtro exacto y salida |

## Proyección de lectura

`PlayerRankingRow` no se persiste:

```text
{
  playerId: string,
  name: string,
  team: string,
  league: League,
  position: Position,
  finalScore: number,
  quoteValue: number,
  unit: string,
  calculatedAt: Date
}
```

El controller la transforma en `PlayerRankingEntry`, agregando `rank` y
anidando los datos básicos bajo `player`.

## Consulta lógica

```sql
WITH latest_quotes AS (
  SELECT DISTINCT ON (q.player_id)
    q.player_id,
    q.final_score,
    q.quote_value,
    q.unit,
    q.calculated_at,
    q.id
  FROM player_quotes q
  WHERE q.strategy_version_id = :strategyVersionId
  ORDER BY q.player_id, q.calculated_at DESC, q.id DESC
)
SELECT ...
FROM players p
JOIN latest_quotes q ON q.player_id = p.id
WHERE filters
ORDER BY q.final_score DESC, q.quote_value DESC, p.name ASC, p.id ASC
LIMIT :limit OFFSET :offset;
```

El conteo usa el mismo conjunto `latest_quotes` y filtros, sin `LIMIT/OFFSET`.

## Cambios de esquema

No se agregan tablas, columnas, constraints ni migraciones.
