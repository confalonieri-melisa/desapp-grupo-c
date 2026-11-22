# Feature Specification: Mercado P2P de Tokens de Jugadores — Backend

**Feature Branch**: `feature/015-player-peer-market-backend`

**Integration Base Branch**: `main`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "El alcance de este ciclo es exclusivamente backend. Mantener la compra inicial al pool central y agregar ofertas P2P de venta con cantidad fija, precio capturado, reserva, compra completa, cancelación, idempotencia y garantías de concurrencia, reutilizando autenticación JWT, token_holdings, market_operations, auditoría y portfolio."

## Alcance y objetivo

Esta feature agrega al backend un mercado P2P mínimo y demostrable sobre la
implementación financiera existente.

El mercado primario se conserva: `POST /api/orders/buy` continúa comprando al
pool central mientras el pool tenga tokens disponibles. El `SUPERUSER` no
participa como comprador ni vendedor P2P y no se permite venderle a él.

El mercado P2P permite que un inversor publique una oferta de venta de una
cantidad fija de tokens de un jugador, capturando la cotización vigente como
precio fijo. La publicación reserva esos tokens; otro inversor compra la
oferta completa o el vendedor la cancela mientras siga abierta.

Quedan fuera de este MVP: órdenes de compra abiertas, matching automático,
compras parciales, vencimientos, scheduler, comisiones, subastas, formación
avanzada de precios, APIs externas y cambios de frontend.

## Clarifications

### Session 2026-11-21

- Q: ¿La reserva debe descontarse de la tenencia visible del vendedor o mantenerse como una reserva separada que reduzca únicamente su cantidad disponible? → A: Mantener la reserva separada; `token_holdings.quantity` representa la tenencia total y la disponibilidad se calcula restando las reservas abiertas.
- Q: ¿Debe esta feature incluir una consulta `GET /api/p2p/offers` para descubrir ofertas abiertas, y cuál debe ser su alcance? → A: Sí; listar únicamente ofertas `OPEN`, con filtro opcional por `playerId`, sin historial ni filtros avanzados.
- Q: ¿Cómo debe comportarse una repetición con la misma `Idempotency-Key` cuando coincide el usuario, el método, la ruta y el payload normalizado? → A: La huella incluye usuario, método, ruta y payload; una repetición idéntica espera si la primera está en curso y luego reproduce exactamente el mismo código y cuerpo.
- Q: ¿Qué respuesta debe usar el backend cuando un fallo transitorio impide confirmar una operación financiera después de agotar los reintentos internos permitidos? → A: `409` solo para conflictos de negocio; deadlock o serialization failure agotado responde `503`; timeout o error de red posterior al envío queda como resultado incierto y se repite la misma clave.
- Q: ¿Qué política de redondeo debe aplicarse al precio capturado y al total de una oferta? → A: Precio y total con dos decimales; `total = unitPrice × quantity` con aritmética decimal exacta y sin redondeos adicionales.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Comprar tokens al pool central (Priority: P1)

Como inversor autenticado, quiero continuar comprando tokens al pool central
para obtener la asignación primaria disponible del jugador.

**Why this priority**: Mantiene el comportamiento financiero ya validado y
garantiza que el nuevo mercado no sustituya la puerta de entrada primaria.

**Independent Test**: Con tokens disponibles en el pool, un inversor ejecuta
`POST /api/orders/buy` y verifica la transferencia, la operación, la
auditoría y el portfolio resultante.

**Acceptance Scenarios**:

1. **Given** un inversor autenticado y tokens disponibles en el pool, **When**
   compra una cantidad válida, **Then** recibe los tokens a la cotización
   vigente y se actualizan saldo, tenencia, operación, auditoría y portfolio.
2. **Given** el pool sin tokens suficientes, **When** el inversor intenta
   comprar, **Then** recibe `409` y no cambia ningún saldo, tenencia,
   operación ni auditoría.
3. **Given** un usuario con rol `SUPERUSER`, **When** intenta comprar por el
   endpoint del pool, **Then** la operación es rechazada y no se genera una
   venta del pool al propio `SUPERUSER`.

