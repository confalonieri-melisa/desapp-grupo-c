# Feature Specification: Compra y venta de tokens desde el perfil del jugador

**Feature Branch**: `feature/009-player-token-trading-frontend` (prevista; esta especificación no crea ni cambia de rama)

**Created**: 2026-10-25

**Status**: Approved (Project Owner confirmed on 2026-10-25 before implementation)

**Input**: Agregar únicamente el frontend de compra y venta de tokens de jugadores, integrado al perfil existente y conectado a los contratos vigentes de órdenes y portfolio, sin cambios de backend ni de reglas de negocio.

## Alcance

La persona autenticada puede consultar la cotización vigente, el saldo y su posición en el jugador. La persona con rol INVESTOR puede ingresar una cantidad entera de tokens, confirmar una compra o venta y conocer su resultado. La vista del perfil muestra únicamente el saldo y la posición del jugador abierto: cantidad poseída, precio promedio de compra, valor actual y PnL no realizado cuando corresponda. Después de una operación exitosa, la información visible se actualiza con la respuesta vigente del backend.

Quedan fuera de alcance cambios de backend, endpoints, persistencia o reglas de negocio; nuevas operaciones financieras, libro de órdenes, comisiones, trading entre inversores, historial avanzado y tokens fraccionarios.

## Clarifications

### Session 2026-10-25

- Q: En el perfil de cada jugador, ¿se debe mostrar solo la posición de ese jugador y el saldo, o el portfolio completo? → A: Solo el saldo y la posición del jugador abierto.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar cotización y posición (Priority: P1)

Como persona autenticada, quiero ver en el perfil de un jugador su cotización y mi posición para decidir si operar.

**Why this priority**: Permite entender el costo y las tenencias antes de iniciar una operación.

**Independent Test**: Abrir un perfil con cotización y un portfolio con o sin posición en ese jugador; comprobar la información presentada sin enviar órdenes.

**Acceptance Scenarios**:

1. **Given** una sesión válida, un jugador con cotización y una posición existente, **When** se carga el perfil, **Then** se muestran la cotización vigente en créditos por token, el saldo, la cantidad poseída, el precio promedio, el valor actual y el PnL no realizado correspondientes al usuario autenticado y a ese jugador.
2. **Given** un portfolio sin posiciones, **When** termina la carga, **Then** se informa que está vacío, se muestra el saldo disponible y la tenencia del jugador como cero; no se inventan precio promedio, valor actual ni PnL de una posición inexistente.
3. **Given** una posición existente cuya cotización actual, valor actual o PnL están ausentes en el portfolio, **When** se presenta, **Then** esos datos se indican como no disponibles y se conserva el precio promedio recibido; la ausencia no se representa como cero.
4. **Given** que el portfolio o la cotización aún se consulta, **When** se abre el perfil, **Then** se indica qué información está cargando, sin presentarla como vacía ni como error.
5. **Given** que la consulta del portfolio falla, **When** termina la solicitud, **Then** se muestra un error y una acción para reintentar sin perder los datos válidos de la cotización.

---

### User Story 2 - Comprar tokens (Priority: P1)

Como persona con rol INVESTOR, quiero ingresar una cantidad, revisar la compra y confirmarla para adquirir tokens del jugador.

**Why this priority**: Es la acción principal de adquisición y requiere una decisión informada antes del envío.

**Independent Test**: Con cotización y saldo suficientes, ingresar una cantidad entera positiva, revisar la confirmación, comprar y verificar el resultado y el portfolio actualizado.

**Acceptance Scenarios**:

1. **Given** cotización disponible, saldo conocido y cantidad entera positiva, **When** se elige comprar, **Then** se presenta una confirmación con jugador, tipo de operación, cantidad, cotización visible y total orientativo antes de enviar la orden.
2. **Given** una confirmación de compra, **When** se cancela, **Then** no se envía ninguna orden y la cantidad ingresada sigue disponible para editar.
3. **Given** una confirmación de compra, **When** se confirma, **Then** se envía una única orden para el jugador del perfil y la cantidad confirmada, se indica el progreso y se impide otro envío mientras esta orden está pendiente.
4. **Given** una compra exitosa, **When** se recibe el resultado, **Then** se muestra confirmación de éxito con tipo, cantidad, precio ejecutado y total devueltos; se consulta nuevamente el portfolio y se actualizan saldo y posición visibles.
5. **Given** saldo insuficiente según los datos visibles o una respuesta de conflicto por saldo, **When** se intenta comprar, **Then** se explica que no alcanza el saldo, no se presenta una compra como exitosa y se permite ajustar la cantidad o reintentar después de refrescar los datos.

