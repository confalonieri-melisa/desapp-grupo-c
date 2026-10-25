# Feature Specification: Historial de Operaciones Financieras

**Feature Branch**: `feature/006-operation-history`

**Integration Base Branch**: `feature/005-player-token-trading`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Necesitamos exponer el historial de operaciones financieras realizadas por un usuario. La información debe provenir de registros persistidos de operaciones y no reconstruirse a partir de las tenencias actuales. El historial debe ser de solo lectura y respetar los permisos del usuario autenticado. Partir de la rama 005-player-token-trading."

## Alcance MVP

Esta feature agrega una consulta autenticada y de solo lectura sobre los
registros persistidos de `market_operations` creados por la feature
`005-player-token-trading`.

- El usuario autenticado consulta únicamente sus propias operaciones.
- La fuente de verdad es `market_operations`; no se reconstruyen operaciones
  desde `token_holdings`, saldos actuales, portfolio ni auditorías.
- Se incluyen operaciones completadas de compra (`BUY`) y venta (`SELL`),
  conservando los datos históricos capturados al ejecutarse.
- Compras y ventas se devuelven en una única colección unificada; el campo
  `type` permite distinguir cada operación.
- El resultado se ordena cronológicamente desde la operación más reciente.
- El resultado admite paginación simple mediante `limit` y `offset`, con un
  límite máximo para evitar respuestas sin tamaño acotado.
- No se agregan operaciones de prueba, pendientes, rechazadas o canceladas,
  porque el modelo actual solo persiste operaciones completadas.
- La consulta no modifica operaciones, tenencias, saldos ni registros de
  auditoría.

## User Scenarios & Testing

### User Story 1 - Consultar el historial propio (Priority: P1)

Como usuario inversor autenticado, quiero consultar las operaciones
financieras que realicé para conocer cuándo compré o vendí tokens, a qué
cotización y por qué importe.

**Why this priority**: El historial es necesario para verificar la actividad
financiera del usuario y complementar la vista actual del portfolio, que no
conserva el detalle de operaciones anteriores.

**Independent Test**: Con operaciones persistidas de dos usuarios, un JWT
válido puede consultar el endpoint y recibe únicamente las operaciones del
sujeto autenticado, con los valores históricos de cada operación.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con operaciones `BUY` y `SELL` persistidas,
   **When** solicita `GET /api/users/:id/transactions` usando su propio `id`,
   **Then** recibe `200` con sus
   operaciones ordenadas por `createdAt` descendente.
2. **Given** una operación persistida con cotización, cantidad, total y fecha,
   **When** se consulta el historial, **Then** la respuesta conserva esos
   valores del registro y no los recalcula con la cotización actual.
3. **Given** un usuario autenticado sin operaciones, **When** consulta el
   historial, **Then** recibe `200` con `items: []`.
4. **Given** operaciones de otros usuarios, **When** un usuario consulta el
   historial, **Then** ninguna operación ajena aparece en la respuesta.

---

### User Story 2 - Proteger el acceso al historial (Priority: P1)

Como usuario del sistema, quiero que el historial respete mi identidad
autenticada para impedir la consulta de movimientos financieros de otra
persona.

**Why this priority**: Las operaciones financieras son información privada y
el identificador del usuario no debe ser una vía para ampliar permisos.

**Independent Test**: Se prueban solicitudes sin JWT, con JWT inválido y con
identidad válida contra datos de varios usuarios, verificando autenticación y
aislamiento por usuario.

**Acceptance Scenarios**:

1. **Given** una solicitud sin header Bearer válido, **When** accede al
   endpoint, **Then** recibe `401 Unauthorized` y no se consulta ni expone
   historial.
2. **Given** un JWT válido cuyo sujeto es `user-A`, **When** solicita el
   historial con `:id=user-A`, **Then** el servidor usa ese sujeto como filtro.
3. **Given** un JWT válido cuyo sujeto es `user-A`, **When** solicita el
   historial con `:id=user-B`, **Then** responde `403 Forbidden` sin consultar
   ni exponer operaciones de `user-B`.
4. **Given** un cliente que envía campos no contemplados para seleccionar otro
   usuario, **When** realiza la solicitud, **Then** esos campos se ignoran o
   rechazan sin modificar el alcance de autorización.

---

### User Story 3 - Consultar un historial inmutable y de solo lectura (Priority: P1)

Como usuario inversor, quiero que mi historial represente los hechos
financieros registrados y no cambie cuando cambien mis tenencias o las
cotizaciones actuales.

**Why this priority**: La trazabilidad financiera exige preservar el hecho
comercial tal como ocurrió.

