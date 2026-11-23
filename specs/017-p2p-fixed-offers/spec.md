# Feature Specification: Ofertas P2P a Precio Fijo

**Feature Branch**: `feature/017-p2p-fixed-offers`

**Created**: 2026-11-23

**Status**: Draft

**Input**: Convertir el análisis del MVP de compra-venta P2P en una especificación, manteniendo el alcance mínimo y sin alterar innecesariamente el mercado central existente.

## Contexto y alcance MVP

La aplicación ya permite comprar y vender tokens contra una contraparte central, consultar el portfolio, consultar el historial y ejecutar órdenes idempotentes. Esta feature agrega una modalidad P2P mínima entre inversores autenticados mediante ofertas de venta a precio fijo.

Una oferta representa una intención de vender una cantidad completa de tokens de un jugador a un precio definido por el vendedor. Otro inversor puede aceptar la oferta completa. La aceptación transfiere tokens y créditos entre ambos usuarios y registra la operación dentro de la misma transición financiera.

La feature debe convivir con la compra-venta contra el pool central sin modificar su comportamiento observable.

## Clarifications

### Session 2026-11-23

- Q: ¿Cómo debería aparecer una operación P2P en el historial existente? → A: Como una única operación con comprador y vendedor explícitos, visible para ambos usuarios.

La operación P2P representa un único hecho financiero. El comprador y el vendedor deben poder verla en sus respectivos historiales, sin duplicar el movimiento como dos operaciones independientes.

## User Scenarios & Testing

### User Story 1 - Publicar una oferta de venta (Priority: P1)

Como inversor autenticado, quiero publicar una oferta para vender tokens de un jugador a un precio fijo y hacerla visible a otros inversores.

**Why this priority**: Sin una oferta publicada no existe un mercado P2P demostrable.

**Independent Test**: Un inversor con una tenencia suficiente publica una oferta válida y otro usuario puede verla como disponible.

**Acceptance Scenarios**:

1. **Given** un inversor autenticado que posee al menos la cantidad indicada, **When** publica una oferta con jugador, cantidad entera positiva y precio positivo con hasta dos decimales, **Then** la oferta queda abierta y conserva esos datos.
2. **Given** un inversor que no posee suficientes tokens, **When** intenta publicar la oferta, **Then** la solicitud es rechazada y no se crea una oferta abierta.
3. **Given** una oferta creada, **When** se consulta el listado de ofertas, **Then** aparece únicamente como abierta, con jugador, cantidad, precio y vendedor identificables para completar la operación.

---

### User Story 2 - Comprar una oferta completa (Priority: P1)

Como inversor autenticado, quiero aceptar una oferta completa para comprar tokens directamente a otro inversor.

**Why this priority**: Es la operación que entrega el valor principal del MVP P2P.

**Independent Test**: Con una oferta abierta, un comprador con saldo suficiente la acepta y se comprueba la transferencia de créditos, tokens y el cierre de la oferta.

**Acceptance Scenarios**:

1. **Given** una oferta abierta y un comprador distinto del vendedor con saldo suficiente, **When** acepta la oferta, **Then** se debita al comprador el precio total, se acredita al vendedor, se transfieren exactamente los tokens y la oferta queda cerrada.
2. **Given** una oferta cuyo precio fue publicado antes de una actualización de cotización, **When** se acepta, **Then** se utiliza el precio fijo de la oferta y no se reemplaza por la cotización vigente.
3. **Given** dos compradores que intentan aceptar simultáneamente la misma oferta, **When** una aceptación se completa primero, **Then** solo una transferencia tiene éxito y la otra se rechaza sin cambios parciales.
4. **Given** una aceptación con una clave de idempotencia repetida y los mismos datos, **When** se reintenta, **Then** se devuelve el resultado original sin transferir nuevamente créditos ni tokens.
5. **Given** una clave de idempotencia ya utilizada para otra oferta o datos distintos, **When** se reutiliza, **Then** la solicitud se rechaza y no modifica el estado financiero.
6. **Given** una aceptación exitosa, **When** comprador o vendedor consulta su historial, **Then** ambos ven la misma operación P2P una sola vez, identificando a la contraparte y la oferta consumida.

