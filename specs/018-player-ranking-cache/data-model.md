# Data Model: caché del ranking de jugadores

## Datos persistidos reutilizados

No se crean tablas, columnas, índices ni migraciones.

| Entidad existente | Campos relevantes | Uso |
| --- | --- | --- |
| `valuation_strategy_versions` | `id`, `strategy_code`, `version`, `is_active` | Identificar la versión activa en cada consulta y conservar `strategyCode` y `strategyVersion` de la respuesta. |
| `player_quotes` | `player_id`, `strategy_version_id`, `final_score`, `quote_value`, `calculated_at`, `id` | Obtener la última cotización de cada jugador según el ranking existente. |
| `players` | `id`, `name`, `team`, `league`, `position` | Aplicar los filtros y presentar la identidad del jugador. |
| `batch_turns` | `process`, `status`, `succeeded_count` | Calcular la revisión de publicaciones confirmadas en los flujos productivos de recálculo. |

## Modelo transitorio del proceso web

### `RankingCacheKey`

Tupla ordenada de valores validados: `strategyVersionId`, `league | null`, `team | null`, `position | null`, `page`, `limit`. La representación debe distinguir ausencias y evitar colisiones de separadores. `team` conserva el recorte de espacios de la validación existente; no cambia la coincidencia del filtro del ranking.

**Unicidad**: Dos consultas con todos estos valores iguales comparten la misma entrada. Cambiar cualquiera de ellos produce una entrada independiente. Las formas equivalentes de `page` y `limit` implícitos o explícitos usan los valores por defecto ya validados.

### `RankingCacheEntry`

| Campo | Tipo lógico | Regla |
| --- | --- | --- |
| `key` | `RankingCacheKey` | Único entre entradas presentes. |
| `response` | `PlayerRankingResponse` | Solo respuesta `200` completa, con `players` y `pagination` coherentes; puede contener `players: []`. Conserva los mismos valores y tipos que el servicio existente, incluida la fecha de cálculo. |
| `publicationRevision` | Entero no negativo | Cantidad observada de turnos de recálculo publicados con al menos una cotización. |
| `createdAt` | Instante monotónico local | Se fija al terminar de construir la respuesta completa. Un acierto no lo modifica. |
| `insertionOrder` | Secuencia local | Resuelve empates de instante para descartar primero la entrada agregada antes. |

**Vigencia**: Una entrada es reutilizable solo cuando `now - createdAt < 60_000 ms`, `publicationRevision` coincide con la revisión actual y la clave incluye la versión activa actual. A los `60_000 ms` deja de ser vigente. La caché admite hasta 100 entradas presentes; antes de insertar la número 101 se eliminan vencidas y, si hace falta, la de menor `createdAt` y luego menor `insertionOrder`.

### `PublicationRevision`

Valor calculado sobre `batch_turns`: cantidad de turnos con `process = QUOTE_RECALCULATION`, `status IN (COMPLETED, PARTIAL)` y `succeeded_count > 0`. Es global para todas las combinaciones de filtros y versiones. La actualización de turno y la inserción de cotizaciones de cada lote se confirman en una sola transacción. Un turno fallido sin cotizaciones no incrementa el valor.

## Transiciones

| Estado | Evento | Resultado |
| --- | --- | --- |
| Ausente | Consulta válida | Leer ranking persistido y evaluar si puede almacenarse. |
| Vigente | Acierto con misma revisión y versión activa | Devolver `response` sin renovar tiempo ni orden. |
| Vigente | Vencimiento, cambio de revisión o cambio de versión activa | Tratar como falta; no servir la respuesta anterior. |
| Vigente | Capacidad excedida por nueva entrada | Descartar la entrada más antigua. |
| Candidato en lectura | Cambia revisión o versión antes de guardar | Descartar candidato y reintentar; no contaminar la caché. |
| Candidato en lectura | Falla la lectura o la respuesta queda incompleta | Propagar el error existente; no insertar. |
| Cualquier estado | Reinicio web | Se pierden las entradas locales; la siguiente consulta usa datos persistidos. |

## Invariantes

- Una entrada nunca representa más de una combinación de criterios y versión activa.
- Filas y total de una respuesta guardada provienen del mismo snapshot persistido.
- No se guarda ninguna respuesta antes de completarla y comprobar su revisión.
- La caché no es la fuente de verdad: `players`, `player_quotes`, `valuation_strategy_versions` y `batch_turns` siguen siendo persistidos.
- El acceso a la caché ocurre después de la autenticación y la validación existentes.
