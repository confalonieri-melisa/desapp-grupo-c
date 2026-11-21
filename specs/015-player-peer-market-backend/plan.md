# Implementation Plan: Mercado P2P de Tokens de Jugadores — Backend

**Branch**: `015-player-peer-market-backend` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary

Agregar un mercado P2P backend mínimo reutilizando el flujo financiero actual.
La compra primaria seguirá usando `MarketOperationService` y
`MarketRepository`; se agregará una máquina de estados de ofertas con los
estados `OPEN`, `SOLD` y `CANCELLED`, reservas separadas de
`token_holdings`, idempotencia persistida en PostgreSQL y transacciones
atómicas para publicar, comprar y cancelar.

La solución no agrega lógica frontend. El endpoint existente de venta al pool
se conservará como ruta rechazada con conflicto de negocio, sin transferir
tokens ni créditos al `SUPERUSER`.

## Technical Context

**Language/Version**: TypeScript sobre Node.js `>=22.12.0`, con route handlers de Next.js.

**Primary Dependencies**: Drizzle ORM `0.45.x`, `postgres`, Zod `4.x`, JWT existente y Vitest `5.x`.

**Storage**: PostgreSQL mediante Drizzle; migración versionada en `src/backend/db/migrations`.

**Testing**: Vitest unitario; Vitest de integración contra PostgreSQL real usando `TEST_DATABASE_URL`; Postman para smoke/contrato.

**Target Platform**: Servidor Next.js del backend del proyecto.

**Project Type**: Web service con route handlers y capas backend Controller → Service → Domain → Repository.

**Performance Goals**: En una prueba de dos solicitudes concurrentes sobre una misma oferta, exactamente una transición puede confirmarse; la otra debe terminar como conflicto o replay idempotente sin efectos duplicados. El MVP valida concurrencia con casos pequeños y deterministas.

**Constraints**: Alcance exclusivamente backend; no modificar componentes, hooks ni servicios frontend. Operaciones financieras atómicas, importes con escala 2, cantidades enteras, emisión fija de 100 tokens por jugador y retry interno solo para SQLSTATE `40P01`/`40001`.

**Scale/Scope**: MVP de ofertas de cantidad fija; listado solo de ofertas `OPEN` con filtro opcional `playerId`; sin paginación ni historial de ofertas en esta entrega.

## Constitution Check

### Gates before research

- **I. Alcance e integridad**: PASS. El plan cubre exclusivamente pool existente, P2P completo, cancelación, idempotencia, concurrencia y contratos solicitados.
- **II. Specification First**: PASS. La especificación 015 fue creada y aclarada antes de este plan.
- **III. Arquitectura en capas**: PASS. Controllers delegan en services; services orquestan dominio y transacciones; repositories encapsulan Drizzle.
- **IV. Validación por responsabilidad**: PASS. Zod valida forma; services validan recursos/autorización; dominio valida estados e invariantes.
- **V. Tests verificables**: PASS. Se planifican unit tests de dominio e integración contra PostgreSQL real, incluyendo concurrencia y rollback.
- **VI. Resiliencia y auditabilidad**: PASS. Se preservan auditoría, correlation ID, JWT y retry acotado de errores transitorios.
- **VII. Incrementalidad**: PASS. Se extiende el mercado existente sin implementar órdenes abiertas, matching, comisiones o frontend.
- **VIII. Simplicidad/YAGNI**: PASS. La reserva usa la oferta existente como registro de reserva; no se agrega un ledger o servicio externo.
- **IX. Definition of Done**: PASS condicionado a actualizar OpenAPI/Postman, ejecutar build/tests y revisión de Project Owner durante implementación.
- **X. GitFlow**: PASS como condición de ejecución; implementación debe permanecer en la rama de feature y abrir PR a `main`.

### Gate result

No hay violaciones que requieran justificar complejidad adicional.

## Architecture and structure decision

Se mantiene la estructura actual y se extiende el módulo de mercado:

