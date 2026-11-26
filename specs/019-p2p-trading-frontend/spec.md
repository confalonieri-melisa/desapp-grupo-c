# Feature Specification: Compra y venta P2P desde el perfil del jugador

**Feature Branch**: `feature/019-p2p-trading-frontend`

**Created**: 2026-11-25

**Status**: Draft

**Input**: Incorporar al perfil del jugador la experiencia de compra de ofertas P2P completas, publicación y cancelación de ofertas propias, inspirada vagamente en el mockup provisto. Conservar la compra al pool central, ocultarla cuando no haya tokens disponibles y no mostrar venta al pool. Agregar una consulta de solo lectura para conocer la disponibilidad actual del pool por jugador.

## Contexto y alcance

En el perfil de cada jugador, la persona autenticada ya puede consultar cotización, saldo y posición; el inversor puede comprar y vender al pool central. Esta entrega incorpora una modalidad P2P de ofertas de venta a precio fijo entre inversores y una consulta para conocer cuántos tokens del jugador permanecen en el pool. La interfaz conserva la compra al pool solo cuando hay disponibilidad y no presenta la venta al pool. Debe distinguir el precio variable del pool del precio fijo de cada oferta, revisar las consecuencias antes de confirmar y conocer el resultado real de cada acción.

El mockup orienta la jerarquía visual: cotización y saldo, resumen de la posición, dos vistas «Comprar» y «Vender (P2P)», compra rápida al pool y ofertas P2P. El listado de «Comprar» reúne ofertas ajenas comprables y ofertas propias cancelables. Sus cifras, porcentajes y nombres son ilustrativos. La interfaz debe integrarse al diseño existente y adaptarse a pantallas estrechas sin exigir una reproducción exacta de la imagen.

La entrega se limita a presentación e interacción sobre las capacidades existentes. No incorpora cambios de reglas financieras, nuevas modalidades de oferta, nuevos datos de vendedores, historial de ofertas cerradas ni modificaciones del mercado central.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Comprar una oferta P2P completa (Priority: P1)

Como inversor autenticado, quiero comparar las ofertas abiertas de un jugador con la compra al pool y aceptar una oferta completa para adquirir tokens al precio publicado por otro inversor.

**Why this priority**: Es el recorrido de compra nuevo y permite aprovechar ofertas P2P ya publicadas.

**Independent Test**: Con una oferta abierta de otro inversor, consultarla en el perfil del jugador, revisar precio y total, confirmarla y comprobar el resultado y la posición actualizada.

**Acceptance Scenarios**:

1. **Given** un jugador con ofertas abiertas de distintos vendedores, **When** el inversor abre «Comprar», **Then** ve solo ofertas de ese jugador con cantidad, precio fijo por token, total y vendedor identificable, separadas de la compra rápida al pool.
2. **Given** una oferta abierta ajena y saldo visible suficiente, **When** el inversor elige «Comprar» en esa oferta, **Then** revisa jugador, cantidad completa, precio fijo y total antes de confirmar; no puede introducir una cantidad parcial.
3. **Given** una confirmación P2P abierta, **When** el inversor la cancela, **Then** no se acepta la oferta y vuelve a poder revisar el listado.
4. **Given** una confirmación P2P abierta, **When** el inversor confirma, **Then** se inicia una sola aceptación, se informa el progreso y se impide enviar nuevamente la misma acción mientras está pendiente.
5. **Given** una aceptación confirmada como exitosa, **When** se presenta el resultado, **Then** se muestran cantidad, precio fijo y total efectivamente aplicados, y se actualizan el saldo, la posición y el listado de ofertas; el comprobante permanece visible si falla alguna actualización posterior.
6. **Given** una oferta propia, **When** el vendedor la ve en el listado de «Comprar», **Then** se identifica como propia y no ofrece una acción para aceptarla.

---

### User Story 2 - Publicar una oferta de venta (Priority: P1)

