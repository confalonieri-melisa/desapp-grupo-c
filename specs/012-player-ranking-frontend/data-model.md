# Data Model: Ranking de jugadores en el frontend

No se crean tablas ni entidades persistidas. La UI mantiene proyecciones de la respuesta de la feature 007.

## RankingEntry

| Campo | Tipo | Regla |
|---|---|---|
| `rank` | entero positivo | Puesto global recibido, también en páginas posteriores; nunca se recalcula. |
| `player.id` | UUID | Identidad y destino del perfil `/players/:id`. |
| `player.name` | texto | Nombre visible. |
| `player.team` | texto | Equipo visible. |
| `player.league` | enum de liga | Etiqueta legible sin alterar el valor para filtrar. |
| `player.position` | enum de posición | Etiqueta legible sin alterar el valor para filtrar. |
| `finalScore` | número 0–1 | Puntaje final de la versión activa, sin conversión de escala. |
| `quoteValue` | número | Cotización recibida, sin recálculo. |
| `unit` | texto | Unidad de `quoteValue`; `CREDIT_PER_TOKEN` se presenta como créditos por token. |
| `calculatedAt` | instante ISO | Se formatea para lectura sin cambiar el instante. |

La lista de `RankingEntry` conserva orden y cardinalidad de `players` de una única respuesta. No se mezcla con entradas de otra consulta ni sesión.

## RankingContext

| Campo | Tipo | Regla |
|---|---|---|
| `strategyCode` | texto | Código de estrategia asociado a la lista visible. |
| `strategyVersion` | texto | Versión asociada a la lista visible. |

Contexto y lista se reemplazan juntos en cada respuesta exitosa.

## RankingSelection

| Campo | Tipo | Regla |
|---|---|---|
| `league` | enum de liga o vacío | Solo los cinco valores oficiales llegan al servidor. |
| `team` | texto o vacío | Se recortan espacios externos; se admite coincidencia parcial. |
| `position` | enum de posición o vacío | Solo valores definidos llegan al servidor. |
| `page` | entero >=1 | Cambiar filtros reinicia a 1; cambiar página conserva filtros. |
| `limit` | entero 20 | Tamaño fijo de la UI, dentro del máximo 100. |

La URL refleja la selección aplicada. El texto aún no confirmado del campo equipo es estado transitorio de formulario y no altera la selección ni dispara consulta.

## RankingPagination

| Campo | Tipo | Regla |
|---|---|---|
| `total` | entero >=0 | Total filtrado informado por el backend. |
| `page` | entero >=1 | Página respondida. |
| `limit` | entero 1–100 | Tamaño respondido. |
| `totalPages` | entero >=0 | Cero cuando `total=0`. |

## RankingViewState

| Estado | Datos visibles | Transición principal |
|---|---|---|
| `loading` | Aviso de carga; sin resultados atribuidos a la nueva selección | `200` → `content` o `empty`; error → `error` o `no-active-strategy`. |
| `content` | Lista, contexto y paginación de la misma respuesta | Cambio de selección → `loading`; reintento/recarga → `loading`. |
| `empty` | Mensaje y acceso a modificar o limpiar filtros | Cambio de selección → `loading`. |
| `error` | Mensaje recuperable y reintento | Reintento → `loading`. |
| `no-active-strategy` | Aviso específico de indisponibilidad | Nueva consulta del usuario → `loading`. |
| `unauthenticated` | Sin datos protegidos | Autenticación existente → nueva carga. |

La identidad del estado incluye sesión y selección. Una respuesta cuya identidad dejó de ser vigente no produce transición visible.