### User Story 2 - Publicar una oferta P2P (Priority: P1)

Como inversor autenticado, quiero publicar una oferta de venta de una cantidad
fija de tokens a la cotización vigente para reservarlos y ponerlos a
disposición de otro inversor.

**Why this priority**: Es la capacidad que crea liquidez P2P y el núcleo del
MVP.

**Independent Test**: Con una tenencia suficiente, el vendedor publica una
oferta y verifica que queda abierta, conserva el precio capturado y que sus
tokens disponibles disminuyen sin quedar negativos.

**Acceptance Scenarios**:

1. **Given** un inversor autenticado con tokens suficientes, **When** publica
   `playerId` y `quantity`, **Then** el backend captura la cotización vigente,
   reserva la cantidad completa y devuelve una oferta `OPEN`.
2. **Given** una cantidad mayor a la tenencia disponible, **When** publica la
   oferta, **Then** recibe `409` y no se crea la oferta ni una reserva parcial.
3. **Given** que no existe cotización vigente o el jugador no existe, **When**
   publica la oferta, **Then** recibe `404` y no cambia la tenencia.
4. **Given** un `SUPERUSER`, **When** intenta publicar una oferta, **Then** el
   backend responde `403` y no crea una oferta.

### User Story 3 - Comprar una oferta P2P completa (Priority: P1)

Como inversor autenticado, quiero aceptar una oferta abierta completa para
transferir créditos al vendedor y tokens a mi tenencia al precio publicado.

**Why this priority**: Completa el intercambio entre inversores y demuestra el
valor principal del mercado P2P.

**Independent Test**: Con una oferta abierta y un comprador distinto con saldo
de créditos suficiente, aceptar la oferta y verificar ambas tenencias, ambos
saldos, la operación, la auditoría y el portfolio de las partes.

**Acceptance Scenarios**:

1. **Given** una oferta abierta y un comprador inversor distinto con saldo
   suficiente, **When** acepta la oferta, **Then** la oferta pasa a `SOLD`, se
   transfieren todos los tokens reservados al comprador y el total fijo de
   créditos al vendedor.
2. **Given** que el comprador no tiene créditos suficientes, **When** acepta
   la oferta, **Then** recibe `409` y la oferta y las posiciones permanecen
   sin cambios.
3. **Given** que el vendedor intenta aceptar su propia oferta, **When** la
   acepta, **Then** recibe `409` y no se transfiere nada.
4. **Given** una oferta `SOLD` o `CANCELLED`, **When** otro inversor intenta
   aceptarla, **Then** recibe `409` y no se crean efectos duplicados.

### User Story 4 - Cancelar una oferta abierta (Priority: P1)

Como vendedor, quiero cancelar mi oferta abierta para liberar los tokens
reservados cuando todavía no fue comprada.

**Why this priority**: Permite recuperar el control de la reserva sin
introducir vencimientos ni procesos automáticos.

**Independent Test**: El vendedor cancela una oferta abierta y verifica que la
oferta queda `CANCELLED` y que la cantidad reservada vuelve a estar disponible.

**Acceptance Scenarios**:

1. **Given** una oferta abierta del vendedor autenticado, **When** la cancela,
   **Then** se libera la reserva dentro de la misma transacción y se devuelve
   `200` con estado `CANCELLED`.
2. **Given** una oferta de otro vendedor, **When** el usuario intenta
   cancelarla, **Then** recibe `403` y la oferta no cambia.
3. **Given** una oferta ya comprada o cancelada, **When** se intenta cancelar,
   **Then** recibe `409` y no se libera dos veces la reserva.

### User Story 5 - Reintentar con seguridad (Priority: P1)

Como cliente del backend, quiero repetir una solicitud mutante con la misma
clave de idempotencia para obtener el mismo resultado sin duplicar efectos
cuando un timeout deja el resultado incierto.

**Why this priority**: Las operaciones financieras no pueden duplicarse por
reintentos del cliente.

