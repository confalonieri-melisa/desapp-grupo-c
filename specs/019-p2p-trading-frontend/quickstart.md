# Quickstart de validación: frontend P2P

La guía se ejecuta **después de implementar** las tareas de esta feature. No modifica datos de producción ni sustituye la revisión de la Project Owner.

## Preparación

1. Usar Node.js >=22.12.0, instalar dependencias con `npm ci` si corresponde y configurar una base local según `README.md` y `.env.example`.
2. Preparar dos cuentas `INVESTOR`: una con tokens de un jugador y otra con créditos suficientes. Preparar además una oferta abierta, una posición insuficiente para otro caso, un jugador con tokens en el pool y otro con disponibilidad cero. Para el recorrido de agotamiento, usar un jugador con un solo token restante en el pool. Conservar credenciales solo en el entorno local.
3. Ejecutar `npm run dev` y abrir `/players/[id]` del jugador preparado. Contrastar datos visibles con [data-model.md](data-model.md) y [el contrato UI](contracts/p2p-trading-ui.md).

## Verificación automatizada

Al terminar la implementación, ejecutar los tests conductuales previstos del cliente P2P, disponibilidad y perfil con `npm test -- tests/unit/services/client.p2p-offers.service.spec.ts tests/unit/services/client.pool-availability.service.spec.ts tests/unit/services/pool-availability.service.spec.ts tests/unit/features/profile/p2p-trading.spec.ts tests/unit/features/profile/use-p2p-offers.spec.ts tests/unit/features/profile/use-pool-availability.spec.ts tests/unit/features/profile/player-p2p-section.spec.tsx tests/unit/features/profile/use-player-trading.spec.ts`. Ejecutar las pruebas de integración de la nueva ruta y repositorio con `npm run test:integration -- tests/integration/pool-availability.routes.spec.ts tests/integration/pool-availability.repository.spec.ts` sobre la base local de pruebas. Después ejecutar `npm run build`. Ampliar la suite solo si una falla revela un riesgo no cubierto. No se requieren tests de configuración o markup declarativo.

## Recorridos manuales

| Recorrido | Acción | Resultado esperado |
| --- | --- | --- |
| Compra P2P | Como comprador, abrir «Comprar», elegir oferta ajena, revisar y confirmar | Una aceptación completa con precio fijo; comprobante real, saldo/posición y ofertas actualizados. |
| Oferta propia | Abrir «Comprar» como vendedor | Identificada como propia, con «Cancelar» y sin «Comprar». Si hay ofertas ajenas pero ninguna propia, no aparece un estado vacío adicional. |
| Publicar | En «Vender (P2P)», con tenencia, ingresar cantidad y precio válidos y confirmar | Se indica cómo abrir «Comprar»; allí figura la oferta propia abierta. La respuesta `201` permite mostrarla una sola vez mientras el GET se reconcilia. Saldo y tokens no cambian por publicar. |
| Cancelar | En el listado de «Comprar», confirmar cancelación de una oferta propia | `204`, oferta fuera del listado abierto. Abandonar diálogo deja la oferta intacta. |
| Validación | Intentar cantidad fraccionaria, cero, exceso de tenencia o de 2.147.483.647; precio negativo, con más de dos decimales o superior a 99.999.999,99 créditos; y una combinación cuyo total supere 9.999.999.999,99 créditos | Errores en campos; cero mutaciones. Saldo insuficiente impide confirmar compra. |
| Sin cotización | Abrir jugador sin cotización, con disponibilidad positiva en el pool y una oferta P2P | Compra al pool indisponible por cotización; P2P visible y operable con precio fijo. |
| Conflicto | Cerrar una oferta desde otra sesión antes de confirmar o reducir tenencia/saldo | Rechazo explicativo; refresco disponible, sin falso comprobante. |
| Respuesta incierta | Interrumpir la respuesta de una mutación en entorno local | Estado incierto, consulta antes de nuevo intento; la aceptación reutiliza su clave si se reintenta explícitamente. |
| Refresco fallido | Confirmar una aceptación y hacer fallar la lectura posterior | Comprobante conservado; saldo/posición/lista afectados señalados como no confirmados. |
| Cambio de contexto | Cambiar de jugador, usuario o cerrar sesión con consulta pendiente | Ningún dato o borrador del contexto anterior aparece en el nuevo perfil. |
| Sesión vencida | Hacer responder `401` a la lectura de ofertas y a cada mutación P2P por separado | Se aplica el cierre de sesión existente y se retiran datos financieros protegidos. |
| Pool positivo | Abrir «Comprar» con `GET /api/players/{id}/pool-availability` igual a una cantidad positiva y cotización vigente | Compra al pool visible, cantidad limitada al stock consultado y ofertas P2P separadas. |
| Pool en cero | Abrir «Comprar» con `availableQuantity: 0` confirmado | Compra al pool oculta; ofertas P2P siguen visibles. |
| Pool cargando/error | Retrasar o fallar el nuevo GET | Estado y reintento visibles, sin interpretar el dato como cero ni permitir iniciar compra al pool. |
| Stock obsoleto | Reducir el stock desde otra sesión tras una lectura positiva y confirmar compra central | `POST /api/orders/buy` revalida; un rechazo no se presenta como compra exitosa. |
| Agotar pool | Comprar el último token disponible al pool | Comprobante central conservado; nuevo GET devuelve cero y oculta la compra al pool. |
| Refresco de pool fallido | Confirmar una compra central y hacer fallar el GET posterior | Comprobante central conservado; disponibilidad no confirmada, compra deshabilitada y reintento disponible. |
| Venta al pool | Revisar ambas vistas | No aparece ningún control de venta al pool; el endpoint financiero existente no se modifica. |
| Accesibilidad | Repetir acciones con teclado, Escape y anchos de 360 y 1280 px | Foco visible y retornado tras diálogos; mensajes perceptibles; sin controles ni importes recortados. |

Comprobar el nuevo GET con JWT válido e inválido, jugador existente e inexistente y cantidad cero/positiva; su respuesta solo incluye `playerId` y `availableQuantity`, no datos del SUPERUSER, y no modifica tenencias. Confirmar que OpenAPI/Swagger y Postman describen el endpoint. La consulta de ofertas solo muestra abiertas. «Comprar» no incluye un historial de ofertas completadas o canceladas ni una sección propia separada. El nombre del vendedor del mockup no es verificable: la API solo proporciona `sellerId`.