---

### User Story 3 - Gestionar una oferta propia (Priority: P2)

Como vendedor, quiero consultar y cancelar mis ofertas abiertas para no dejar intenciones de venta que ya no deseo mantener.

**Why this priority**: La cancelación permite corregir una publicación sin introducir vencimientos automáticos ni procesos adicionales.

**Independent Test**: Un vendedor consulta sus ofertas, cancela una abierta y verifica que ya no puede ser aceptada.

**Acceptance Scenarios**:

1. **Given** una oferta abierta propia, **When** el vendedor la cancela, **Then** queda cancelada y deja de aparecer entre las ofertas disponibles.
2. **Given** una oferta de otro vendedor, **When** un usuario intenta cancelarla, **Then** la solicitud es rechazada y la oferta permanece sin cambios.
3. **Given** una oferta ya aceptada o cancelada, **When** alguien intenta aceptarla o cancelarla nuevamente, **Then** la solicitud es rechazada sin cambios financieros.

### Edge Cases

- La cantidad debe ser entera y positiva; no se aceptan fracciones, cero, negativos ni valores no numéricos.
- El precio debe ser positivo y tener como máximo dos decimales.
- El vendedor puede haber vendido sus tokens después de publicar la oferta; la aceptación debe volver a validar su tenencia y rechazarla sin movimientos parciales si ya no alcanza.
- El comprador puede no tener saldo suficiente al momento de aceptar, aunque lo haya tenido al consultar el listado.
- El comprador no puede aceptar su propia oferta.
- Un jugador inexistente o una oferta inexistente no deben producir transferencias.
- Los fallos de validación, saldo, tenencia, concurrencia o estado de oferta no deben crear operaciones financieras ni auditorías parciales.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE permitir que un inversor autenticado cree una oferta de venta indicando únicamente jugador, cantidad y precio fijo.
- **FR-002**: El sistema DEBE asociar la oferta al vendedor autenticado y NO DEBE confiar en un identificador de vendedor enviado por el cliente.
- **FR-003**: El sistema DEBE validar que el jugador exista, que la cantidad sea entera positiva y que el precio sea positivo con precisión monetaria de hasta dos decimales.
- **FR-004**: El sistema DEBE validar la tenencia actual del vendedor al crear la oferta, sin bloquear ni transferir sus tokens en ese momento.
- **FR-005**: El sistema DEBE permitir consultar ofertas abiertas y filtrar por jugador, sin incluir ofertas canceladas o completadas.
- **FR-006**: El sistema DEBE permitir aceptar únicamente la totalidad de una oferta abierta; no se implementan compras parciales.
- **FR-007**: Al aceptar una oferta, el sistema DEBE transferir créditos y tokens entre comprador y vendedor usando el precio fijo publicado.
- **FR-008**: La aceptación DEBE validar nuevamente la oferta, la identidad del comprador, el saldo del comprador y la tenencia del vendedor antes de transferir.
- **FR-009**: La aceptación DEBE ser atómica: saldo, tenencias, estado de oferta, operación e información de auditoría deben confirmarse juntas o no modificarse.
- **FR-010**: El sistema DEBE impedir que el vendedor acepte su propia oferta.
- **FR-011**: El sistema DEBE permitir que el vendedor cancele una oferta abierta propia.
- **FR-012**: Una oferta aceptada o cancelada NO DEBE poder volver a aceptarse ni cancelarse.
- **FR-013**: La aceptación DEBE soportar una clave de idempotencia. Una repetición válida DEBE devolver el recibo original y no duplicar la transferencia; una reutilización incompatible DEBE rechazarse.
- **FR-014**: Cada aceptación exitosa DEBE registrar comprador, vendedor, oferta, jugador, cantidad, precio aplicado, importe total, fecha y estados anterior y posterior necesarios para auditoría.
- **FR-015**: Cada aceptación exitosa DEBE generar un único registro de operación P2P, visible para el comprador y el vendedor, sin duplicar el hecho financiero como dos operaciones independientes.
- **FR-016**: El historial DEBE identificar explícitamente quién compró, quién vendió y qué oferta se consumió, manteniendo la operación visible para ambas partes.
- **FR-017**: El comportamiento de las operaciones existentes contra el pool central, su portfolio, historial y cotizaciones DEBE permanecer sin cambios funcionales no requeridos por esta feature.
- **FR-018**: Las rutas P2P DEBEN exigir autenticación y no deben permitir operar en nombre de otro usuario.
- **FR-019**: La creación o aceptación de una oferta P2P NO DEBE cambiar la cotización vigente ni depender de que se ejecute un recálculo de cotizaciones.

