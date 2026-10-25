# Contrato de integración: trading en perfil

**Alcance**: consumo de rutas existentes desde `/players/[id]`, sin modificar el contrato público del backend. La forma de errores que sigue corresponde a las rutas actuales (`src/app/api/**` y `to-http-response.ts`); el contrato histórico de 005 difiere en base de ruta y nombre del campo de error.

## HTTP

Todas las solicitudes incluyen `Authorization: Bearer <token>` de la sesión. El frontend no recibe ni envía un `userId` seleccionable.

| Acción | Solicitud | Éxito | Uso |
|---|---|---|---|
| Cotización vigente | `GET /api/players/{playerId}/quotes` | `200 {items: PlayerQuoteDto[]}` | Usar `items[0]` del hook existente; no ordenar ni sustituir con `currentQuote` del perfil. |
| Portfolio | `GET /api/portfolio` | `200 {creditBalance, items}` | Seleccionar solo la posición con `item.playerId === playerId` del perfil. |
| Compra | `POST /api/orders/buy`, JSON `{playerId, quantity}` | `201 {operation, account, holding}` | `operation` es el comprobante efectivo. |
| Venta | `POST /api/orders/sell`, mismo JSON | `201 {operation, account, holding}` | Igual; consultar portfolio después del 201. |

`quantity` es un número JSON entero positivo. El cliente limita la entrada a 1..2.147.483.647 antes de construir el JSON. Las rutas rechazan propiedades extra. Las respuestas no se usan para cambiar la identidad de la sesión.

## Contrato observable de la vista

1. Mientras se cargan cotización y portfolio se anuncian por separado. Error del portfolio no oculta una cotización válida y ofrece reintento de GET.
2. La pantalla muestra saldo del GET y, del jugador abierto, cantidad, precio promedio, cotización actual, valor actual y PnL conforme a lo recibido. No muestra posiciones de otros jugadores. Portfolio vacío se anuncia explícitamente; posición ausente muestra cero tokens y métricas de posición ausentes.
3. Cotización ausente, en carga o con error impide compra y venta. SUPERUSER ve datos autorizados, sin controles operativos. INVESTOR requiere sesión válida y portfolio vigente.
4. El campo de cantidad tiene etiqueta y error asociado. Comprar requiere total orientativo ≤ saldo visible; vender requiere cantidad ≤ tenencia visible. Estos controles no garantizan ejecución.
5. Antes de POST, la confirmación identifica jugador, BUY/SELL expresado como compra/venta, cantidad, cotización visible en créditos/token y total orientativo en créditos. Cancelar y Escape cierran sin POST y conservan la entrada.
6. Confirmar inicia una sola solicitud aunque se active repetidamente con mouse o teclado. Mientras se envía, se anuncia progreso y no se inicia otra orden. El 201 muestra tipo, cantidad, cotización ejecutada y total de `operation`, luego dispara GET portfolio. Durante GET no se muestran cifras anteriores como actuales. Si GET falla, se conserva el comprobante y se ofrece reintento.
7. Rechazo explícito conserva la cantidad y no muestra comprobante de éxito. Ante red/5xx/respuesta no confirmada, el estado es indeterminado y la acción segura es volver a consultar portfolio antes de decidir otra orden; el GET no prueba por sí solo la ejecución.
8. Cambios de jugador/token invalidan lecturas y cifras viejas. Un resultado de orden ya enviada queda etiquetado con su jugador original y no modifica la posición de otro perfil; cambio de sesión elimina datos protegidos.

## Tratamiento de errores del backend actual

Las respuestas conocidas usan `{error: string}`. El cliente conserva `status`; si no puede leer JSON, usa texto genérico. Los mensajes específicos se aplican solo al status y texto conocidos.

| Respuesta | Presentación y recuperación |
|---|---|
| `401` | Ejecutar logout/redirección existente, ocultar datos financieros y bloquear órdenes. |
| `400` | Petición inválida; permitir corregir cantidad. No asumir un motivo más preciso si no consta. |
| `404 Current quote not available` | Informar falta de cotización, desactivar órdenes y permitir actualizar cotización. Otro 404: rechazo/recurso no disponible sin inventar causa. |
| `409 Insufficient credit balance` | Saldo insuficiente; corregir cantidad o consultar portfolio. |
| `409 Insufficient token holding` | Tenencia insuficiente; corregir cantidad o consultar portfolio. |
| `409 Insufficient tokens in central pool` | Disponibilidad insuficiente para compra; consultar datos antes de reintentar. |
| `409 Insufficient central pool balance` | Venta rechazada por disponibilidad del pool; consultar datos antes de reintentar. |
| `409 The central pool cannot operate as an investor` | Rol sin permiso para operar; retirar controles de sesión no INVESTOR. |
| Otro `409` | Rechazo genérico, actualizar portfolio; no atribuirlo a saldo ni tenencia. |
| Fallo de red, `5xx` o respuesta no confirmada | Resultado indeterminado; no afirmar éxito ni fracaso, ofrecer GET portfolio sin POST automático. |

## Accesibilidad y diseño

Controles nativos accesibles por teclado, etiqueta visible, `aria-invalid` y `aria-describedby` en el campo, foco visible, orden lógico, regiones `role=status`/`alert` para carga y resultado. El diálogo de confirmación recibe foco, lo contiene mientras está abierto, cierra con Escape/cancelación y devuelve foco al disparador. Su contenido conserva nombre del jugador y total orientativo. A 360 y 1280 px se mantienen todos los datos, acciones y mensajes sin recorte horizontal.

## Trazabilidad

FR-001–005 y 008: cotización, saldo y posición; FR-006–007: cantidad y límites visibles; FR-009–012: confirmación, POST, resultado y GET; FR-013–018: estados, errores, sesión y concurrencia; FR-019–020: accesibilidad y tamaños; FR-021–022: alcance y rol.