```text
src/backend/
├── controllers/
│   ├── market-operation.controller.ts       # compra primaria y rechazo de sell al pool
│   └── p2p-offer.controller.ts              # publicar, listar, comprar, cancelar
├── services/
│   ├── market-operation.service.ts          # buy existente; sell rechazado
│   └── p2p-offer.service.ts                 # autorización y orquestación P2P
├── models/
│   └── P2POffer.ts                          # máquina de estados e invariantes
├── repositories/
│   ├── market.repository.ts                 # buy existente + helpers de locks/persistencia compartidos
│   └── p2p-offer.repository.ts              # ofertas, reservas e idempotencia
├── schemas/
│   └── p2p-offer.schema.ts                  # request/query/response validation
├── db/
│   ├── schema.ts                            # p2p_offers, idempotency_keys, extensiones financieras
│   └── migrations/                          # nueva migración Drizzle
└── errors/
    ├── http.error.ts                        # ServiceUnavailable y códigos de dominio
    └── to-http-response.ts                  # error estable con correlationId

src/app/api/
├── orders/sell/route.ts                     # rechaza recompra del pool
└── p2p/offers/
    ├── route.ts                             # GET listado y POST publicación
    └── [offerId]/
        ├── purchase/route.ts
        └── cancel/route.ts

tests/
├── unit/models/p2p-offer.spec.ts
├── unit/services/p2p-offer.service.spec.ts
├── unit/repositories/idempotency.repository.spec.ts
└── integration/p2p-offers.routes.spec.ts
```

La implementación debe extraer o reutilizar helpers de `MarketRepository` en
lugar de duplicar reglas de saldo, tenencias, operación y auditoría. La compra
al pool permanece en el mismo servicio/repository y solo se ajusta su orden de
locks y la prohibición de venta al `SUPERUSER`.

## Phase 0: Research outputs

El resultado de investigación está en [research.md](research.md). Las
decisiones que desbloquean implementación son:

1. Reserva separada en `p2p_offers.reserved_quantity`; no se modifica
   `token_holdings` al publicar.
2. Estados canónicos `OPEN`, `SOLD`, `CANCELLED`.
3. Idempotencia en la misma transacción que el efecto financiero.
4. Orden global de locks usuarios → ofertas → tenencias.
5. Retry máximo de 3 intentos solo para `40P01`/`40001`, luego `503`.
6. Precio y total con escala 2 y aritmética decimal exacta.
7. Consulta autenticada de ofertas abiertas con filtro `playerId`.

## Phase 1: Design details

### 1. Persistence and migration

- Agregar `p2p_offers` según [data-model.md](data-model.md), con FKs a users,
  players y player_quotes; constraints de cantidad, precio, total, estado,
  buyer, reserva y timestamps.
- Agregar `idempotency_keys` con unicidad `(user_id, idempotency_key)`, hash
  de método/ruta/payload, respuesta JSON y estado final.
- Extender `market_operations` con `offer_id` y `counterparty_user_id`
  nullable; mantener `BUY`/`SELL` y los constraints actuales.
- Extender la auditoría sin eliminar registros existentes: hacer
  `operation_id` nullable, agregar `offer_id` nullable y un constraint que
  mantenga `TOKEN_BUY`/`TOKEN_SELL` con operación, publicación/cancelación con
  oferta y fill con ambas referencias. Agregar acciones
  `P2P_OFFER_PUBLISHED`, `P2P_OFFER_SOLD` y `P2P_OFFER_CANCELLED`.
- Generar una migración Drizzle nueva y actualizar snapshots/journal mediante
  el flujo existente; no editar migraciones históricas.

### 2. Domain model

- Crear `P2POffer` con constructor validado y métodos `fill(buyerId,
  closedAt)` y `cancel(closedAt)`.
- Rechazar transiciones desde estados terminales, auto-compra,
  `reservedQuantity` inconsistente y cantidades no enteras positivas.
- Centralizar el cálculo `total = unitPrice * quantity` con decimal exacto y
  dos decimales.
- Mantener el modelo `MarketTrade` existente para `BUY`; no introducir un
  modelo alternativo de pool.

### 3. Locking and transaction protocol

#### Global lock order