**Independent Test**: Se crea una operación, se modifica posteriormente la
tenencia o aparece una nueva cotización y se vuelve a consultar el historial;
el registro de la operación permanece idéntico.

**Acceptance Scenarios**:

1. **Given** una operación completada persistida, **When** cambia la cotización
   vigente del jugador, **Then** `quoteValue` y `total` del historial no
   cambian.
2. **Given** una operación que dejó una tenencia en cero, **When** se consulta
   el historial, **Then** la operación sigue visible con su cantidad y tipo
   originales.
3. **Given** cualquier solicitud de historial, **When** finaliza exitosamente,
   **Then** no se crean, actualizan ni eliminan operaciones, auditorías,
   tenencias o saldos.

## Edge Cases

- Si no existen operaciones para el usuario autenticado, responder `200` con
  una colección vacía, no `404`.
- Si una operación histórica referencia un jugador o cotización que ya no se
  puede resolver, el registro financiero debe seguir siendo identificable; la
  consulta no debe reconstruirlo ni reemplazar sus snapshots históricos.
- Las operaciones con el mismo `createdAt` deben tener un orden determinista,
  usando el `id` de la operación como desempate.
- Las operaciones rechazadas no deben aparecer, porque no se persisten como
  `market_operations` en el MVP anterior.
- El endpoint no debe devolver snapshots internos de auditoría, saldos de
  terceros ni datos del pool central.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE exponer `GET /api/users/:id/transactions` como
  consulta de
  historial de operaciones financieras del usuario indicado por `:id`.
- **FR-002**: El endpoint DEBE requerir un JWT válido de un usuario inversor
  mediante `Authorization: Bearer <JWT>`.
- **FR-003**: El sistema DEBE requerir el parámetro de ruta `:id` y DEBE
  verificar que coincida con el sujeto autenticado (`auth.sub`); NO DEBE
  permitir que un usuario consulte el historial de otro usuario.
- **FR-004**: El sistema DEBE leer las operaciones desde los registros
  persistidos de `market_operations`, filtrando por el inversor autenticado.
- **FR-005**: El sistema NO DEBE reconstruir operaciones a partir de
  `token_holdings`, portfolio, saldos actuales, cotizaciones actuales ni
  registros de auditoría.
- **FR-006**: El historial DEBE incluir operaciones completadas de tipo `BUY` y
  `SELL` del usuario autenticado, conservando como mínimo `id`, `type`,
  `playerId`, `quantity`, `quoteId`, `quoteValue`, `total`, `unit`,
  `createdAt` y `correlationId` nullable.
- **FR-007**: La respuesta DEBE ordenar los elementos por `createdAt`
  descendente y, ante empate, por `id` descendente.
- **FR-008**: El endpoint DEBE aceptar los parámetros opcionales `limit` y
  `offset`. `limit` DEBE tener un valor por defecto de `50` y un máximo de
  `100`; `offset` DEBE tener un valor por defecto de `0` y no DEBE ser
  negativo.
- **FR-009**: La respuesta DEBE incluir `items`, `limit`, `offset` y
  `hasMore`. No DEBE requerirse un conteo total de registros.
- **FR-010**: El sistema DEBE responder `200` con `items: []` cuando el
  usuario autenticado no tenga operaciones.
- **FR-011**: La consulta DEBE ser de solo lectura y NO DEBE modificar
  operaciones, auditorías, tenencias, saldos ni cotizaciones.
- **FR-012**: El sistema DEBE devolver `401` ante autenticación ausente,
  inválida o expirada, sin filtrar datos del historial.
- **FR-013**: El sistema DEBE devolver `400 Bad Request` cuando `:id`,
  `limit` u `offset` tengan un formato inválido.
- **FR-014**: El sistema DEBE devolver `403 Forbidden` cuando el `:id` no
  coincida con `auth.sub`, sin filtrar el historial del usuario solicitado.
- **FR-015**: El sistema DEBE devolver errores de servidor sin exponer datos de
  otros usuarios, credenciales, consultas SQL ni detalles internos de
  persistencia.
- **FR-016**: El contrato del endpoint y sus respuestas y errores aplicables
  DEBEN documentarse en OpenAPI/Swagger.

### Contrato de API

#### `GET /api/users/:id/transactions?limit=50&offset=0`

Headers requeridos:

```http
Authorization: Bearer <jwt>
```