**Independent Test**: Ejecutar dos veces cada operación mutante con la misma
clave y payload, y luego con la misma clave y otro payload, verificando
respectivamente resultado idéntico y `409`.

**Acceptance Scenarios**:

1. **Given** una operación mutante completada con `Idempotency-Key: K`, **When**
   se repite `K` con el mismo usuario y payload, **Then** el backend devuelve
   el mismo código y cuerpo lógico sin crear efectos adicionales.
2. **Given** una clave `K` usada por un usuario, **When** otro usuario intenta
   reutilizarla, **Then** su solicitud se procesa de forma independiente según
   su autenticación y no obtiene el resultado ajeno.
3. **Given** una clave `K` usada con un payload, **When** se repite con otro
   payload, **Then** responde `409` sin modificar el estado financiero.

### Edge Cases

- Dos compras concurrentes de la misma oferta solo pueden producir una compra
  exitosa; la otra recibe `409`.
- Una compra concurrente con una cancelación solo puede ganar una transición;
  la operación perdedora recibe `409` y no modifica reservas.
- Dos publicaciones concurrentes sobre la misma tenencia no pueden reservar
  más tokens que los disponibles.
- Una cantidad cero, negativa, fraccionaria, no entera o con formato inválido
  responde `400`.
- Una cotización cambia después de publicar: la aceptación usa el precio
  capturado en la oferta, no el vigente al momento de comprar.
- Nunca deben existir saldos o tenencias negativos ni doble reserva.
- La suma de tenencias del pool, reservas y usuarios por jugador debe ser
  exactamente 100 en todo estado confirmado.
- Un timeout o error de red posterior al envío se considera resultado incierto;
  el cliente debe repetir con la misma clave, sin reintento financiero
  automático del servidor.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE mantener `POST /api/orders/buy` como compra al
  pool central y permitirla mientras existan tokens disponibles, usando la
  autenticación y reglas financieras existentes.
- **FR-002**: El sistema DEBE impedir que `SUPERUSER` compre o publique ofertas
  P2P y DEBE impedir cualquier venta de un inversor al `SUPERUSER`.
- **FR-003**: El sistema DEBE permitir que un inversor autenticado publique
  una oferta indicando exactamente `playerId` y `quantity` positiva entera.
- **FR-004**: Al publicar, el sistema DEBE capturar la cotización vigente del
  jugador con dos decimales y conservarla como `unitPrice` fijo de la oferta.
  DEBE calcular `total = unitPrice × quantity` con aritmética decimal exacta,
  sin redondeos adicionales.
- **FR-005**: La publicación DEBE reservar la cantidad completa en una única
  operación atómica; la reserva DEBE mantenerse separada de la tenencia total
  en `token_holdings`, la disponibilidad DEBE ser la tenencia total menos las
  reservas abiertas, y la reserva no puede superar esa disponibilidad.
- **FR-006**: Una oferta DEBE tener una cantidad fija y solo puede comprarse
  completa; no se aceptan cantidades en la aceptación ni compras parciales.
- **FR-007**: El sistema DEBE permitir que otro inversor autenticado acepte
  una oferta `OPEN`, transfiriendo el total fijo de créditos al vendedor y la
  cantidad completa de tokens al comprador.
- **FR-008**: El vendedor NO DEBE poder comprar su propia oferta.
- **FR-009**: La aceptación DEBE cambiar la oferta a `SOLD`, consumir su
  reserva y actualizar saldos, tenencias, operación y auditoría en una única
  transacción; ante cualquier error, todo DEBE revertirse.
- **FR-010**: El vendedor DEBE poder cancelar una oferta `OPEN`; la
  cancelación DEBE liberar la reserva atómicamente y cambiarla a `CANCELLED`.
- **FR-011**: Solo el vendedor puede cancelar su oferta y solo una oferta
  `OPEN` puede cancelarse.
- **FR-012**: Las transiciones `OPEN` a `SOLD` o `CANCELLED` DEBEN ser
  mutuamente excluyentes bajo concurrencia; como máximo una solicitud puede
  ganar.
