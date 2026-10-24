# Feature Specification: Compra y Venta de Tokens de Jugadores

**Feature Branch**: `feature/005-player-token-trading`

**Created**: 2026-10-24

**Status**: Draft

**Input**: Implementar la compra y venta de tokens de jugadores utilizando la
cotización vigente, conservando la emisión fija, usando al superusuario o pool
central como contraparte inicial, y permitiendo consultar únicamente el
portfolio necesario para operar.

## Alcance MVP

Esta feature agrega operaciones inmediatas de compra y venta contra una única
contraparte central. Reutiliza el modelo existente de `token_holdings`, la
autenticación JWT y la cotización persistida consultada por
`player-quote-queries`.

- `BUY`: el inversor compra tokens al pool central a la cotización vigente.
- `SELL`: el inversor vende tokens al pool central a la cotización vigente.
- Cada jugador conserva exactamente 100 tokens emitidos entre el pool y todos
  los inversores.
- El usuario inversor se obtiene de la identidad autenticada en el JWT. El
  cliente no puede elegir el `userId` de la operación ni del portfolio.
- Cada operación se ejecuta inmediatamente, sin libro de órdenes, comisiones,
  límites diarios, órdenes pendientes, trading entre inversores ni historial
  paginado.
- Se incluye solo la lectura mínima de `GET /api/portfolio` para conocer las
  tenencias del usuario autenticado y validar o mostrar el resultado de una
  operación.

La cotización utilizada es la primera cotización devuelta por la consulta
existente de `player-quote-queries` para el jugador. La operación no recalcula,
crea ni modifica cotizaciones. Si no existe una cotización vigente, la
operación se rechaza.

## User Scenarios & Testing

### User Story 1 - Comprar tokens al pool central (Priority: P1)

Como usuario inversor autenticado, quiero comprar una cantidad de tokens de un
jugador a su cotización vigente para incorporarlos a mi portfolio.

**Independent Test**: Con un jugador cotizado, un inversor autenticado con
saldo suficiente y tokens disponibles en el pool, `POST /api/orders/buy`
transfiere los tokens y créditos en una sola transacción, conserva la emisión
total y devuelve el resultado de la operación.

**Acceptance Scenarios**:

1. **Given** un jugador con cotización vigente, un pool con tokens disponibles y
   un inversor autenticado con saldo suficiente, **When** solicita comprar una
   cantidad entera positiva, **Then** se debita `quantity * quoteValue` al
   inversor, se acredita ese importe al pool, se transfieren los tokens al
   inversor y se registra una operación `BUY` exitosa.
2. **Given** una tenencia existente del inversor para el jugador, **When** la
   compra se ejecuta, **Then** la cantidad aumenta y el precio promedio se
   actualiza mediante promedio ponderado:
   `(oldQuantity * oldAverage + quantity * quoteValue) /
   (oldQuantity + quantity)`.
3. **Given** una solicitud sin JWT válido o con un `userId` distinto en el
   body, **When** llega al endpoint, **Then** responde `401` si falta la
   autenticación o ignora/rechaza el identificador no confiable, sin operar en
   nombre de otro usuario.
4. **Given** cualquier error de validación, saldo, disponibilidad o cotización,
   **When** se procesa la compra, **Then** no cambia ningún saldo, tenencia ni
   registro de operación.

### User Story 2 - Vender tokens al pool central (Priority: P1)

Como usuario inversor autenticado, quiero vender tokens que poseo a la
cotización vigente para recibir créditos y reducir mi posición.

**Independent Test**: Con una tenencia suficiente, una cotización vigente y un
pool con saldo suficiente, `POST /api/orders/sell` transfiere tokens y
créditos atómicamente y devuelve el resultado.

**Acceptance Scenarios**:

1. **Given** un inversor autenticado que posee al menos la cantidad solicitada,
   **When** vende tokens, **Then** se debita la cantidad de su tenencia, se
   acredita `quantity * quoteValue` a su saldo, se transfieren los tokens al
   pool y se debita el mismo importe del pool.