Como inversor con tokens de un jugador, quiero fijar cantidad y precio de venta para publicar una oferta visible a otros inversores.

**Why this priority**: Permite crear el otro extremo del intercambio P2P desde la misma pantalla donde se consulta la posición.

**Independent Test**: Con una posición suficiente, ingresar cantidad y precio válidos, revisar el total, confirmar la publicación y encontrar la oferta propia en el listado de «Comprar».

**Acceptance Scenarios**:

1. **Given** una tenencia positiva del jugador, **When** el inversor abre «Vender (P2P)», **Then** encuentra un formulario de cantidad y precio fijo que muestra el total resultante y su tenencia disponible.
2. **Given** cantidad entera positiva dentro de la tenencia y precio positivo con hasta dos decimales, **When** el inversor elige publicar, **Then** revisa jugador, cantidad, precio, total y la aclaración de que publicar no reserva tokens antes de confirmar.
3. **Given** una confirmación de publicación, **When** el inversor cancela, **Then** no se crea ninguna oferta y conserva los valores ingresados para editarlos.
4. **Given** una publicación exitosa, **When** se presenta el resultado, **Then** se confirma la publicación y se informa cómo llegar a «Comprar». Mientras la actualización del listado esté pendiente o falle, la oferta se conserva en la presentación local como publicada y pendiente de verificación. Una consulta exitosa prevalece: la oferta figura como propia solo si sigue abierta; si ya no figura, se conserva la confirmación de publicación sin presentarla como abierta. El saldo y la tenencia no se presentan como modificados por la mera publicación.
5. **Given** una cantidad inválida, mayor que la tenencia visible, o un precio inválido, **When** el inversor intenta avanzar, **Then** se informa el problema junto al campo correspondiente y no se envía la publicación.

---

### User Story 3 - Cancelar una oferta propia desde el listado (Priority: P2)

Como vendedor, quiero identificar mis ofertas abiertas entre las demás ofertas del jugador y cancelar una que ya no deseo mantener.

**Why this priority**: Permite controlar las intenciones de venta publicadas sin presentar como disponibles ofertas cerradas.

**Independent Test**: Con una oferta propia abierta, encontrarla en el listado de «Comprar», cancelarla tras confirmar y verificar que deja de estar disponible.

**Acceptance Scenarios**:

1. **Given** ofertas abiertas propias y ajenas para el jugador, **When** el inversor abre «Comprar», **Then** ve ambas en un único listado; las ajenas ofrecen «Comprar» y las propias se identifican como propias y ofrecen «Cancelar».
2. **Given** una oferta propia abierta, **When** el inversor elige cancelar, **Then** revisa cuál oferta se cancelará y puede abandonar la confirmación sin enviar la cancelación.
3. **Given** una cancelación confirmada como exitosa, **When** se actualiza el listado de «Comprar», **Then** la oferta deja de aparecer entre las abiertas y ya no ofrece acciones de compra ni cancelación.
4. **Given** que no hay ofertas propias abiertas pero sí ajenas, **When** se carga «Comprar», **Then** las ofertas ajenas siguen visibles y comprables; no se muestra un panel ni un estado vacío de ofertas propias.

---

### User Story 4 - Mostrar compra al pool según disponibilidad (Priority: P2)

Como inversor, quiero ver la compra al pool cuando hay tokens disponibles para no intentar comprar una cantidad que el pool ya no tiene.

**Why this priority**: La disponibilidad actual del pool permite ofrecer una acción de compra solo cuando puede tener sentido, sin confundir su cotización con las ofertas P2P.

**Independent Test**: Consultar un jugador con tokens en el pool y otro sin tokens; comprobar que la compra se muestra solo para el primero, que los errores de consulta no se tratan como cantidad cero y que la compra P2P permanece disponible independientemente.

**Acceptance Scenarios**:

