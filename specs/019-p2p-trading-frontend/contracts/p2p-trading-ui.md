# Contrato de la experiencia P2P del perfil

**Fuente funcional**: [spec.md](../spec.md)  
**Contrato de backend existente**: `specs/017-p2p-fixed-offers/contracts/p2p.yaml`

## Lectura y presentación

El perfil confirmado solicita `GET /api/p2p/offers?playerId=<id>` con Bearer JWT. `200` entrega un arreglo de ofertas `OPEN` con `id`, `sellerId`, `playerId`, `quantity`, `unitPrice`, `status` y `createdAt`. No hay paginación ni nombres públicos. «Comprar» muestra todas las ofertas abiertas del jugador en un solo listado: si `sellerId === user.id`, la fila se identifica como propia y ofrece «Cancelar»; si es ajena, ofrece «Comprar». No hay panel ni estado vacío separado para ofertas propias, y el listado no se anuncia como historial.

Las dos vistas son «Comprar» y «Vender (P2P)». «Comprar» presenta el listado P2P a precio fijo y, solo con disponibilidad del pool confirmada mayor que cero, la compra al pool a cotización vigente. «Vender (P2P)» presenta publicación; la venta al pool no se ofrece en la interfaz. La ausencia de cotización afecta solo a la compra al pool. Toda oferta P2P muestra su cantidad completa, precio por token y total calculado a dos decimales. La identificación visual abreviada del vendedor debe permitir consultar el identificador completo; no se sustituye por un alias inventado.

## Lectura de disponibilidad del pool

El nuevo `GET /api/players/{id}/pool-availability` requiere Bearer JWT, valida que `{id}` sea un UUID de jugador existente y no acepta `poolId`, `userId` ni cuerpo de request. La ruta llama a un controlador y servicio de solo lectura; un repositorio dedicado consulta la tenencia del `SUPERUSER` canónico usado por la compra central. La respuesta `200` es `{ "playerId": "<uuid>", "availableQuantity": <entero no negativo> }`. Una tenencia inexistente equivale a cero; un jugador inexistente o un error para resolver el pool/consultar la base produce un error, no un `200` con cero. Un identificador inválido o parámetro de identidad ajeno al path recibe `400`, sesión ausente/vencida `401` y jugador o pool inexistente `404`; fallos inesperados se informan como error de servidor. No se devuelven identidad, saldo ni otras posiciones del pool. Se documentarán este GET y sus errores en `specs/001-player-token-marketplace/contracts/openapi.yaml` y `specs/001-player-token-marketplace/contracts/postman_collection.json` al implementar.

La UI muestra el formulario de compra al pool solo cuando `availableQuantity > 0` para el jugador actual y limita la cantidad ingresada a ese valor. Con `availableQuantity === 0` confirmado oculta la compra central y mantiene P2P visible. Durante carga, refresco o error, indica que la disponibilidad no está confirmada, ofrece reintentar y no permite iniciar otra compra; estos estados no se etiquetan como cero. Tras una compra central confirmada, vuelve a consultar la disponibilidad y oculta el formulario si el nuevo valor es cero, conservando el comprobante. El GET puede quedar obsoleto entre lectura y compra: `POST /api/orders/buy` mantiene su validación definitiva de tokens, saldo y cotización, y su rechazo se muestra sin éxito falso.

## Mutaciones

| Acción | Request | Respuesta confirmada | Efecto visible |
| --- | --- | --- | --- |
| Publicar | `POST /api/p2p/offers`; Bearer, JSON `{playerId, quantity, unitPrice}` | `201` con oferta abierta | Indicar cómo abrir «Comprar», mostrar allí la oferta propia y actualizar el listado. No atribuir transferencia de saldo o tokens. |
| Aceptar | `POST /api/p2p/offers/{id}/accept`; Bearer y `Idempotency-Key`, sin cantidad ni precio editables | `201` con `operation`, `account`, `holding`; un replay compatible devuelve el mismo comprobante | Mostrar cantidad, precio y total ejecutados del comprobante; actualizar portfolio y ofertas. |
| Cancelar propia | `DELETE /api/p2p/offers/{id}`; Bearer | `204` sin cuerpo | Actualizar lista; la oferta deja de figurar entre abiertas. |

