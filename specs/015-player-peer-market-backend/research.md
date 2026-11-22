# Research: Mercado P2P de Tokens de Jugadores — Backend

## Decision 1: Representación de reservas

**Decision**: No agregar `reservedQuantity` a `token_holdings`. La reserva se
persistirá en `p2p_offers.reserved_quantity`; mientras una oferta está `OPEN`,
ese valor es igual a `quantity`. La disponibilidad del vendedor será su
`token_holdings.quantity` menos la suma de `reserved_quantity` de sus ofertas
abiertas para el jugador.

**Rationale**: `token_holdings.quantity` ya representa la tenencia total y
posee un constraint de no negatividad. Separar la reserva evita descontar y
volver a sumar artificialmente una misma tenencia, permite auditar el motivo
de la indisponibilidad y evita doble reserva con una consulta agregada bajo
lock.

**Alternatives considered**:

- Agregar `reserved_quantity` a `token_holdings`: descartado porque mezcla
  disponibilidad derivada con la fuente de verdad de tenencia y complica la
  consistencia entre múltiples ofertas.
- Crear una tenencia adicional para reservas: descartado por introducir una
  segunda representación de tokens no requerida por el MVP.

## Decision 2: Estados de oferta

**Decision**: Los estados persistidos serán `OPEN`, `SOLD` y `CANCELLED`.
`SOLD` es el nombre canónico para una oferta de venta comprada completamente.

**Rationale**: El ciclo es una máquina de estados pequeña y terminal. No se
necesitan estados pendientes, vencidos ni parciales.

**Alternatives considered**: `FILLED` fue considerado por describir una orden
completada, pero se descartó porque `SOLD` es más natural para una oferta de
venta y fue preferido para este dominio.

## Decision 3: Idempotencia transaccional

**Decision**: Crear una tabla `idempotency_keys` con unicidad por
`(user_id, idempotency_key)`, datos relevantes de la operación y respuesta final
serializada. La fila se inserta en la misma transacción que el efecto
financiero; un request concurrente con los mismos datos queda bloqueado
por la unicidad hasta que el primero confirme y luego reproduce el resultado.

**Rationale**: El commit conjunto evita que exista una respuesta de éxito sin
efecto o un efecto sin resultado reproducible. Los datos relevantes evitan
reutilizar accidentalmente una clave para otra operación.

**Alternatives considered**:

- Cache externo: descartado porque el MVP ya depende de PostgreSQL y necesita
  atomicidad con los saldos.
- Responder `409` mientras la primera solicitud está en curso: descartado por
  no resolver de forma determinista el timeout del cliente.

## Decision 4: Orden de locks

**Decision**: Todas las operaciones financieras bloquean en este orden global:
usuarios participantes ordenados por UUID ascendente; ofertas relevantes
ordenadas por UUID ascendente; tenencias relevantes ordenadas por
`user_id` ascendente; luego se leen cotización y datos derivados. El helper
existente de compra al pool se ajustará para respetar el mismo orden entre
inversor y pool.

**Rationale**: Un orden total compartido evita ciclos entre compra primaria,
publicación, compra P2P y cancelación. La transición de la oferta se actualiza
condicionada a `status = OPEN` como defensa adicional contra doble aceptación.

**Alternatives considered**: Locks ad hoc por endpoint: descartados por riesgo
de deadlock y de doble reserva.

## Decision 5: Retry y clasificación de fallos

**Decision**: Solo se reintentan SQLSTATE `40P01` (deadlock) y `40001`
(serialization failure), con un único retry adicional y una espera de 50 ms.
Errores de negocio se devuelven como `409` sin retry. Si se agotan los
intentos técnicos, se devuelve `503`; no se reintentan APIs externas. Un
timeout o error de red posterior al envío queda incierto y se resuelve
repitiendo la misma clave.

**Rationale**: Mantiene acotada la duración de una operación financiera y
permite al cliente distinguir un estado de negocio de un fallo transitorio.

## Decision 6: Precisión monetaria

**Decision**: Precio y total se persisten con escala 2. El total se calcula con
aritmética decimal exacta como `unitPrice * quantity`; no hay redondeo
adicional porque `quantity` es entera.

**Rationale**: Coincide con `player_quotes.quote_value`,
`market_operations.quote_value` y los saldos existentes.

## Decision 7: Consulta de ofertas

**Decision**: Agregar `GET /api/p2p/offers`, autenticado, que devuelve solo
ofertas `OPEN` y acepta únicamente el filtro opcional `playerId`. No se agrega
historial de ofertas ni filtros avanzados.

**Rationale**: El frontend necesita descubrir ofertas comprables y el alcance
queda acotado al MVP.
