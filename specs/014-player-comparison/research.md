# Research: Comparador de jugadores

## Decisión: implementación únicamente frontend

**Rationale**: El catálogo ya permite búsqueda por nombre y el historial ya permite consultar todas las cotizaciones de un jugador. La comparación puede resolver selección, derivación y presentación sin nuevos endpoints, tablas ni migraciones.

**Alternativas consideradas**: crear un endpoint batch para tres jugadores; rechazada para esta entrega porque ampliaría el contrato sin ser necesaria.

## Decisión: búsqueda sin paginación propia

**Rationale**: La selección está limitada a tres jugadores. Se reutiliza `getPlayers` con el filtro `name` y el límite actual de 12, pero el comparador no agrega navegación de páginas ni una lista persistente de resultados.

**Alternativas consideradas**: incorporar `PlayerPagination`; rechazada porque duplicaría la navegación del catálogo y no es necesaria para la comparación acotada.

## Decisión: matriz como identidad única

**Rationale**: Los jugadores aparecen una sola vez como encabezados de columna, con su botón `X`. Esto evita repetirlos en chips, tarjetas y tabla, y conserva la jerarquía de la imagen de referencia.

**Alternativas consideradas**: chips de selección más tabla; rechazadas por duplicación visual y mayor densidad.

## Decisión: cotización actual desde historial

**Rationale**: El contrato de cotizaciones define el primer elemento como el registro más reciente. El controlador de catálogo actual devuelve `currentQuote` como `1`, por lo que no es una fuente adecuada para la cotización de mercado.

**Alternativas consideradas**: usar `currentQuote`; rechazada por su semántica actual de valor base.

## Decisión: variación derivada en frontend

**Rationale**: La imagen requiere una fila de variación y el historial contiene los dos valores necesarios. Se calcula solo para presentación con los dos registros más recientes; no se persiste ni se modifica el dominio.

**Alternativas consideradas**: agregar un campo backend; rechazada porque introduce contrato y persistencia innecesarios.

## Decisión: gráfico basado en puntos reales

**Rationale**: Se reutiliza el orden cronológico y el recorte de 15 puntos ya usado por `QuoteTrend`. Cada serie solo se dibuja con al menos dos registros, sin interpolación ni normalización.

**Alternativas consideradas**: completar fechas o suavizar líneas; rechazadas porque crearían información no disponible.

## Decisión: estados independientes por jugador

**Rationale**: Tres historiales pueden responder de forma distinta. Un estado por jugador permite mantener la matriz y las series válidas cuando una consulta falla.

**Alternativas consideradas**: bloquear toda la pantalla hasta que todas las consultas terminen; rechazada porque convierte un fallo parcial en pérdida total de información.

## Decisión: responsive y accesibilidad

**Rationale**: La matriz conserva las cinco filas en cualquier viewport. En mobile se apila el gráfico y se permite scroll horizontal de la matriz, con columna de métricas identificable. La tabla y el resumen textual del gráfico mantienen una alternativa no visual.

**Alternativas consideradas**: convertir cada jugador en una tarjeta vertical; rechazada porque rompe la comparación lado a lado y contradice la identidad única de la feature.