1. **Given** disponibilidad del pool mayor que cero y cotización vigente, **When** el inversor abre «Comprar», **Then** encuentra la compra al pool con cotización vigente y total orientativo, separada de las ofertas P2P a precio fijo.
2. **Given** disponibilidad confirmada del pool igual a cero, **When** se abre «Comprar», **Then** la compra al pool se oculta y las ofertas P2P abiertas siguen visibles.
3. **Given** que la disponibilidad del pool se está cargando o no pudo consultarse, **When** se abre «Comprar», **Then** la interfaz indica que la disponibilidad no está confirmada, no la presenta como cero ni permite iniciar la compra al pool, y ofrece reintentar la consulta.
4. **Given** una compra al pool visible y una disponibilidad que cambia antes de confirmar, **When** se acepta la orden, **Then** la validación vigente del backend sigue siendo definitiva y cualquier rechazo se muestra sin presentar una compra exitosa.
5. **Given** ausencia de cotización vigente, **When** se abre el perfil, **Then** la compra al pool queda indisponible por falta de cotización, mientras las ofertas P2P abiertas y su precio fijo siguen siendo consultables y operables según sus propias condiciones.
6. **Given** una compra al pool exitosa que agota la disponibilidad, **When** se actualizan los datos del perfil, **Then** la consulta devuelve cero tokens y la compra al pool se oculta.

### Edge Cases

