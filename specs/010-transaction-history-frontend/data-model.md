# Data Model: Historial de operaciones del inversor

Este incremento no crea tablas, migraciones ni entidades de dominio nuevas. Las siguientes son proyecciones cliente de datos ya persistidos por la feature 006.

## Sesión autenticada

| Campo | Fuente | Regla |
|---|---|---|
| `user.id` | `AuthContext` | Único ID permitido en la ruta de historial. |
| `token` | `AuthContext` | Bearer de cada consulta; nunca forma parte de la URL. |
| `isHydrated`, `isAuthenticated` | `AuthContext` | Se espera hidratación; sin sesión se limpia la vista y se dirige a login. |

La clave lógica del estado de esta visita es la pareja `(user.id, token)` más una generación de solicitud. Al cambiar, se descartan datos y respuestas anteriores.

## Operación histórica (`TransactionHistoryItem`)

| Campo | Tipo | Uso / validación |
|---|---|---|
| `id` | UUID | Identidad estable para render y deduplicación. |
| `type` | `BUY \| SELL` | Etiqueta visible «Compra» o «Venta». |
| `playerId` | UUID | Referencia al jugador; puede no resolverse. |
| `quantity` | entero positivo | Cantidad de tokens tal como llega. |
| `quoteId` | UUID | Referencia histórica, sin consulta de cotización actual. |
| `quoteValue` | número | Precio histórico, solo se formatea. |
| `total` | número | Importe histórico, solo se formatea. |
| `unit` | cadena (`CREDIT_PER_TOKEN` actual) | Se muestra la unidad de cotización; no se asume otra moneda. |
| `createdAt` | fecha ISO | Se muestra el mismo instante en Buenos Aires. |
| `correlationId` | cadena o `null` | Dato del contrato 006; no se exige mostrarlo. |

Una operación pertenece a una sola respuesta de historial del inversor autenticado. Dos operaciones pueden compartir hora visible; la UI conserva el orden del backend.

## Página de historial (`TransactionHistoryResponse`)

| Campo | Tipo | Regla |
|---|---|---|
| `items` | `TransactionHistoryItem[]` | Orden descendente entregado por backend. |
| `limit` | entero | Tamaño aceptado por API; solicitud de la vista: 20. |
| `offset` | entero no negativo | Punto inicial real de esa respuesta. |
| `hasMore` | booleano | Controla «Ver más operaciones». |

La vista conserva `nextOffset = offset + items.length`. La deduplicación por `id` afecta la lista visible, no `nextOffset`.

## Jugador referenciado (`PlayerReference`)

| Estado | Presentación |
|---|---|
| pendiente | `playerId` legible, sin enlace |
| resuelto (`id`, `name`) | nombre y enlace `/players/:id` |
| no disponible (`404` u otro fallo no autorizativo) | `playerId`, sin enlace |
| `401` | se retiran datos protegidos y se inicia flujo de login |

Las referencias se guardan solo durante la visita y pertenecen a la generación de sesión activa.

## Estado de la vista

`initial-loading → content | empty | initial-error`; desde `content`, `loading-more → content | page-error`. `page-error → loading-more` reintenta el mismo offset. Un cambio de sesión invalida cualquier estado y lo lleva a `initial-loading` para el nuevo usuario o a redirección si no hay sesión. `empty` solo procede de la primera respuesta `200` con `items=[]`; un error nunca significa vacío.
