# Research: Ranking de Jugadores por Valuación Activa

## Decisiones resueltas

### 1. Fuente de verdad del ranking

La fuente de verdad será `player_quotes`, limitada al
`strategy_version_id` de la versión activa. No se calculará el ranking desde
las estadísticas actuales de `players` porque eso volvería a ejecutar reglas de
valuación y podría producir resultados distintos de las cotizaciones
persistidas.

### 2. Selección de la cotización vigente para el ranking

Para cada jugador se seleccionará una única fila usando
`calculated_at DESC, id DESC`. El `id` resuelve empates de timestamp y mantiene
un resultado determinista.

### 3. Ubicación de la consulta

Se crea `PlayerRankingRepository` porque la consulta combina tres tablas,
necesita deduplicar cotizaciones y debe ordenar por campos de dos agregados
antes de paginar. `PlayerRepository.findMany` no puede resolver esa consulta
sin cargar jugadores y quotes por separado; `ValuationRepository` se mantiene
enfocado en versiones y snapshots de cotización.

### 4. Consistencia de la versión activa

El servicio invocará una vez `ValuationRepository.findActiveStrategyVersion()`
y pasará el `id` obtenido al repositorio de ranking. No se agrega una
transacción con aislamiento especial en el MVP. La respuesta informa el código
y versión capturados.

### 5. Autorización y validación

Se reutiliza `requireAuth`, como en las rutas existentes de jugadores y
cotizaciones. El schema del ranking será estricto para que parámetros
desconocidos respondan `400` en lugar de ser ignorados.

Los filtros `league`, `team` y `position` se definirán una sola vez como
`playerFiltersSchema` y serán extendidos por el catálogo y el ranking. El
catálogo conservará su comportamiento actual, mientras que el ranking aplicará
`.strict()` y sus propios defaults de paginación.

### 6. Migraciones e índices

No se agregan tablas ni migraciones. El índice existente sobre
`(player_id, calculated_at)` y el límite de 100 son suficientes para el MVP.
Un índice adicional por estrategia solo se considerará con evidencia de
latencia en datos reales.

### 7. Contrato mínimo

Se devolverán identidad del jugador, `finalScore`, `quoteValue`, unidad,
timestamp, estrategia/version y paginación. Se excluyen `individualScore`,
`teamScore` y `explanation` para evitar acoplar el ranking al detalle interno de
la estrategia.

## Alternativas descartadas

- **Ordenar en memoria**: aumenta memoria, complica el conteo y puede producir
  páginas incorrectas.
- **Recalcular scores al consultar**: contradice la naturaleza histórica de
  las quotes y agrega latencia/dependencia de datos externos.
- **Reutilizar `PlayerRepository.findMany` y consultar quotes por jugador**:
  produce N+1 consultas y no permite ordenar globalmente por quote de forma
  simple.
- **Agregar una tabla materializada de ranking**: sobreingeniería para una
  lectura derivable de datos existentes.
- **Agregar cache**: queda fuera de esta feature; el ranking es read-only y el
  MVP no define invalidación al recalcular quotes o cambiar estrategia.

## Supuestos de implementación

- PostgreSQL es la base oficial, por lo que una subconsulta/CTE con
  deduplicación por jugador es válida.
- La constraint parcial existente garantiza como máximo una estrategia activa.
- `player_quotes` conserva la relación a la versión exacta mediante
  `strategy_version_id`.