1. Lock de todas las cuentas `users` participantes, ordenadas por UUID
   ascendente: seller/buyer para P2P; investor/pool para compra primaria.
2. Lock de la oferta o de las ofertas abiertas relevantes, ordenadas por
   `p2p_offers.id` ascendente.
3. Lock de filas `token_holdings` relevantes, ordenadas por `user_id`
   ascendente; crear una fila cero de tenencia bajo el mismo unique key cuando
   el caso lo requiera.
4. Leer jugador/cotización y calcular derivados; la cotización de publicación
   se captura dentro de la transacción.
5. Actualizar entidades y crear operación/auditoría/idempotency response antes
   del commit.

El helper de compra primaria debe cambiar el orden actual fijo
`investor → pool` por el orden UUID ascendente, y mantener el mismo orden para
las tenencias. Así no se crea un ciclo con una compra P2P que incluya al mismo
usuario.

#### Publish

1. Autenticar, verificar rol inversor, validar body y exigir
   `Idempotency-Key`.
2. Abrir transacción y registrar/revalidar idempotencia con huella de usuario,
   método, ruta y payload.
3. Lock seller y sus ofertas abiertas del jugador; lock de holding seller.
4. Calcular `available = holding.quantity - SUM(open.reserved_quantity)`.
5. Validar player y quote vigente; capturar quote, `unitPrice` y `total`.
6. Insertar oferta `OPEN` con `reserved_quantity = quantity`, sin modificar
   `token_holdings` ni saldos.
7. Persistir auditoría de publicación y respuesta idempotente; commit.

#### Purchase

1. Autenticar, validar `offerId`, exigir idempotencia y rechazar
   `SUPERUSER`.
2. En transacción, resolver la oferta; lock seller y buyer en orden UUID,
   luego oferta, luego holdings seller/buyer en orden UUID.
3. Verificar `OPEN`, buyer distinto, saldo suficiente y
   `reserved_quantity = quantity`.
4. Aplicar `P2POffer.fill`: `buyer_id = buyer`, `status = SOLD`,
   `reserved_quantity = 0`, `closed_at = now`.
5. Debitar buyer, acreditar seller; reducir holding seller y crear/actualizar
   holding buyer con el precio promedio correspondiente.
6. Crear una operación `SELL` con seller como `investor_id`, buyer como
   `counterparty_user_id`, offer como `offer_id`, y auditoría con snapshots de
   ambas partes.
7. Guardar respuesta idempotente; commit conjunto. Una segunda aceptación ve
   estado terminal y devuelve `409`, salvo replay con la misma huella.

#### Cancel

1. Autenticar, validar `offerId`, exigir idempotencia y verificar que el actor
   sea seller.
2. Lock seller, oferta y holding según el orden global.
3. Verificar `OPEN`; aplicar `cancel`: `status = CANCELLED`,
   `reserved_quantity = 0`, `closed_at = now`.
4. No cambiar créditos ni `token_holdings`; crear auditoría y respuesta
   idempotente; commit.
5. Una compra concurrente solo puede ganar si obtuvo primero la transición
   `OPEN`; la otra operación devuelve `409` sin liberar o transferir dos veces.

### 4. Idempotency and retry implementation

- Crear un helper de huella determinista para JSON normalizado, con método y
  path canónico, y validación de clave de 1–255 caracteres.
- La fila de idempotencia se inserta/lee dentro de la misma transacción que la
  operación. La unicidad hace que el request concurrente idéntico espere al
  commit; después reproduce `response_status` y `response_body`.
- Una misma clave con otro usuario, método, ruta o hash devuelve `409`.
- Errores de autenticación y forma inválida se rechazan antes de persistir la
  clave; los resultados de negocio de una operación validada se guardan para
  repetir el mismo resultado.
- Envolver la transacción en `runFinancialTransactionWithRetry`:
  - attempt 1 inmediato;
  - si SQLSTATE `40P01`, esperar 50 ms y reintentar;
  - si SQLSTATE `40001`, esperar 100 ms y reintentar;
  - máximo 3 intentos totales;
  - al agotarse, lanzar `ServiceUnavailableError` con código estable;
  - no capturar/reintentar `ConflictError`, `NotFoundError`, `ForbiddenError`
    ni errores de validación.