- **FR-013**: La publicación DEBE serializarse con operaciones sobre la
  tenencia del vendedor para impedir doble reserva, saldos negativos y
  tenencias negativas.
- **FR-014**: El sistema DEBE preservar una emisión total de exactamente 100
  tokens por jugador, considerando pool, reservas y tenencias de usuarios.
- **FR-015**: Cada aceptación P2P exitosa DEBE registrar en
  `market_operations` el hecho financiero usando el tipo de operación
  existente (`SELL` para la venta del vendedor), conservando vendedor,
  comprador, jugador, cantidad, cotización capturada, total y fecha, y DEBE
  crear auditoría inmutable con snapshots anteriores y posteriores. Si el
  modelo existente no representa la contraparte, debe extenderse únicamente
  para este dato, sin introducir un tipo de operación financiero alternativo.
- **FR-016**: La publicación y cancelación DEBEN registrar auditoría de la
  reserva/liberación; la publicación no debe crear una transferencia de
  créditos ni una operación comercial completada.
- **FR-017**: Toda operación mutante iniciada por el frontend DEBE requerir
  `Idempotency-Key` en `POST /api/orders/buy`, publicación, aceptación y
  cancelación.
- **FR-018**: La idempotencia DEBE estar vinculada al usuario autenticado y a
  los datos relevantes de cada operación; una misma clave con los mismos datos
  DEBE esperar si la primera solicitud sigue en curso y luego devolver la misma
  respuesta sin duplicar efectos; una diferencia en esos datos DEBE responder
  `409`.
- **FR-019**: Las solicitudes sin clave, con clave vacía o con formato fuera
  del contrato DEBEN responder `400` antes de mutar el estado.
- **FR-020**: El backend NO DEBE reintentar automáticamente errores de negocio
  ni llamadas a APIs externas. Ante deadlock o serialization failure de
  PostgreSQL, puede hacer un único retry adicional con una espera breve;
  agotado ese retry, DEBE responder `503` sin efectos parciales.
- **FR-021**: Un timeout o error de red posterior al envío DEBE tratarse como
  resultado incierto y la repetición con la misma clave DEBE ser segura. Los
  conflictos de negocio DEBEN responder `409`; deadlock o serialization
  failure agotado DEBE responder `503` sin efectos parciales.
- **FR-022**: Los endpoints DEBEN reutilizar JWT, portfolio, `token_holdings`,
  `market_operations` y auditoría existentes, sin cambios en componentes,
  hooks ni servicios del frontend.
- **FR-023**: Los contratos, estados exitosos y errores DEBEN documentarse en
  OpenAPI/Swagger y las colecciones de prueba backend aplicables.
- **FR-024**: El sistema DEBE exponer `GET /api/p2p/offers` para listar
  únicamente ofertas con estado `OPEN`; DEBE aceptar como único filtro
  opcional `playerId` y NO DEBE exponer en este endpoint ofertas `SOLD` o
  `CANCELLED`, historial de ofertas ni filtros avanzados.

## Contrato HTTP

Todos los endpoints mutantes requieren:

```http
Authorization: Bearer <jwt>
Idempotency-Key: <clave-no-vacia>
Content-Type: application/json
```

La clave se considera una cadena opaca de 1 a 255 caracteres. La huella de
idempotencia se forma con el usuario autenticado, método HTTP, ruta y payload
JSON normalizado según el contrato. Una repetición con la misma clave y huella
que encuentre la operación en curso debe esperar su finalización y reproducir
el mismo código y cuerpo; la misma clave con cualquier huella distinta debe
responder `409`.

### `POST /api/orders/buy`

Mantiene el contrato existente de compra al pool. El body mínimo es:

```json
{ "playerId": "uuid", "quantity": 3 }
```

Respuestas: `201` operación exitosa; `400` body, cantidad o clave inválida;
`401` JWT ausente o inválido; `403` rol no permitido; `404` jugador o
cotización inexistente; `409` pool o saldo insuficiente, o conflicto de
idempotencia; `503` agotamiento de reintentos transaccionales; `500` error
inesperado sin detalles internos.