---

### User Story 3 - Vender tokens poseídos (Priority: P1)

Como persona con rol INVESTOR, quiero vender una cantidad de tokens que poseo y conocer el resultado para ajustar mi posición.

**Why this priority**: Completa el recorrido básico de trading y depende de mostrar la tenencia real.

**Independent Test**: Con una posición existente y cotización disponible, vender una cantidad que no supera la tenencia y comprobar resultado y portfolio actualizado.

**Acceptance Scenarios**:

1. **Given** una tenencia positiva y una cantidad entera dentro de ella, **When** se elige vender, **Then** se presenta una confirmación con jugador, tipo, cantidad, cotización visible y total orientativo.
2. **Given** una venta confirmada, **When** el backend responde con éxito, **Then** se muestra el resultado efectivo devuelto y se actualizan saldo, cantidad poseída, precio promedio, valor actual y PnL con el portfolio consultado de nuevo.
3. **Given** tenencia cero o una cantidad mayor que la tenencia visible, **When** se intenta vender, **Then** se indica que no hay tokens suficientes y no se envía la orden.
4. **Given** que otro cambio deja la tenencia insuficiente antes de ejecutar, **When** el backend rechaza la venta, **Then** se presenta el rechazo sin éxito ficticio y se puede actualizar el portfolio para revisar la posición vigente.
5. **Given** una venta de toda la posición, **When** se actualiza el portfolio, **Then** el jugador deja de figurar como posición y el perfil muestra cero tokens poseídos y sin precio promedio ni PnL de esa posición.

### Edge Cases

