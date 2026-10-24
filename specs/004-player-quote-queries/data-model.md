# Data Model: Consulta de Cotizaciones

## No hay cambios de esquema

La feature reutiliza las tablas creadas por `003-player-valuation-strategies`.
No se crea migración nueva ni se modifican migraciones aplicadas.

## Lectura principal

### `player_quotes`

Columnas utilizadas:

- `player_id`: filtro obligatorio.
- `calculated_at`: orden y límite temporal.
- `id`: desempate estable.
- `strategy_version_id`: relación con la estrategia usada.
- `individual_score`, `team_score`, `final_score`: scores persistidos.
- `quote_value`, `unit`: valor y unidad persistidos.
- `explanation`: componentes y trazabilidad persistidos.

### `valuation_strategy_versions`

Columnas utilizadas:

- `id`: condición de join.
- `strategy_code`: estrategia usada en el cálculo.
- `version`: versión usada en el cálculo.

No se consulta la fila activa para construir la respuesta, porque una
cotización histórica debe conservar la estrategia/version exactas con las que
fue calculada.

### `players`

Se consulta solo para distinguir un jugador inexistente de un jugador existente
sin cotizaciones.

## Consultas previstas

### Historial

```text
WHERE player_quotes.player_id = :playerId
ORDER BY calculated_at DESC, id DESC
```

### Cotización a fecha

```text
WHERE player_quotes.player_id = :playerId
  AND calculated_at < :nextDayStartUtc
ORDER BY calculated_at DESC, id DESC
LIMIT 1
```

El índice existente `(player_id, calculated_at)` es suficiente para el alcance
MVP. Si el volumen real exige optimización, un índice compuesto con `id` podrá
ser una feature posterior, no una dependencia de esta entrega.

## Invariantes de lectura

- Ninguna consulta inserta, actualiza o elimina filas.
- Ninguna consulta llama al motor de valuación o a adapters externos.
- `teamScore` se serializa como `null` cuando la cotización individual no tiene
  componente colectivo.
- La explicación se devuelve como snapshot persistido; no se reconstruyen
  pesos ni contribuciones.