2. **Given** que la venta deja la tenencia en cero, **When** la operación
   finaliza, **Then** la tenencia queda en cantidad `0` y el precio promedio se
   conserva como dato histórico de adquisición o se normaliza a `0`; el
   comportamiento elegido debe ser único y consistente. Para este MVP se
   normaliza a `0` al quedar en cero.
3. **Given** una cantidad mayor a la tenencia, saldo insuficiente del pool o
   ausencia de cotización vigente, **When** se solicita la venta, **Then** se
   rechaza sin modificar el estado financiero.

### User Story 3 - Consultar portfolio mínimo y resultado (Priority: P1)

Como usuario autenticado, quiero consultar mis tenencias y el resultado de
mis operaciones para verificar mi posición sin indicar un identificador de
usuario confiado por el cliente.

**Independent Test**: `GET /api/portfolio` devuelve exclusivamente las
posiciones del sujeto autenticado, con cantidad, precio promedio, cotización
vigente y valor actual; no puede consultar el portfolio de otro usuario.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con tenencias, **When** solicita
   `GET /api/portfolio`, **Then** responde sus posiciones no nulas con
   `quantity`, `averagePurchasePrice`, `currentQuoteValue`, `currentValue` y
   `unrealizedPnl`.
2. **Given** un usuario autenticado sin tenencias, **When** consulta su
   portfolio, **Then** responde `200` con `items: []` y su saldo actual.
3. **Given** una operación exitosa, **When** el endpoint de compra o venta
   responde, **Then** incluye el identificador inmutable de operación, tipo,
   jugador, cantidad, cotización capturada, total, saldo posterior y tenencia
   posterior; no es necesario consultar un historial adicional.

## Reglas de negocio

### Identidad y autorización

- Todas las rutas de mercado requieren `Authorization: Bearer <JWT>` válido.
- El actor inversor es `auth.userId`, resuelto por el middleware actual. El
  payload de compra/venta contiene únicamente `playerId` y `quantity`.
- Un inversor solo puede operar sobre su propia cuenta. El superusuario/pool
  no opera mediante estos endpoints.
- El pool central se identifica por el único usuario con rol `SUPERUSER`; no
  se acepta un identificador de pool enviado por el cliente ni se persiste en
  la operación, porque la contraparte es única en este MVP.

### Cantidad y dinero

- `playerId` debe ser un UUID de un jugador existente.
- `quantity` debe ser un entero positivo; no se aceptan cero, negativos,
  fracciones, `NaN`, infinito, strings ambiguos ni cantidades excesivas.
- El importe de la operación es `quantity * quoteValue`, con precisión de
  créditos de dos decimales. La persistencia y las comparaciones monetarias
  deben evitar errores de punto flotante.
- La cotización se captura una sola vez al inicio de la operación y se guarda
  en el registro. No se permite que una misma operación mezcle cotizaciones.

### Emisión y tenencias

- La emisión total por jugador es exactamente `100` tokens enteros.
- En todo momento debe cumplirse:
  `poolHolding.quantity + SUM(investorHolding.quantity) = 100`.
- La compra requiere que el pool tenga al menos `quantity` tokens.
- La venta requiere que el inversor tenga al menos `quantity` tokens.
- Si una tenencia no existe, se interpreta como cantidad `0` para validar; una
  compra crea la fila del inversor y una venta sin tenencia se rechaza.
- La compra actualiza el precio promedio con promedio ponderado. La venta no
  cambia el promedio mientras quede una cantidad positiva.
- El valor actual de una posición es `quantity * currentQuoteValue` y el PnL
  no realizado es `currentValue - quantity * averagePurchasePrice`.

### Créditos y contraparte

