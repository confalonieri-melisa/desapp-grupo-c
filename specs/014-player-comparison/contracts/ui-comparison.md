# Contrato de interfaz: Comparador de jugadores

## Navegación

- `GlobalNav` ofrece «Comparador» a usuarios autenticados.
- El destino es `/comparison` y se marca como página actual solo en esa ruta.
- Un usuario sin sesión sigue el flujo existente hacia `/login` y no ve datos protegidos previos.

## Búsqueda y selección

- La vista ofrece un formulario con `role="search"`, búsqueda por nombre parcial, Enter, botón de búsqueda y limpieza.
- La consulta reutiliza `GET /api/players` mediante `getPlayers`, con `name` y límite 12.
- No hay paginación propia en el comparador.
- La selección local acepta 0, 1, 2 o 3 jugadores, sin duplicados.
- La identidad seleccionada se representa únicamente en el encabezado de la matriz. El botón `X` de cada encabezado quita al jugador inmediatamente.

## Estados visibles

| Estado | Resultado visible |
|---|---|
| 0 seleccionados | Buscador, contador `0 de 3` e instrucción para agregar dos jugadores. |
| 1 seleccionado | Una columna de identidad y mensaje de que falta un jugador; no se muestran filas comparativas completas ni gráfico. |
| 2 o 3 seleccionados | Matriz completa y gráfico histórico compacto. |
| Búsqueda cargando | Estado de carga; no se presenta vacío definitivo. |
| Búsqueda sin resultados | Mensaje para modificar o limpiar el término. |
| Cotizaciones cargando | Estado por jugador; la matriz espera o muestra datos disponibles según la consulta. |
| Sin historial | “No hay cotizaciones históricas” para ese jugador. |
| Menos de 2 puntos | No se dibuja tendencia para ese jugador. |
| Error recuperable | Mensaje y reintento para el jugador o consulta vigente. |
| 401 | Retirar datos y ejecutar logout/router existente. |

## Matriz

La matriz tiene una columna «Métrica» y una columna por jugador seleccionado. Cada jugador aparece una sola vez, en el orden de selección. El encabezado incluye imagen/placeholder, nombre, equipo, liga y botón `X`.

Filas exactas:

1. Cotización actual.
2. Variación desde la última cotización.
3. Score individual.
4. Score colectivo.
5. Score final.

La cotización actual es `items[0]` del historial. La variación usa los dos primeros elementos: `((items[0] - items[1]) / items[1]) * 100`. Un score colectivo ausente se muestra como “No disponible”. No se muestran estadísticas, posición, ranking, explicación de score ni acciones de trading.

## Gráfico

- Panel titulado «Evolución de cotizaciones».
- Una serie por jugador con nombre en la leyenda textual.
- Solo puntos reales del historial, ordenados cronológicamente.
- Máximo de 15 puntos recientes por serie.
- Eje común en créditos por token; sin interpolación ni normalización.
- Con menos de dos puntos, el jugador recibe un estado de datos insuficientes.
- Debe existir una descripción accesible equivalente con nombres, fechas y valores inicial/final cuando la serie sea válida.

## Responsive y accesibilidad

- Desktop: matriz y gráfico pueden mostrarse lado a lado.
- Mobile: matriz y gráfico se apilan; la matriz de tres columnas permite scroll horizontal y conserva identificable la columna «Métrica».
- La matriz usa estructura semántica de tabla.
- Todos los botones tienen nombre accesible, incluidos los `X`.
- Carga, selección, vacío y error se anuncian sin depender del color.
- El foco permanece predecible tras quitar un jugador y es visible.

## Consultas reutilizadas

- Catálogo: [player.service.ts](../../../src/frontend/services/client/player.service.ts).
- Cotizaciones: [player-quotes.service.ts](../../../src/frontend/services/client/player-quotes.service.ts).
- Estados y cancelación de historial: patrón de [usePlayerQuotes.ts](../../../src/frontend/features/profile/hooks/usePlayerQuotes.ts).
- Gráfico: patrón de [QuoteTrend.tsx](../../../src/frontend/features/profile/components/QuoteTrend/QuoteTrend.tsx).