- **Cantidad inválida**: vacío, cero, negativo, decimal, texto o número fuera del rango aceptado muestra un error junto al campo y no permite confirmar ni enviar.
- **Cotización inexistente**: se informa explícitamente; comprar y vender quedan indisponibles hasta que exista una cotización vigente. El saldo y la posición disponibles siguen visibles.
- **Cotización cambiante**: la confirmación muestra un total orientativo calculado con la cotización visible; el resultado informa el precio y total reales de la respuesta. No se promete que ambos coincidan.
- **Saldos o tenencias cambiantes**: una validación local no garantiza la operación; un rechazo del backend prevalece y nunca se muestra éxito por haber superado la validación de interfaz.
- **Sesión ausente o vencida**: se utiliza el flujo de autenticación existente; se retiran datos financieros protegidos y no se deja confirmar una orden.
- **Rol SUPERUSER**: puede consultar la cotización y los datos que autorice el backend, pero no puede comprar ni vender; la interfaz no ofrece controles operativos para este rol y distingue un rechazo por rol si ocurre.
- **Error inesperado o de red durante una orden**: se muestra un resultado indeterminado y una acción para volver a consultar el portfolio antes de decidir un nuevo intento; no se asume éxito ni fracaso de la operación.
- **Operación exitosa seguida de error al refrescar portfolio**: se conserva el comprobante de éxito, se indica que el portfolio no pudo actualizarse y se ofrece reintentar la consulta; no se presentan saldos antiguos como actuales.
- **Cambio de jugador o usuario con solicitudes pendientes**: respuestas tardías no modifican el perfil ni revelan la posición del contexto anterior; un resultado de operación ya confirmada debe seguir siendo comprensible para el jugador al que pertenece.
- **Doble interacción**: confirmar repetidamente, hacer doble clic o activar la acción por teclado durante el envío no produce dos solicitudes desde la misma interacción.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La experiencia DEBE integrarse al perfil existente del jugador y presentar la cotización vigente provista por la consulta de cotizaciones ya disponible, con su unidad en créditos por token y sin recalcular cuál registro es vigente.
- **FR-002**: La vista DEBE consultar el portfolio de la persona autenticada y mostrar en el perfil únicamente el saldo y la posición cuyo jugador coincide con el perfil abierto; las demás posiciones NO DEBEN mostrarse en ese perfil.
- **FR-003**: La interfaz NO DEBE pedir, permitir elegir ni enviar manualmente un `userId`; la identidad para consultar y operar DEBE provenir exclusivamente de la sesión/JWT existente.
- **FR-004**: La vista DEBE mostrar el saldo disponible y, para la posición del jugador, cantidad, precio promedio de compra, cotización actual, valor actual y PnL no realizado conforme a los datos recibidos. DEBE distinguir valores cero, negativos y ausentes.
- **FR-005**: El portfolio vacío DEBE tener un estado específico. La ausencia de posición para el jugador DEBE mostrar tenencia cero sin crear una posición o métricas ficticias.
- **FR-006**: La entrada de cantidad DEBE aceptar únicamente tokens enteros positivos y ofrecer un mensaje asociado al control para valores vacíos, decimales, no numéricos, negativos, cero o fuera del rango admitido.
- **FR-007**: La interfaz DEBE impedir avanzar a compra si el costo orientativo de la cantidad supera el saldo visible, y a venta si la cantidad supera la tenencia visible; las decisiones finales de saldo, disponibilidad y ejecución siguen perteneciendo al backend.
- **FR-008**: Comprar y vender DEBEN estar indisponibles si no existe cotización vigente. La ausencia DEBE mostrarse como falta de cotización, no como precio cero.
- **FR-009**: Antes de enviar una orden, la interfaz DEBE pedir confirmación explícita e identificar jugador, tipo, cantidad, cotización visible y total orientativo; cancelar NO DEBE enviar la orden.
- **FR-010**: La compra DEBE usar `POST /api/orders/buy` y la venta `POST /api/orders/sell`, enviando solo `playerId` del perfil y `quantity` entera positiva con la autenticación existente. No DEBE introducir operaciones ni campos adicionales.
- **FR-011**: Durante el envío DEBE mostrarse progreso y evitarse otro envío desde la misma interacción; ante éxito DEBE mostrarse el tipo de operación, cantidad, precio ejecutado y total de la respuesta, sin sustituirlos por el cálculo orientativo previo.
- **FR-012**: Tras una respuesta exitosa de compra o venta, la interfaz DEBE consultar de nuevo `GET /api/portfolio` y actualizar los datos visibles de saldo y posición. Hasta obtener datos vigentes, DEBE señalar que la actualización está pendiente y evitar presentar cifras previas como actuales.
- **FR-013**: La carga, éxito con datos, portfolio vacío y error de portfolio DEBEN ser estados distinguibles. Un error de portfolio DEBE ofrecer reintento sin ocultar la cotización válida.
- **FR-014**: La cantidad inválida, saldo insuficiente, tokens insuficientes, falta de cotización, error de autenticación y error inesperado del backend DEBEN tener mensajes diferenciados y acciones de recuperación apropiadas al estado.
- **FR-015**: Una respuesta de rechazo de orden NO DEBE mostrarse como operación exitosa; la interfaz DEBE preservar la cantidad para corrección y permitir actualizar saldo y tenencia antes de un nuevo intento.
- **FR-016**: Ante un error de red o servidor sin confirmación de ejecución, la interfaz NO DEBE afirmar que la orden se completó o que no se ejecutó; DEBE permitir consultar el portfolio vigente antes de repetirla.
- **FR-017**: La ausencia o caducidad de sesión DEBE activar el flujo de autenticación existente, retirar datos financieros protegidos e impedir operaciones hasta recuperar una sesión válida.
- **FR-018**: Los datos y respuestas tardíos de un jugador, sesión o intento anterior NO DEBEN reemplazar los datos del contexto actual.
- **FR-019**: Cantidad, selección de operación, confirmación, cancelación, reintento y resultado DEBEN ser utilizables por teclado, con etiquetas, foco visible, orden lógico, errores asociados al campo y anuncios perceptibles de carga y resultado. La confirmación DEBE recibir y devolver el foco de forma coherente.
- **FR-020**: La sección DEBE mantener el estilo y navegación del perfil existente y ser utilizable sin pérdida de información ni controles en anchos de 360 y 1280 píxeles.
- **FR-021**: El alcance DEBE limitarse a presentación, interacción, validación de interfaz y consumo de contratos existentes; no DEBE cambiar reglas de negocio, endpoints, modelos persistidos ni incorporar las operaciones excluidas en esta especificación.
- **FR-022**: Solo el rol INVESTOR DEBE disponer de controles para comprar y vender. SUPERUSER NO DEBE poder iniciar una orden desde la interfaz, conforme a la restricción existente del backend.