- En `BUY`, los créditos pasan del inversor al pool.
- En `SELL`, los créditos pasan del pool al inversor; el pool debe tener saldo
  suficiente.
- El saldo del inversor nunca puede quedar negativo. El saldo del pool tampoco.
- No hay creación ni destrucción de créditos en una operación: solo
  transferencia entre las dos cuentas.

### Atomicidad y concurrencia

- Validación final, lectura bloqueante de las cuentas/tenencias involucradas,
  actualización de saldos, actualización de tenencias, creación de la
  operación y creación de la auditoría deben ejecutarse dentro de una única
  transacción PostgreSQL.
- Si falla cualquier paso, la transacción completa hace rollback y no queda una
  operación o auditoría parcial.
- Las filas de usuario, pool y tenencias involucradas deben bloquearse de
  manera consistente durante la operación para evitar doble gasto o doble
  transferencia concurrente.
- La cotización puede cambiar en otra operación, pero cada operación usa la
  cotización que capturó dentro de su propia transacción.

## API Contract

Todas las rutas se publican bajo el prefijo `/api`.

### `POST /api/orders/buy`

Request:

```json
{
  "playerId": "uuid",
  "quantity": 3
}
```

### `POST /api/orders/sell`

Request:

```json
{
  "playerId": "uuid",
  "quantity": 2
}
```

No se acepta `userId`, `poolUserId`, `quoteValue`, `total` ni `averagePrice`
en el request. `poolUserId` se menciona únicamente para dejar explícito que no
forma parte del contrato.

Respuesta `201` para una operación exitosa:

```json
{
  "operation": {
    "id": "uuid",
    "type": "BUY",
    "userId": "uuid",
    "playerId": "uuid",
    "quantity": 3,
    "quoteValue": 82.5,
    "total": 247.5,
    "createdAt": "2026-10-24T15:00:00.000Z"
  },
  "account": { "creditBalance": 752.5 },
  "holding": {
    "quantity": 3,
    "averagePurchasePrice": 82.5
  }
}
```

El `userId` de respuesta es el sujeto autenticado y no un valor controlable
por el request. En `SELL`, `holding.quantity` y el precio promedio reflejan el
estado posterior.

### `GET /api/portfolio`

No recibe `userId`. Respuesta `200`:

```json
{
  "creditBalance": 752.5,
  "items": [
    {
      "playerId": "uuid",
      "quantity": 3,
      "averagePurchasePrice": 82.5,
      "currentQuoteValue": 90,
      "currentValue": 270,
      "unrealizedPnl": 22.5
    }
  ]
}
```

La consulta devuelve solo tenencias del usuario autenticado con `quantity >
0`, y usa la cotización vigente ya persistida. No incluye historial de
operaciones, movimientos de terceros, órdenes pendientes ni métricas
comerciales.

## Errores esperados

- `400 Bad Request`: body ausente o inválido, UUID inválido, cantidad no
  entera positiva o campos no permitidos.
- `401 Unauthorized`: JWT ausente, inválido o expirado.
- `404 Not Found`: jugador inexistente, pool no configurado, tenencia requerida
  inexistente o ausencia de cotización vigente.
- `409 Conflict`: tokens insuficientes en el pool, tenencia insuficiente del
  inversor, saldo insuficiente del inversor/pool o conflicto de concurrencia.
- `500 Internal Server Error`: error inesperado; nunca debe devolverse un
  resultado parcial.

Los mensajes pueden ser descriptivos para el cliente, pero no deben exponer
datos de otras cuentas ni permitir descubrir saldos ajenos.

## Registro inmutable y auditoría

Cada operación aceptada crea un registro append-only `market_operations` y una
auditoría financiera asociada. No se permite editar ni eliminar operaciones
completadas. El portfolio, el valor actual y el PnL no se persisten: se derivan
de `token_holdings` y de la cotización vigente.

El registro mínimo de operación debe incluir:

- `id` UUID, `type` (`BUY`/`SELL`), `userId`, `playerId` y `quantity`.
- `quoteId` como referencia a la cotización persistida utilizada, además de
  `quoteValue` como snapshot del precio efectivamente ejecutado. El snapshot
  no es una duplicación accidental: conserva el hecho comercial aunque una
  consulta futura cambie o la cotización histórica se archive.
- `total`, `currency/unit` (`CREDIT_PER_TOKEN`), `createdAt` y
  `correlationId` de la solicitud, cuando esté disponible.
- No se persiste `status` en este MVP: solo se insertan operaciones completadas;
  las operaciones rechazadas no crean un registro financiero.

La auditoría mínima debe incluir:

- actor autenticado (`actorUserId`), acción, timestamp ISO-8601 y correlation
  ID;
- snapshot anterior y posterior del saldo del inversor y del pool;
- snapshot anterior y posterior de la tenencia del inversor y del pool;
- referencia al `operationId`. La cotización utilizada se obtiene desde la
  operación mediante `quoteId` y `quoteValue`, evitando repetirla en la
  auditoría.

La auditoría se escribe en la misma transacción que la operación y los cambios
patrimoniales. La aplicación no expone endpoints MVP para editar, borrar o
reconstruir estos registros.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE exponer `POST /api/orders/buy` y
  `POST /api/orders/sell` protegidos por JWT.
- **FR-002**: El sistema DEBE obtener el inversor desde la autenticación actual
  y NO DEBE confiar en un `userId` enviado por el cliente.
- **FR-003**: Las operaciones DEBEN usar la cotización vigente persistida
  consultable mediante el flujo de `player-quote-queries`, sin recalcularla.
- **FR-004**: El sistema DEBE conservar exactamente 100 tokens por jugador
  entre el pool central y las tenencias inversoras.
- **FR-005**: `BUY` DEBE validar cantidad positiva, jugador, cotización,
  disponibilidad del pool y saldo del inversor antes de transferir.
- **FR-006**: `SELL` DEBE validar cantidad positiva, jugador, cotización,
  tenencia del inversor y saldo del pool antes de transferir.
- **FR-007**: La compra DEBE actualizar el precio promedio ponderado; la venta
  DEBE conservarlo mientras queden tokens y establecerlo en cero al liquidar
  toda la tenencia.
- **FR-008**: Las transferencias de tokens y créditos DEBEN ejecutarse dentro
  de una única transacción atómica, con rollback ante cualquier error.
- **FR-009**: Cada operación exitosa DEBE crear un registro inmutable con la
  cantidad, cotización, total, actor inversor, jugador, tipo, fecha y
  correlation ID. En este MVP solo se persisten operaciones completadas, por
  lo que no se agrega un campo `status`.
- **FR-010**: Cada operación exitosa DEBE crear auditoría append-only con
  snapshots anterior/posterior de saldos y tenencias.
- **FR-011**: El sistema DEBE exponer `GET /api/portfolio`, derivando el
  usuario del JWT y devolviendo solo sus posiciones activas, saldo y valores
  calculados con la cotización vigente.
- **FR-012**: La respuesta de una operación exitosa DEBE incluir la operación,
  saldo posterior y tenencia posterior para evitar una consulta adicional.
- **FR-013**: Las respuestas DEBEN documentarse en OpenAPI con los estados
  `201`, `200`, `400`, `401`, `404`, `409` y `500` aplicables.

## Key Entities

- **TokenHolding**: modelo existente de cantidad y precio promedio por
  `(userId, playerId)`. Se reutiliza y se extiende solo si hace falta soportar
  las actualizaciones transaccionales.
- **PlayerQuote**: cotización persistida por `player-quotes`; la operación
  guarda un snapshot de su valor, no una referencia mutable a la cotización
  activa.
- **MarketOperation**: nuevo registro append-only de una compra o venta
  completada. Guarda la cotización como referencia (`quoteId`) y como snapshot
  del precio ejecutado (`quoteValue`), porque el precio aplicado es parte del
  hecho financiero.
