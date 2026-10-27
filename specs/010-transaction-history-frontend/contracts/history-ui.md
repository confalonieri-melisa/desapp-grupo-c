# UI Contract: Mi historial

**Scope**: Navegación y lectura frontend. El contrato HTTP existente se documenta en [feature 006](../../006-operation-history/contracts/transactions.yaml); este documento no cambia esa API.

## Ruta y navegación

- Ruta de vista: `GET /transactions` en la aplicación Next.js.
- `GlobalNav` muestra «Mi historial» a usuarios autenticados junto a «Jugadores». La ruta no contiene ID de usuario ni parámetros que seleccionen un inversor.
- «Mi historial» y «Jugadores» indican la ruta activa con `aria-current="page"`; son activables por teclado.
- Una vez hidratado el contexto, si no hay sesión la vista redirige a `/login` sin mostrar datos protegidos.

## Consulta de historial

```text
GET /api/users/{AuthContext.user.id}/transactions?limit=20&offset={nextOffset}
Authorization: Bearer {AuthContext.token}
```

La primera consulta usa `nextOffset=0`. El ID procede solo de la sesión. La UI consume exactamente `items`, `limit`, `offset`, `hasMore` y los campos de `TransactionHistoryItem` de la feature 006. No recalcula `quoteValue` ni `total`.

## Campos visibles por operación

| Campo de API | Presentación |
|---|---|
| `type` | `BUY` → «Compra»; `SELL` → «Venta», siempre como texto. |
| `playerId` | Nombre enlazado a `/players/:id` tras resolución; ID sin enlace en otro caso. |
| `createdAt` | Fecha y hora en `America/Argentina/Buenos_Aires`; leyenda «Hora de Buenos Aires (ART)». |
| `quantity` | Número de tokens. |
| `quoteValue`, `unit` | Valor histórico y «créditos por token» para `CREDIT_PER_TOKEN`; cualquier unidad futura se presenta literalmente hasta que exista traducción aprobada. |
| `total` | Importe histórico en créditos. |

Los números siguen formato `es-AR`. El orden de filas es el de la API. `id`, `quoteId` y `correlationId` permanecen disponibles en la proyección, sin obligación de mostrarse.

## Resumen y filtros de la vista

El resumen muestra cantidad de operaciones cargadas, compras y ventas. La búsqueda por nombre o ID de jugador y los filtros por tipo y mes de Buenos Aires actúan sobre las páginas ya cargadas, sin cambiar el `offset` ni el orden de la API. La vista informa este alcance y mantiene «Ver más operaciones» aunque no haya coincidencias. Las filas con jugador resuelto usan el mapper de imágenes existente y pueden mostrar equipo y liga del perfil; una referencia no resuelta mantiene el ID sin enlace.

## Resolución de jugadores

```text
GET /api/players/{playerId}
Authorization: Bearer {AuthContext.token}
```

Una respuesta `200` aporta `name` y habilita el enlace. `404` o fallo no autorizativo conserva el ID sin enlace ni oculta la operación. `401` invalida sesión. Cada ID distinto se consulta como máximo una vez por visita activa.

## Estados observables

| Condición | Resultado |
|---|---|
| Primera petición pendiente | «Cargando operaciones…», anunciado; sin mensaje vacío. |
| Primera respuesta `200` con `items=[]` | Mensaje claro de historial vacío. |
| Primera respuesta `200` con operaciones | Lista de operaciones con todas las etiquetas de campo. |
| `hasMore=true` | Botón «Ver más operaciones». |
| Página adicional pendiente | Lista previa estable; botón deshabilitado y progreso anunciado. |
| Última página (`hasMore=false`) | Botón ausente; indicación de fin del historial. |
| Error inicial no autorizativo | Error y botón «Reintentar» para `offset=0`. |
| Error de página adicional no autorizativo | Lista previa estable y «Reintentar» el mismo offset. |
| `401` en historial o jugador | Datos retirados, cierre de sesión y navegación a `/login`. |
| `403` | Datos retirados y error de acceso; nunca se presenta como vacío. |
| Cambio de sesión A→B | Ningún dato o resultado tardío de A aparece en B. |

Los mensajes de error usan `role="alert"`; cargas usan `role="status"` o `aria-live`. Acciones con foco visible y orden de lectura lógico. La lista mantiene etiquetas en pantallas pequeñas.
