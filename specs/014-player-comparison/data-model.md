# Data Model: Comparador de jugadores

No hay persistencia nueva. Los siguientes objetos son lecturas o proyecciones locales de presentación.

## ComparisonSelection

| Campo | Tipo | Regla |
|---|---|---|
| `playerIds` | lista de identificadores | Orden de selección; longitud entre 0 y 3; sin duplicados. |
| `players` | lista de referencias | Una referencia por `playerId`, en el mismo orden. |
| `maxPlayers` | literal 3 | No configurable en esta entrega. |

## SearchState

| Campo | Tipo | Regla |
|---|---|---|
| `query` | string | Texto recortado enviado al catálogo. |
| `results` | lista de jugadores | Hasta 12 resultados del conjunto inicial; no contiene paginación de UI. |
| `phase` | `idle \| loading \| content \| empty \| error` | El error no se interpreta como vacío. |
| `selected` | boolean por resultado | Derivado de `ComparisonSelection`; impide duplicados. |

## ComparisonPlayer

| Campo | Tipo | Regla |
|---|---|---|
| `id` | string | Identificador del jugador. |
| `name` | string | Nombre recibido del catálogo. |
| `team` | string | Equipo recibido del catálogo. |
| `league` | enum existente | Liga recibida del catálogo. |
| `image` | recurso o placeholder | Reutiliza el mapeo estable existente. |
| `history` | `QuoteChannel` | Estado independiente de cotizaciones. |

## QuoteChannel

| Campo | Tipo | Regla |
|---|---|---|
| `phase` | `idle \| loading \| success \| empty \| error` | `401` se propaga al estado de sesión. |
| `items` | lista de `PlayerQuoteDto` | Orden recibido: más reciente primero. |
| `current` | cotización o null | `items[0]` cuando existe. |
| `error` | string o null | Solo para fallos recuperables. |
| `generation` | número | Impide aplicar respuestas tardías. |

## ComparisonRows

Las filas son fijas y no se amplían con estadísticas del jugador:

1. `currentQuote`: `history.items[0].quoteValue` y `unit`.
2. `variation`: derivada de `items[0]` e `items[1]` cuando existen.
3. `individualScore`: score persistido del registro actual.
4. `teamScore`: score persistido del registro actual o “No disponible”.
5. `finalScore`: score persistido del registro actual.

La variación se calcula como:

`((items[0].quoteValue - items[1].quoteValue) / items[1].quoteValue) * 100`

El denominador es positivo por las reglas existentes de cotización. Si faltan registros, el resultado es `null`, no cero.

## QuoteSeries

Serie derivada por jugador, ordenada por `calculatedAt` ascendente y limitada a los 15 puntos más recientes. Cada punto conserva `calculatedAt`, `quoteValue` y `unit`. La serie se dibuja solo con dos o más puntos. No se interpolan puntos ni se mezclan estrategias/versiones sin mostrar su contexto.

## ComparisonViewState

Fases observables:

`initial-empty` → `one-selected` → `comparison-loading` → `content` / `partial-content` / `empty-history` / `error`.

Cambiar búsqueda no elimina la selección. Agregar o quitar jugadores incrementa la generación de selección e invalida cargas de jugadores retirados. Cambiar de sesión o recibir 401 descarta selección, resultados y cotizaciones protegidas.

