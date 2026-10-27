# Contrato de interfaz: Ranking de jugadores

## Navegación

- `GlobalNav` ofrece «Ranking» a usuarios autenticados.
- El destino es `/ranking` y se marca como página actual solo en esa ruta.
- El usuario sin sesión se envía a `/login` después de la hidratación, sin mostrar resultados previos.
- Cada nombre enlaza a `/players/:id` del jugador recibido.

## Selección en URL

`/ranking?league=PREMIER_LEAGUE&team=Arsenal&position=FORWARD&page=2`

- `league` y `position` son opcionales y usan los enums de la feature 007.
- `team` es opcional, admite texto parcial y se aplica al confirmar el formulario.
- `page` es opcional y vale 1 por defecto.
- Cambiar filtros elimina `page` de la URL para volver a 1; paginar conserva los filtros.
- Valores inválidos o parámetros ajenos no se envían al backend.
- `limit=20` se envía en la consulta pero no se expone como control de UI.

## Consulta existente

`GET /api/players/ranking` con `Authorization: Bearer <JWT>`. El contrato original está en [ranking.yaml](../../007-player-ranking/contracts/ranking.yaml); este documento no lo reemplaza ni modifica.

| Respuesta | Resultado visible |
|---|---|
| `200` con `players` | Mantener orden y `rank`; mostrar identidad, score, cotización, unidad, fecha, estrategia/versión y paginación. |
| `200` con `players: []`, `totalPages: 0` | Comunicar ausencia de jugadores; permitir cambiar o limpiar filtros. |
| `200` con página vacía y `totalPages > 0` | Volver una vez a la última página válida y consultarla. |
| `401` | Retirar resultados, cerrar sesión y dirigir a `/login`. |
| `409` | Informar que no hay estrategia de valuación activa. |
| `400`, `500` o fallo de red | Mensaje recuperable y reintento de la selección vigente. |

## Datos presentados

Cada entrada muestra `rank`, `player.name`, `player.team`, `player.league`, `player.position`, `finalScore`, `quoteValue`, `unit` y `calculatedAt`, este último como fecha y hora en UTC explícito. La cabecera muestra `strategyCode` y `strategyVersion` de esa misma respuesta. La paginación muestra `total`, `page` y `totalPages`.

## Garantías de interacción

- Una selección nueva entra en carga sin mostrar resultados anteriores como actuales.
- Una respuesta de otra selección o sesión no modifica la vista.
- El puesto se anuncia mediante texto y no depende del color.
- Filtros, enlace de perfil, paginación y reintento funcionan con teclado, nombres accesibles y foco visible.