- No agregar retry de APIs externas porque esta feature no las consume.

### 5. HTTP and error handling

- Reutilizar `requireAuth`, schemas Zod y controllers existentes.
- Agregar `Idempotency-Key` obligatorio en `POST /api/orders/buy`, publicación,
  purchase y cancel; no es requerido en el GET.
- Respuestas de negocio: `400` formato, `401` JWT, `403` rol/ownership,
  `404` recurso, `409` saldo/tenencia/estado/idempotencia/recompra al pool,
  `503` retry técnico agotado, `500` inesperado.
- Extender el mapper central para devolver `{ code, message, correlationId }`
  sin exponer SQL, credenciales ni snapshots de terceros.
- Mantener `/api/orders/buy` como flujo existente y hacer que
  `/api/orders/sell` responda conflicto `CENTRAL_POOL_REPURCHASE_DISABLED`
  sin abrir transacción financiera ni crear operación.

### 6. Contracts and API documentation

- Actualizar el OpenAPI canónico existente en
  `specs/001-player-token-marketplace/contracts/openapi.yaml`, que es el
  archivo cargado por `src/app/api/docs/route.ts`, incluyendo header, estados
  `OPEN/SOLD/CANCELLED`, errores y respuestas.
- Actualizar la colección Postman canónica existente en
  `specs/001-player-token-marketplace/contracts/postman_collection.json`;
  agregar requests/asserts para replay, conflicto de clave, compra completa,
  cancelación y rechazo de `/orders/sell`.
- Mantener `contracts/market-p2p.yaml` y `contracts/postman-p2p.json` como
  artefactos de diseño de la feature, sin crear una nueva ruta de documentación
  ni cambiar el mecanismo existente de Swagger/Postman.
- Mantener sincronizados los nombres de campos (`reservedQuantity`,
  `unitPrice`, `total`, `buyerId`, `closedAt`) entre código, OpenAPI y Postman.

### 7. Tests

#### Unit tests

- `P2POffer`: publicación válida, precio/total, fill, cancel, terminalidad,
  auto-compra, reserva y estado inválido.
- Idempotency fingerprint: mismo payload estable, diferencias por método/ruta/
  usuario/payload, clave vacía o mayor a 255.
- Servicio: autorización de inversor, rechazo de `SUPERUSER`, clasificación de
  `409` y mapping de respuestas.
- Retry helper: retry únicamente `40P01`/`40001`, backoff/3 intentos y `503`
  final; no retry de errores de negocio.

#### Integration tests against real PostgreSQL

- Migración y constraints: FK, unique key, estado, reserva, total y
  idempotencia.
- Compra primaria sigue funcionando y `/orders/sell` no altera datos.
- Publicación conserva holding total, calcula disponibilidad y evita doble
  reserva bajo concurrencia.
- Compra P2P completa actualiza saldos, holdings, oferta, operación y
  auditoría en un commit.
- Cancelación libera reserva, no altera créditos y es exclusiva frente a
  purchase concurrente.
- Dos compras concurrentes de una oferta: una `200`, el resto `409` o replay;
  una sola operación/auditoría.
- Repetición con misma clave/payload reproduce cuerpo; distinta huella da
  `409`; usuario distinto queda aislado.
- Emisión por jugador permanece exactamente en 100 y no aparecen negativos.
- GET devuelve solo `OPEN`, filtra `playerId`, devuelve vacío con `200` y
  rechaza parámetros no permitidos.

## Phase 1 outputs

- [research.md](research.md)
- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/market-p2p.yaml](contracts/market-p2p.yaml)
- [contracts/postman-p2p.json](contracts/postman-p2p.json)

## Complexity Tracking

No violations. La nueva tabla de ofertas y la tabla de idempotencia son
necesarias para representar reservas y reintentos seguros; no se agrega una
infraestructura externa ni un segundo modelo de mercado.