### `POST /api/p2p/offers`

Publica una oferta y devuelve:

```json
{
  "id": "uuid",
  "sellerId": "uuid",
  "playerId": "uuid",
  "quantity": 3,
  "unitPrice": 82.5,
  "total": 247.5,
  "status": "OPEN",
  "quoteId": "uuid",
  "createdAt": "2026-11-21T15:00:00.000Z"
}
```

Respuestas: `201`, `400`, `401`, `403`, `404`, `409`, `503` y `500` según
las reglas anteriores.

### `GET /api/p2p/offers?playerId={uuid}`

Requiere JWT de un inversor autenticado y devuelve una colección de ofertas
`OPEN`. El filtro `playerId` es opcional; no se aceptan otros parámetros en
este MVP.

Respuesta `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "sellerId": "uuid",
      "playerId": "uuid",
      "quantity": 3,
      "unitPrice": 82.5,
      "total": 247.5,
      "status": "OPEN",
      "quoteId": "uuid",
      "createdAt": "2026-11-21T15:00:00.000Z"
    }
  ]
}
```

Si no existen ofertas, responde `200` con `items: []`. Responde `400` ante
`playerId` inválido o parámetros no permitidos, `401` ante JWT ausente o
inválido y `500` ante un error inesperado sin exponer detalles internos.

### `POST /api/p2p/offers/{offerId}/purchase`

No recibe cantidad: siempre compra la oferta completa. Devuelve la oferta en
estado `SOLD`, la operación registrada y los saldos/tenencias posteriores del
comprador y del vendedor según el contrato financiero existente.

Respuestas: `200`, `400` identificador o clave inválidos; `401`, `403`, `404`
oferta inexistente; `409` oferta no abierta, propia, saldo insuficiente o
conflicto de idempotencia; `503`; `500`.

### `POST /api/p2p/offers/{offerId}/cancel`

No recibe body de negocio. Devuelve la oferta en estado `CANCELLED` y la
tenencia posterior del vendedor.

Respuestas: `200`, `400`, `401`, `403` si no es el vendedor, `404`, `409` si
no está abierta o hay conflicto de idempotencia, `503` y `500`.

En todos los errores el backend DEBE devolver un cuerpo de error estable con
`code`, `message` y `correlationId`, sin credenciales, SQL, snapshots de
terceros ni detalles internos.

## Key Entities

- **P2POffer**: oferta persistida e inmutable en sus datos económicos, con
  `id`, `sellerId`, `playerId`, `quantity`, `reservedQuantity`, `quoteId`,
  `unitPrice`, `total`, `status` (`OPEN`, `SOLD`, `CANCELLED`), `buyerId`
  nullable, `createdAt` y `closedAt` nullable.
- **OfferReservation**: reserva separada de los tokens del vendedor. No es una
  emisión adicional ni reduce `token_holdings.quantity`; forma parte de la
  cantidad que el vendedor no puede volver a comprometer mientras la oferta
  está abierta. La disponibilidad se calcula como tenencia total menos
  reservas abiertas.
- **IdempotencyRecord**: registro asociado a usuario, clave, operación,
  método, ruta, huella del payload, estado en curso/finalizado, código y
  respuesta final, para serializar y repetir de forma segura solicitudes
  mutantes.
- **MarketOperation**: registro existente append-only extendido solo para
  identificar la venta P2P, sus dos participantes, precio capturado, total y
  cantidad, manteniendo los tipos financieros existentes.
- **FinancialAuditRecord**: registro existente append-only con actor,
  correlación y snapshots de saldos, tenencias y reserva antes/después.
- **TokenHolding, User, PlayerQuote**: entidades existentes reutilizadas como
  fuentes de verdad de tenencias, saldos y cotizaciones.

## Reglas de consistencia y persistencia