### Key Entities

- **Oferta P2P**: intención abierta de un vendedor de transferir una cantidad completa de tokens de un jugador a un precio fijo; tiene estado abierto, completado o cancelado.
- **Operación P2P**: único hecho financiero producido al aceptar una oferta, con comprador, vendedor, oferta, jugador, cantidad, precio e importe total; es visible para ambas partes.
- **Comprador y vendedor**: inversores autenticados cuyos saldos y tenencias se actualizan en sentidos opuestos.
- **Tenencia**: posición de tokens de un usuario para un jugador, cuya suma total debe conservar la emisión existente.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Un inversor puede publicar una oferta válida y otro inversor puede completarla mediante un flujo de aceptación completa sin intervención administrativa.
- **SC-002**: El 100% de las aceptaciones exitosas conserva la cantidad total de tokens emitidos para el jugador.
- **SC-003**: El 100% de las aceptaciones exitosas actualiza ambos saldos, ambas tenencias, el estado de la oferta, la operación y la auditoría como una única transición observable.
- **SC-004**: El 100% de los reintentos con una misma clave e iguales datos produce como máximo una transferencia y devuelve el mismo recibo original.
- **SC-005**: El 100% de los rechazos por saldo, tenencia, estado, identidad o concurrencia deja sin cambios los saldos, tenencias, ofertas, operaciones y auditorías.
- **SC-006**: Cada aceptación exitosa aparece una sola vez en el historial del comprador y una sola vez en el historial del vendedor, con la misma identidad de operación.
- **SC-007**: Las operaciones centrales existentes continúan funcionando con sus escenarios actuales después de habilitar el flujo P2P.
- **SC-008**: La especificación no requiere libro de órdenes, matching, compras parciales, escrow, comisiones, vencimientos automáticos ni medios de pago externos para completar el MVP.

## Out of Scope

- Libro de órdenes o matching automático.
- Compras parciales o múltiples compradores para una misma oferta.
- Reserva o escrow de tokens al publicar una oferta.
- Vencimiento automático de ofertas.
- Negociación, chat, reputación o calificación entre usuarios.
- Comisiones, impuestos, depósitos, retiros o pagos externos.
- Cambios al cálculo, publicación o estrategia de cotizaciones.
- Reemplazo del mercado central existente.

## Assumptions

- Solo los usuarios inversores pueden publicar, aceptar o cancelar ofertas P2P.
- La autenticación y el saldo existentes se reutilizan.
- La emisión total y las reglas de tenencia existentes siguen siendo la fuente de verdad.
- La oferta no reserva tokens al publicarse; por eso la tenencia se valida nuevamente al aceptar.
- Si una oferta queda sin tenencia suficiente, permanece abierta hasta que el vendedor la cancele o se rechace una aceptación; no se agrega limpieza automática en este MVP.
- El precio publicado es el precio definitivo de la operación y se conserva aunque cambie la cotización del jugador.
- La implementación se desarrollará desde `main` en una rama y PR independientes, sin modificar directamente `main`.