- Una oferta puede dejar de estar abierta entre la consulta y la confirmación; se muestra el rechazo y se ofrece actualizar la lista, sin presentar compra exitosa.
- El comprador puede quedarse sin saldo o el vendedor sin tokens después de publicar o consultar; la validación visible orienta, pero el rechazo real prevalece y no se prometen fondos ni tokens reservados.
- Una cotización posterior no cambia el precio fijo publicado de una oferta P2P. La ausencia de cotización tampoco convierte ese precio en cero.
- No se acepta una oferta propia ni se permite comprar una fracción de una oferta ajena.
- El listado de «Comprar» puede contener una oferta propia; se distingue de las comprables y ofrece «Cancelar» con confirmación en esa misma vista.
- Los resultados de carga, lista vacía, error de consulta y actualización pendiente deben diferenciarse; cada error recuperable ofrece reintento.
- Ante una respuesta incierta de publicación, aceptación o cancelación, no se afirma éxito ni fracaso, ni se reenvía automáticamente una acción financiera. Se ofrece actualizar datos para revisar el estado antes de decidir un nuevo intento.
- Una confirmación exitosa seguida de un fallo al actualizar saldo, posición u ofertas conserva el comprobante y señala cuáles datos aún no están confirmados.
- Al cerrar sesión, cambiar de usuario o abrir otro jugador, los datos y respuestas tardías del contexto anterior no aparecen en el perfil actual.
- Un usuario sin permiso para operar no ve controles operativos, aunque pueda consultar la información que su sesión autorice.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La experiencia DEBE integrarse al perfil del jugador abierto y conservar visibles la cotización, el saldo y la posición correspondientes a la sesión y a ese jugador, distinguiendo cero, dato ausente y dato en carga.
- **FR-002**: La interfaz DEBE separar visual y textualmente la compra al pool de las ofertas P2P, identificar la cotización vigente como referencia del pool y el precio publicado como fijo para cada oferta P2P, y NO DEBE presentar controles para vender al pool.
- **FR-003**: «Comprar» DEBE presentar la compra al pool cuando haya tokens disponibles y las ofertas P2P abiertas del jugador, con vendedor identificable, cantidad completa, precio por token y total de cada oferta.
- **FR-004**: La identidad pública del vendedor DEBE limitarse a los datos realmente disponibles; si solo hay un identificador, se DEBE mostrar una etiqueta comprensible derivada de él sin inventar nombre, alias ni reputación.
- **FR-005**: Una oferta propia DEBE distinguirse de las ajenas y NO DEBE ofrecer una acción para aceptarla.
- **FR-006**: La compra P2P DEBE aceptar únicamente la cantidad completa publicada y NO DEBE ofrecer compra parcial, edición de cantidad ni cambio del precio fijo.
- **FR-007**: Antes de aceptar una oferta P2P, la interfaz DEBE pedir confirmación explícita con jugador, cantidad, precio fijo y total; abandonar la confirmación NO DEBE enviar la aceptación.
- **FR-008**: La interfaz DEBE impedir avanzar a la confirmación P2P mientras el saldo no esté disponible o actualizado, o cuando el total supera el saldo visible vigente; la ejecución final puede rechazar por cambios posteriores de saldo, tenencia o estado de oferta.
- **FR-009**: Una aceptación exitosa DEBE mostrar el comprobante con la cantidad, precio y total efectivamente aplicados; después DEBE actualizar saldo, posición y ofertas sin sustituir el comprobante por valores calculados previamente.
- **FR-010**: La publicación DEBE utilizar el jugador del perfil y permitir ingresar cantidad entera positiva y precio fijo positivo con hasta dos decimales. La cantidad NO DEBE superar la tenencia disponible ni 2.147.483.647; el precio NO DEBE superar 99.999.999,99 créditos por token ni producir un total superior a 9.999.999.999,99 créditos. El formulario NO DEBE permitir elegir otro jugador ni vendedor.
- **FR-011**: La publicación DEBE requerir una tenencia disponible y actualizada, validar la cantidad frente a ella y asociar los errores de cantidad o precio con el campo correspondiente, sin enviar una oferta inválida.
- **FR-012**: Antes de publicar, la interfaz DEBE mostrar cantidad, precio, total y una aclaración de que los tokens no quedan reservados; cancelar la confirmación NO DEBE publicar y DEBE conservar los valores editables.
- **FR-013**: Tras una publicación exitosa, la interfaz DEBE conservar la confirmación e indicar desde «Vender (P2P)» cómo llegar al listado de «Comprar». Mientras la consulta posterior esté pendiente o falle, DEBE mantener una presentación local de la oferta marcada como pendiente de verificación. Una consulta exitosa DEBE prevalecer: la oferta DEBE figurar como propia solo si continúa abierta y, si ya no figura, NO DEBE presentarse como abierta ni perderse la confirmación de publicación. La mera publicación NO DEBE presentarse como transferencia de tokens o créditos.
- **FR-014**: El listado de «Comprar» DEBE reunir las ofertas abiertas del jugador, propias y ajenas, diferenciando sus acciones: «Comprar» para las ajenas y «Cancelar» para las propias. NO DEBE existir un panel separado de ofertas propias ni presentarse ese listado como historial de ofertas completadas o canceladas.
- **FR-015**: La cancelación DEBE ofrecer confirmación explícita de la oferta seleccionada; abandonar ese diálogo NO DEBE realizar cambios.
- **FR-016**: Tras una cancelación exitosa, la oferta DEBE desaparecer del listado de ofertas abiertas y dejar de ofrecer acciones operativas.
- **FR-017**: La interfaz DEBE ofrecer estados diferenciados de carga, ausencia de ofertas abiertas, error y reintento para el listado compartido del jugador. La ausencia de ofertas propias por sí sola NO DEBE producir un estado vacío separado.
- **FR-018**: Durante publicación, aceptación y cancelación DEBE informarse progreso y bloquearse el envío repetido de la misma acción; un reintento manual de la misma aceptación incierta DEBE conservar su clave de idempotencia y una intención nueva DEBE usar otra clave.
- **FR-019**: Ante un rechazo conocido por saldo, tenencia, estado de oferta, permisos o datos inválidos, la interfaz DEBE explicar el resultado y ofrecer una acción de recuperación apropiada, sin mostrar éxito ni atribuir causas no comprobadas.
- **FR-020**: Ante un fallo de red o respuesta incierta de una mutación, la interfaz NO DEBE afirmar éxito ni fracaso ni repetir automáticamente la acción; DEBE ofrecer actualización de los datos antes de otro intento. Si una oferta ya no figura entre las abiertas, esa ausencia por sí sola NO DEBE presentarse como prueba de quién la aceptó ni del resultado de la solicitud incierta. La publicación y la cancelación no tienen la protección de idempotencia de la aceptación.
- **FR-021**: Si una mutación fue confirmada y falla una actualización posterior, la interfaz DEBE conservar su resultado confirmado (comprobante de aceptación, oferta publicada o cancelación confirmada), indicar qué datos no pudieron actualizarse y permitir reintentar la consulta sin presentar datos anteriores como actuales. Una oferta cuya cancelación se confirmó NO DEBE seguir ofreciendo acciones aunque falle la consulta posterior.
- **FR-022**: La sesión ausente o vencida DEBE seguir el flujo de autenticación existente y retirar datos financieros protegidos; solo los inversores autenticados DEBEN tener controles para publicar, aceptar o cancelar ofertas y operar con el pool.
- **FR-023**: Cambios de jugador o de sesión NO DEBEN permitir que solicitudes o borradores anteriores sustituyan datos del contexto actual.
- **FR-024**: Las acciones, confirmaciones y estados DEBEN ser utilizables con teclado, etiquetas, foco inicial dentro de cada confirmación, salida con Escape, retorno del foco al control que la abrió y mensajes de error o resultado perceptibles; la información y controles DEBEN seguir utilizables a 360 y 1280 píxeles de ancho.
- **FR-025**: La compra al pool DEBE conservar las validaciones, confirmación, resultado y reglas existentes. La interfaz NO DEBE presentar la acción de vender al pool.
- **FR-026**: La interfaz NO DEBE depender de una cotización vigente para consultar, publicar o aceptar ofertas P2P de precio fijo; las operaciones al pool conservan su dependencia actual de la cotización.
- **FR-027**: Los importes, porcentajes, gráficos e identidades DEBEN basarse en información real disponible; cualquier elemento ilustrativo del mockup sin datos suficientes DEBE omitirse o presentarse como no disponible, nunca como valor ficticio.
- **FR-028**: El sistema DEBE ofrecer a una sesión autenticada una consulta de solo lectura de la cantidad de tokens disponibles en el pool para el jugador solicitado. La respuesta DEBE identificar al jugador y devolver una cantidad entera no negativa sin exponer el saldo ni otros datos del usuario SUPERUSER.
- **FR-029**: El frontend DEBE mostrar la compra al pool solo cuando la disponibilidad consultada para el jugador sea mayor que cero; con disponibilidad confirmada igual a cero, NO DEBE mostrar la acción. La cantidad ingresada para compra central NO DEBE superar la disponibilidad consultada. Tras una compra central confirmada, DEBE actualizar la disponibilidad y ocultar la compra si llega a cero. Mientras se carga o ante un error, NO DEBE asumir cero ni permitir iniciar la compra, y DEBE ofrecer reintentar.
- **FR-030**: La consulta de disponibilidad del pool DEBE validar el jugador, requerir autenticación y no aceptar un identificador de pool o usuario en el request. La disponibilidad es informativa y el backend DEBE seguir validando saldo, cotización y cantidad al ejecutar la compra.

