# Modelo de datos de la interfaz P2P

**Alcance**: estados y contratos consumidos por el perfil del jugador, más una lectura autenticada y de solo lectura de disponibilidad del pool. No hay tablas ni migraciones nuevas ni cambios en las mutaciones financieras.

## Datos de origen

| Entidad | Campos relevantes | Origen | Regla |
| --- | --- | --- | --- |
| Sesión autenticada | `token`, `user.id`, `user.role` | `AuthContext` | `user.id` identifica ofertas propias; solo `INVESTOR` opera. |
| Jugador confirmado | `id`, `name` | Perfil `/players/[id]` | Todas las acciones P2P se limitan a este `id`. |
| Portfolio | `creditBalance`, `items[]` | `GET /api/portfolio` existente | La posición del jugador aporta `quantity`, promedio, valor y PnL; ausencia de posición equivale a cero tokens, no a precio cero. |
| Cotización | `quoteValue` e historial | Lectura existente de cotizaciones | Solo condiciona operaciones con el pool; no condiciona P2P. |
| Disponibilidad del pool | `playerId`, `availableQuantity` (entero no negativo) | Nuevo `GET /api/players/{id}/pool-availability` | La lectura corresponde al pool canónico del jugador y no expone identidad ni saldo del SUPERUSER. Es una foto informativa, distinta de cero cuando está cargando o falla. |
| Oferta abierta | `id`, `sellerId`, `playerId`, `quantity`, `unitPrice`, `status: OPEN`, `createdAt` | `GET /api/p2p/offers?playerId=...` | El listado no incluye nombre de vendedor ni ofertas cerradas. `id` distingue ofertas del mismo vendedor. |
| Comprobante de aceptación | `operation` (`id`, `buyerId`, `sellerId`, `offerId`, `playerId`, `quantity`, `unitPrice`, `total`, `createdAt`), `account.creditBalance`, `holding.quantity`, `holding.averagePurchasePrice` | `POST .../accept` | El importe ejecutado y el resultado confirmado se leen de este objeto, no del cálculo previo. |

La respuesta de publicación es una **oferta abierta**, sin transferencia financiera. La respuesta de cancelación exitosa no tiene cuerpo (`204`).

## Datos derivados de presentación

| Dato | Derivación | Uso |
| --- | --- | --- |
| Acción de oferta | `offer.sellerId === user.id` | En la misma fila de «Comprar», una oferta propia muestra «Cancelar» y una ajena muestra «Comprar». |
| Total de oferta | `roundMoney(quantity × unitPrice)` | Comparación y confirmación; el comprobante prevalece al ejecutar. |
| Etiqueta de vendedor | Identificador de vendedor disponible, abreviado visualmente si se ofrece el valor completo en el detalle accesible | No representa un nombre público. |
| Tenencia del jugador | Posición del portfolio para `playerId`, o cero si el portfolio cargó y no contiene posición | Validación local de publicación. |
| Compra central visible | `availableQuantity > 0` con lectura confirmada | Muestra el formulario solo con stock positivo; lo oculta con cero. La cantidad ingresada no supera la disponibilidad consultada. |

## Estados de interacción

### Listado único de ofertas en «Comprar»

`idle → loading → ready | empty | error`. `ready` y `empty` pueden pasar a `refreshing` después de una mutación o reintento; luego vuelven a `ready | empty | error`. Durante `refreshing`, la lista anterior no se presenta como disponibilidad confirmada ni habilita una nueva aceptación sin validación vigente. Un `error` ofrece reintentar la consulta. `empty` se usa cuando no hay ofertas abiertas del jugador; la ausencia de ofertas propias por sí sola no genera un estado vacío separado.

### Disponibilidad de compra al pool

`idle → loading → available | empty | error`. `available` requiere `availableQuantity > 0`; `empty` requiere un `200` confirmado con `availableQuantity === 0`. `loading` y `error` muestran estado diferenciado y reintento, sin interpretar la cantidad como cero ni permitir iniciar una compra. La lectura se aísla por `(token, playerId)` y se refresca tras una compra central confirmada; durante ese refresco, el dato anterior no habilita otra compra como si estuviera vigente. Si el nuevo valor es cero, el formulario se oculta, pero el comprobante confirmado permanece visible. Con valor positivo, la validación local limita la cantidad ingresada a `availableQuantity` además del saldo y cotización; el backend revalida al ejecutar porque la lectura puede quedar obsoleta.

### Borrador de publicación

`{ token, playerId, quantityText, unitPriceText, fieldErrors }`. Cantidad: entero positivo no mayor que la tenencia actual ni que 2.147.483.647. Precio: número positivo con hasta dos decimales y máximo de 99.999.999,99 créditos por token; el total no supera 9.999.999.999,99 créditos. Estos topes evitan exceder los campos de precio y total de la operación persistida, que son más estrechos que el precio permitido por la tabla de ofertas; no garantizan aceptación por el backend. El precio se convierte al número del request solo después de validar el texto. La confirmación captura la cantidad, el precio y el total validados. Cancelarla devuelve el borrador editable. Cambiar de jugador o sesión lo descarta.

### Confirmaciones

Se mantiene una confirmación P2P activa por contexto, con variante `accept` (oferta completa), `publish` (borrador validado) o `cancel` (oferta propia). Cada variante guarda `token`, `playerId` y los datos que la persona debe revisar. La variante `accept` conserva `offer.id`, cantidad, precio y total de la oferta leída; antes de enviar vuelve a revisar identidad, saldo visible y estado local. No se edita la cantidad ni el precio. Cerrar el diálogo nunca envía la mutación.

### Mutación y resultado

`idle → submitting → succeeded | rejected | uncertain`. El estado `submitting` impide enviar otra vez la misma acción. `succeeded` conserva el resultado correspondiente —oferta creada, comprobante de aceptación o cancelación confirmada— aunque falle el refresco posterior. La respuesta `201` de publicación se conserva y, al abrir «Comprar», la oferta se muestra allí como propia y confirmada localmente mientras el GET está pendiente o falla; desde «Vender (P2P)» se indica cómo llegar a esa vista. Un GET exitoso sustituye ese estado: la oferta aparece una sola vez si sigue abierta y desaparece si ya no figura en la lista del servidor. La lista anterior queda no confirmada y una oferta con cancelación confirmada deja de ofrecer acciones. `rejected` conserva el motivo conocido o genérico según el status HTTP. `uncertain` conserva los datos de la acción y pide actualizar antes de decidir un reintento; no implica éxito ni fracaso.

Para aceptar, una intención confirmada lleva una `Idempotency-Key` estable durante un reintento manual de esa **misma** oferta tras incertidumbre. Una nueva intención obtiene otra clave. Publicación y cancelación no tienen clave de idempotencia: una lista actualizada puede ayudar a decidir, pero no prueba por sí sola el resultado exacto de una solicitud sin respuesta.

## Aislamiento y sincronización

La identidad del estado es la pareja `(token, playerId)`. Lecturas con `AbortController` y/o generación descartan resultados tardíos; las mutaciones ya enviadas no se reinterpretan para otro perfil. Tras aceptación P2P confirmada se refrescan lista y portfolio; este último publica su actualización mediante el mecanismo existente para la navegación global. Tras publicación o cancelación se refresca la lista; la publicación no altera saldo ni tenencia. Tras compra central confirmada se refresca la disponibilidad del pool. Cada fallo de refresco se indica sin borrar un resultado confirmado. La venta al pool no tiene controles en las dos vistas de esta entrega.