Respuesta `200`:

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "BUY",
      "playerId": "uuid",
      "quantity": 3,
      "quoteId": "uuid",
      "quoteValue": 82.5,
      "total": 247.5,
      "unit": "CREDIT_PER_TOKEN",
      "createdAt": "2026-10-24T15:00:00.000Z",
      "correlationId": "request-123"
    }
  ],
  "limit": 50,
  "offset": 0,
  "hasMore": false
}
```

`correlationId` se serializa como `null` cuando no exista en el registro
persistido. Para mantener un contrato estable, la respuesta DEBE incluirlo
siempre. Los valores monetarios se serializan como
números JSON; la precisión de dos decimales se conserva en persistencia, pero
no se exige conservar ceros finales en la representación JSON. El `:id` de la ruta debe corresponder exclusivamente al sujeto
autenticado; no se acepta un identificador alternativo en el body ni en query
parameters. Solo `limit` y `offset` son parámetros de query válidos.

Errores esperados:

- `401 Unauthorized`: JWT ausente, inválido o expirado.
- `400 Bad Request`: `:id` inválido, `limit` fuera de rango o `offset` negativo
  o inválido.
- `403 Forbidden`: el `:id` solicitado no coincide con el sujeto autenticado.
- `500 Internal Server Error`: error inesperado al consultar persistencia,
  sin resultado parcial ni exposición de información sensible.

## Key Entities

- **MarketOperation**: hecho financiero persistido e inmutable que representa
  una operación completada de compra o venta, con su cotización y total
  capturados en el momento de ejecución.
- **DTO de historial**: representación de lectura de un `MarketOperation`; es
  solo un contrato de respuesta y no constituye una nueva fuente de verdad ni
  una entidad editable o persistida.
- **AuthenticatedUser**: sujeto identificado por el JWT cuyo `sub`
  determina el filtro de acceso al historial.

## Persistencia y autorización

- `market_operations` es la única fuente de verdad del historial expuesto.
- La consulta filtra por `investor_id` igual a `:id`, luego de verificar que
  `:id` coincide con `auth.sub`, y ordena
  por `created_at DESC, id DESC`.
- La consulta aplica `limit` y `offset` sobre ese orden y calcula `hasMore`
  solicitando como máximo una fila adicional; no requiere contar todo el
  historial.
- La implementación debe reutilizar el middleware JWT y las capas existentes
  de controlador, servicio y repositorio.
- La auditoría financiera no es una fuente alternativa para reconstruir
  operaciones; solo conserva snapshots para auditoría interna.
- La lectura no debe recalcular totales, precios ni cantidades. Los valores de
  la respuesta deben mapearse desde el registro persistido.
- No se requieren joins con `players` ni `player_quotes` para enriquecer la
  respuesta; `playerId` y `quoteId` son suficientes para este MVP.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de las respuestas exitosas contiene únicamente
  operaciones cuyo `investor_id` coincide con el sujeto del JWT.
- **SC-002**: El 100% de los elementos del historial proviene de un registro
  persistido de `market_operations`; ninguna operación se genera desde una
  tenencia actual.
- **SC-003**: En el 100% de los casos de cambio de cotización o tenencia
  posterior, los valores históricos `type`, `quantity`, `quoteValue`, `total` y
  `createdAt` permanecen iguales.
- **SC-004**: El 100% de las solicitudes sin autenticación válida responde
  `401` y no expone operaciones.
- **SC-005**: El 100% de las consultas exitosas deja sin cambios las tablas de
  operaciones, auditoría, tenencias, usuarios y cotizaciones.
- **SC-006**: Los tests cubren historial con múltiples operaciones, historial
  vacío, aislamiento entre usuarios, orden determinista, inmutabilidad de
  snapshots, paginación y errores de autenticación/autorización.

## Assumptions

- La feature `005-player-token-trading` ya persiste operaciones completadas en
  `market_operations` con los campos definidos en su especificación.
- El middleware JWT existente expone el identificador confiable del usuario en
  el contexto de la solicitud.
- Las solicitudes a este endpoint son realizadas por usuarios con capacidad de
  operar como inversores; no se define en esta feature un flujo para otros
  roles.
- El MVP no requiere filtros por jugador/tipo/fecha, exportación ni consulta
  del historial de otro usuario por rol administrativo.
- La exposición del historial es exclusivamente backend; la UI que lo
  consuma queda fuera del alcance de esta feature.

## Out of Scope

- Editar, borrar, anular o reconstruir operaciones.
- Consultar operaciones de otros usuarios o del pool central.
- Crear un libro de órdenes, operaciones pendientes o estados adicionales.
- Calcular PnL, portfolio o disponibilidad de tokens dentro del historial.
- Recalcular cotizaciones o consultar proveedores externos.
- Filtros, exportaciones, agregaciones o reportes avanzados.
- Cambios en el esquema financiero existente salvo los estrictamente
  necesarios para leer `market_operations`.