- **FinancialAuditRecord**: nuevo registro append-only con actor, correlation ID,
  snapshots y referencia a la operación. No repite jugador, cantidad, precio,
  total ni contraparte.
- **Central Pool**: el único usuario `SUPERUSER`, contraparte inicial y dueño
  de los tokens no distribuidos. No requiere una entidad ni un identificador
  adicional en la operación mientras exista una única contraparte.

## Persistencia y datos derivados

- `users.credit_balance` es la única fuente de verdad para los saldos.
- `token_holdings` es la única fuente de verdad para las cantidades y precios
  promedio por usuario y jugador. La tenencia del pool usa la misma tabla; no
  se crea una tabla de inventario separada.
- `player_quotes` es la fuente de verdad de las cotizaciones históricas. La
  operación conserva solo la referencia y el `quoteValue` ejecutado para
  mantener trazabilidad del hecho financiero.
- `market_operations` registra el hecho comercial; no guarda saldos o
  tenencias posteriores porque esos snapshots pertenecen a la auditoría.
- `financial_audit_records` guarda los snapshots anterior/posterior exigidos para
  auditoría. No duplica los atributos descriptivos de la operación.
- `creditBalance`, `currentValue`, `unrealizedPnl`, disponibilidad del pool y
  total emitido son proyecciones o invariantes calculadas; no se persisten como
  columnas adicionales en esta feature.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de las compras y ventas exitosas conserva la suma de
  tokens del jugador en exactamente 100.
- **SC-002**: El 100% de las operaciones exitosas actualiza ambos saldos,
  ambas tenencias, la operación y la auditoría dentro de una única transacción.
- **SC-003**: El 100% de las solicitudes sin JWT o con identidad no válida es
  rechazado con `401`, y ningún request puede operar sobre un `userId` ajeno.
- **SC-004**: El 100% de las compras usa la cotización vigente capturada y
  calcula correctamente el promedio ponderado.
- **SC-005**: El 100% de los rechazos por saldo, tokens, tenencia o cotización
  deja sin cambios los saldos, tenencias, operaciones y auditorías.
- **SC-006**: `GET /api/portfolio` devuelve únicamente la posición del usuario
  autenticado y muestra el resultado posterior a una operación exitosa.
- **SC-007**: Los tests cubren compras, ventas, emisión fija, promedio
  ponderado, liquidación, errores, autenticación, rollback y concurrencia
  básica.

## Out of Scope

- Libro de órdenes o matching entre inversores.
- Múltiples pools, market makers o selección de contraparte.
- Comisiones, impuestos, límites, reservas, retiros o depósitos de créditos.
- Tokens fraccionarios.
- Historial consultable de transacciones, exportaciones o reportes avanzados.
- Paginación, filtros, evolución temporal del portfolio o métricas de riesgo.
- Recalcular cotizaciones, modificar estrategias o consultar proveedores
  externos durante una operación.
- Funcionalidad frontend; el contrato backend queda listo para consumo
  posterior.

## Assumptions

- `player_quotes` ya existe y `GET /api/players/{id}/quotes` devuelve la
  cotización actual como primer elemento, según `004-player-quote-queries`.
- Existe un único usuario `SUPERUSER` creado/configurado como pool central y
  cada jugador comienza con una tenencia de 100 tokens en ese usuario.
- Los inversores se registran con el saldo inicial existente de 1.000 créditos.
- PostgreSQL y Drizzle ORM son la persistencia; la atomicidad se implementa
  mediante `database.transaction` y locks de filas según soporte del driver.
- La precisión monetaria se maneja como decimal/numeric en persistencia y no
  mediante operaciones binarias sin control.
- La ausencia de una cotización vigente bloquea tanto compra como venta; no se
  utiliza un valor anterior como fallback silencioso.