- `users.credit_balance` es la fuente de verdad de créditos y
  `token_holdings` la fuente de verdad de la tenencia total. Las reservas
  abiertas se contabilizan por separado y la disponibilidad se calcula como
  tenencia total menos reservas, para impedir que una misma cantidad se
  publique dos veces.
- La suma de tokens disponibles, reservados y transferidos entre pool e
  inversores por jugador es siempre 100; las reservas no crean tokens.
- El precio y total de una oferta son snapshots capturados al publicarla y no
  se recalculan al comprarla. El precio y el total tienen dos decimales y el
  total se obtiene mediante multiplicación decimal exacta por la cantidad
  entera.
- La aceptación y la cancelación deben competir por la misma oferta y solo
  una transición terminal puede confirmarse.
- Los registros de operación y auditoría solo se consideran exitosos si la
  transacción financiera completa se confirma.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de las compras P2P exitosas transfiere exactamente la
  cantidad publicada y el total calculado con el precio capturado.
- **SC-002**: El 100% de las operaciones exitosas actualiza todos los saldos,
  tenencias, estado de oferta, operación e informe de auditoría como un único
  resultado atómico.
- **SC-003**: En una prueba con dos solicitudes concurrentes sobre la misma
  oferta, exactamente una compra obtiene éxito y la otra deja el estado sin
  efectos duplicados.
- **SC-004**: En una prueba con publicaciones concurrentes que suman más que
  la tenencia disponible, la cantidad reservada confirmada nunca supera esa
  tenencia y ninguna tenencia queda negativa.
- **SC-005**: En el 100% de las pruebas de carrera compra/cancelación, la
  oferta termina una sola vez en `SOLD` o `CANCELLED`, con una única auditoría
  de transición terminal.
- **SC-006**: El 100% de los jugadores conserva exactamente 100 tokens al
  finalizar cada escenario confirmado de compra, publicación, compra P2P o
  cancelación.
- **SC-007**: El 100% de los reintentos con la misma clave y payload devuelve
  el mismo resultado lógico y no incrementa la cantidad de operaciones,
  auditorías ni reservas.
- **SC-008**: El 100% de las reutilizaciones de una clave con payload distinto
  responde `409` y deja sin cambios el estado financiero.
- **SC-009**: Los tests backend cubren mercado primario, publicación,
  aceptación completa, cancelación, autorización, errores, rollback,
  idempotencia y las carreras de concurrencia indicadas.
- **SC-010**: Ningún cambio de esta feature modifica componentes, hooks o
  servicios del frontend; el contrato backend queda documentado para su
  implementación posterior por otro ciclo.

## Assumptions

- La autenticación JWT existente identifica al usuario y su rol; solo los
  inversores pueden actuar en P2P.
- Existe un único `SUPERUSER` que representa el pool central y el modelo de
  emisión inicial de cada jugador es de 100 tokens.
- La cotización vigente ya está persistida y disponible sin consultar APIs
  externas durante la operación.
- Los importes monetarios se capturan y serializan con dos decimales; el total
  se calcula con aritmética decimal exacta como precio por cantidad, sin
  redondeos adicionales.
- La disponibilidad del vendedor se interpreta como `token_holdings.quantity`
  menos cantidades comprometidas en ofertas abiertas; la tenencia total no se
  modifica al publicar una oferta.
- `market_operations`, auditoría y portfolio se amplían solo cuando sea
  necesario para representar la contraparte P2P, manteniendo sus contratos
  existentes.
- Los nombres de endpoints P2P definidos aquí son el contrato backend del
  MVP; la UI consumidora se desarrollará en otra feature.

## Out of Scope

- Frontend: componentes, hooks, servicios, pantallas, estilos o contratos de
  UI ejecutables.
- Órdenes de compra abiertas, matching automático, order book o subastas.
- Compras parciales, modificaciones de ofertas, vencimientos o scheduler.
- Comisiones, impuestos, límites, depósitos, retiros o APIs externas.
- Repricing, formación avanzada de precios, negociación y negociación entre
  múltiples pools.
- Reintentos ante APIs externas.