### Key Entities _(include if feature involves data)_

- **Jugador**: Perfil abierto que determina la cotización, la posición y las ofertas presentadas.
- **Posición del inversor**: Cantidad poseída, precio promedio, valor actual y resultado no realizado disponibles para ese jugador; sirve de referencia antes de publicar.
- **Oferta P2P abierta**: Intención de venta con vendedor identificable, jugador, cantidad completa, precio fijo y fecha de publicación; no reserva tokens.
- **Comprobante P2P**: Resultado confirmado de una aceptación, con jugador, cantidad, precio, total y datos resultantes del comprador.
- **Saldo**: Créditos disponibles de la persona autenticada; orienta la capacidad de compra antes de una validación final.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: En el 100% de los casos de aceptación de ofertas, la cantidad mostrada para confirmar coincide con la cantidad completa publicada; no existe un recorrido para comprar una fracción.
- **SC-002**: En pruebas de aceptación, el 100% de las publicaciones exitosas conserva su confirmación; mientras la consulta de ofertas está pendiente o falla, su presentación local indica que falta verificarla, y tras una consulta exitosa aparece en «Comprar» solo si sigue abierta. El 100% de las cancelaciones exitosas se retira del listado y el 100% de las aceptaciones exitosas muestra el comprobante y los datos financieros actualizados o un estado explícito de actualización fallida.
- **SC-003**: En el 100% de los casos de validación previstos —cantidad o precio inválidos, tenencia o saldo visible insuficientes y oferta propia— no se envía una acción inválida y se muestra un motivo comprensible.
- **SC-004**: El 100% de las confirmaciones abandonadas no genera mutaciones y las activaciones repetidas durante un envío producen como máximo una acción de usuario en curso.
- **SC-005**: En el 100% de los escenarios de oferta cerrada, conflicto de saldo o tenencia, sesión vencida y respuesta incierta, la interfaz evita afirmar un éxito no confirmado y ofrece la recuperación especificada.
- **SC-006**: Los recorridos de comprar P2P, publicar, cancelar y operar con el pool pueden completarse con teclado y a 360 y 1280 píxeles sin pérdida de controles ni información necesaria para decidir.
- **SC-007**: En pruebas de disponibilidad, el 100% de los perfiles muestra la compra al pool cuando la cantidad disponible es positiva, la oculta cuando es cero y mantiene un estado recuperable cuando el dato no está disponible; ninguna venta al pool aparece en la interfaz.
- **SC-008**: En una revisión de las etiquetas y datos visibles, se distingue en todos los casos el precio fijo P2P de la cotización del pool; ninguna oferta cerrada se presenta como abierta ni se inventa un nombre de vendedor.