### Key Entities *(include if feature involves data)*

- **Jugador**: Perfil abierto e identificador usado para consultar cotización y enviar una orden.
- **Cotización vigente**: Valor persistido recibido de la consulta de cotizaciones existente, expresado en créditos por token; sirve de referencia visible, no de garantía de precio de ejecución.
- **Portfolio**: Saldo en créditos y conjunto de posiciones del usuario autenticado.
- **Posición**: Tenencia de un jugador con cantidad y precio promedio; valor actual y PnL pueden no estar disponibles.
- **Resultado de operación**: Respuesta de compra o venta con tipo, cantidad, precio ejecutado, total y saldo/tenencia resultantes; representa el comprobante visible de una operación confirmada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los escenarios de consulta con datos disponibles, el perfil muestra saldo y los cinco datos de posición requeridos para el jugador correcto, sin mostrar otras posiciones; los datos ausentes se distinguen de cero.
- **SC-002**: El 100% de los casos de cantidad vacía, decimal, no numérica, cero, negativa o superior a saldo/tenencia visible muestran un motivo comprensible antes de enviar una orden.
- **SC-003**: En el 100% de las compras y ventas exitosas verificadas, el usuario ve precio y total efectivamente ejecutados y, tras actualizar el portfolio, saldo y posición coinciden con la nueva consulta.
- **SC-004**: En el 100% de las cancelaciones de confirmación y activaciones repetidas durante un envío se observa cero órdenes por cancelación y una única solicitud por envío confirmado.
- **SC-005**: Todos los estados previstos —carga, portfolio vacío, cotización inexistente, cantidad inválida, saldo o tokens insuficientes, sesión inválida y error inesperado— se distinguen en pruebas de aceptación y ofrecen la recuperación indicada.
- **SC-006**: Los recorridos de compra, venta, cancelación, error y reintento pueden completarse con teclado y a 360 y 1280 píxeles sin controles inaccesibles ni pérdida de datos relevantes.
- **SC-007**: En el 100% de los escenarios con rol SUPERUSER, no se ofrece iniciar compras o ventas desde el perfil; las acciones operativas permanecen disponibles para INVESTOR con sesión válida.

## Assumptions

- La integración reutiliza el perfil y la consulta de cotizaciones de la feature 008, junto con la autenticación vigente. El backend rechaza órdenes de SUPERUSER porque es la cuenta del pool central; los controles operativos se destinan a INVESTOR. La interfaz no crea permisos nuevos.
- `GET /api/portfolio` devuelve `creditBalance` e `items`; cada posición incluye `playerId`, `quantity`, `averagePurchasePrice`, `currentQuoteValue`, `currentValue` y `unrealizedPnl`. Los últimos tres pueden ser nulos. La vista no recalcula valor actual ni PnL.
- `POST /api/orders/buy` y `POST /api/orders/sell` aceptan `playerId` y `quantity`, y devuelven `operation`, `account` y `holding`. El precio y total del comprobante provienen de `operation`; la vista no deriva la identidad a partir del campo `userId` de la respuesta.
- La validación previa de saldo utiliza cantidad por cotización visible solo como orientación para la interfaz. La ejecución puede usar una cotización o disponibilidad más reciente; el rechazo o resultado del backend tiene prioridad.
- El backend puede responder con errores de petición, autenticación, recurso ausente, conflicto y error inesperado. Los conflictos se explican según el motivo comunicado; si no puede identificarse con certeza, se muestra un rechazo genérico y se ofrece actualizar los datos, sin atribuirlo erróneamente a saldo o tenencia.
- No se requiere actualización en tiempo real, recuperación automática de órdenes inciertas ni un historial de operaciones. La comprobación visible de una orden incierta consiste en volver a consultar el portfolio, sin afirmar que esa consulta determina por sí sola si la orden se ejecutó.