La interfaz valida publicación con cantidad entera positiva no mayor que la tenencia visible ni que 2.147.483.647, precio positivo de hasta dos decimales y máximo de 99.999.999,99 créditos por token, y total máximo de 9.999.999.999,99 créditos. Los límites monetarios evitan exceder los campos de precio y total de la operación posterior; no garantizan que esta pueda concretarse. Para aceptar, exige oferta ajena, lista y saldo vigentes y total no superior al saldo visible. Todos estos controles son orientativos: el backend vuelve a validar estado, fondos y tenencia. Confirmar una acción envía una sola solicitud; cancelar el diálogo no envía ninguna.

## Resultado, errores y recuperación

La implementación actual de `toHttpResponse` serializa errores como `{ error: string }`; el YAML de la feature 017 declara `{ message: string }`. El cliente de esta entrega consume la forma real `{ error }` y conserva el `status`. Esta discrepancia del contrato previo se registra sin cambiar el backend.

| Respuesta o situación | Presentación y recuperación |
| --- | --- |
| `401` | Aplicar cierre de sesión y retirar datos protegidos con el flujo existente. |
| `400 Invalid request data` | Mostrar rechazo de validación; conservar borrador de publicación para corregirlo. |
| `403` por rol | Informar que la sesión no puede operar y retirar acciones operativas. |
| `404` de jugador, oferta o configuración del pool | Indicar que el recurso o la disponibilidad no está accesible; refrescar perfil/ofertas/disponibilidad según corresponda, sin inferir cero. |
| `409 Insufficient credit balance` | Saldo insuficiente; ofrecer refrescar portfolio. |
| `409 Insufficient token holding` | Tenencia insuficiente; ofrecer refrescar portfolio y editar publicación si aplica. |
| `409 Offer is no longer open` | Oferta cerrada; ofrecer refrescar lista. |
| `409 Cannot accept your own offer` | Indicar rechazo de oferta propia; refrescar lista/identidad. |
| `409 Idempotency key already used for another offer` | Rechazo de clave incompatible; no afirmar transferencia, conservar contexto y ofrecer consulta. |
| Otros `4xx` | Rechazo genérico sin atribuir una causa no comprobada; ofrecer refrescar. |
| Red, `5xx` o respuesta de mutación sin forma de éxito verificable | Resultado incierto; no reenvío automático, consulta de datos antes de otro intento. |

Una aceptación incierta conserva la clave y los datos de esa misma intención para un eventual reintento manual compatible. Una publicación o cancelación incierta no se repite automáticamente porque sus endpoints no son idempotentes. La ausencia de una oferta en el listado abierto no identifica si fue cancelada o aceptada por quién. Una aceptación confirmada conserva su comprobante, una publicación confirmada conserva la oferta creada y una cancelación confirmada conserva ese resultado, aunque fallen lecturas posteriores. La oferta creada se muestra en «Comprar» como propia y confirmada localmente mientras el GET está pendiente o falla; «Vender (P2P)» ofrece un camino claro hacia el listado. Un GET exitoso reemplaza ese estado local: incluye la oferta una sola vez si sigue abierta y la retira si ya no aparece. Se marca el resto de la lista no actualizada como no confirmada y se ofrece reintento. Si falla el GET después de un `204` de cancelación, una oferta cancelada no vuelve a ser operable.

## Accesibilidad y contexto

Las dos vistas se eligen con controles nativos, etiquetas perceptibles y foco visible. Los campos tienen instrucciones y errores asociados. Cada diálogo presenta acción, jugador, oferta o cantidad, precio y total según corresponda; admite Escape, cancelación sin efectos y retorno de foco al control que lo abrió. Progreso y resultados se comunican con regiones de estado o alerta. A 360 y 1280 px se mantienen legibles todos los importes y acciones sin recortes. Cambios de jugador o sesión aíslan borradores, resultados, lista y solicitudes tardías.