## Assumptions

- La integración se realiza en el perfil existente de cada jugador, con dos vistas: «Comprar» y «Vender (P2P)». Un único listado de ofertas abiertas del jugador permite comprar ofertas ajenas y cancelar ofertas propias; no hay panel de ofertas propias ni historial de ofertas cerradas.
- Las consultas actuales permiten conocer saldo, posición, cotización y ofertas abiertas filtradas por jugador. La lista de ofertas abiertas permite distinguir cuáles pertenecen al usuario autenticado.
- Las ofertas recibidas identifican al vendedor mediante un identificador, sin nombre público. Una etiqueta basada en ese identificador es suficiente para distinguir ofertas en este alcance.
- El listado existente solo contiene ofertas abiertas; las completadas y canceladas dejan de estar disponibles y no se implementa una consulta histórica en esta entrega.
- El backend existente valida nuevamente saldo, tenencia, estado de oferta y permisos al ejecutar una acción. La interfaz informa y previene errores previsibles sin presentar su validación como garantía financiera.
- La disponibilidad informada por el nuevo endpoint puede cambiar antes de completar una compra. El backend existente sigue siendo la autoridad al ejecutar; el dato de lectura solo controla si se ofrece la acción.
- Publicar una oferta no reserva tokens ni cambia saldo o posición. Las ofertas P2P usan el precio fijo publicado incluso si cambia o falta la cotización vigente del jugador.
- La experiencia reutiliza autenticación, cotizaciones, portfolio, navegación y compra central existente. Agrega una lectura autenticada del inventario del pool por jugador, sin modificar mutaciones, reglas financieras ni persistencia. No agrega venta al pool en la interfaz, pagos externos, negociaciones, compras parciales ni reserva de tokens.
