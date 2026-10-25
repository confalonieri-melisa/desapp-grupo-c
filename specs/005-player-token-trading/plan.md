# Implementation Plan: Compra y Venta de Tokens de Jugadores

**Branch**: `feature/005-player-token-trading`  
**Base**: `feature/004-player-quote-queries`  
**Date**: 2026-10-24  
**Spec**: [spec.md](./spec.md)

## Summary

Agregar la operación inmediata de compra y venta de tokens contra el único
usuario `SUPERUSER`, reutilizando `TokenHolding`, `User`, la cotización actual
persistida y el middleware JWT existente.

La frontera transaccional estará en el repository de mercado. El servicio de
operaciones coordinará la intención mediante objetos de dominio y el repository
proveerá el límite atómico para lectura, locks y persistencia. No se agregará
un libro de órdenes, una entidad separada para el pool ni una entidad
persistida para el portfolio.

## Constitution Check

- **Specification First**: PASS. El comportamiento, contrato y errores están
  definidos en `spec.md`.
- **Layered Architecture**: PASS. `route -> controller -> service ->
  repositories`; el dominio no depende de Drizzle ni de Next.js.
- **Validation by Responsibility**: PASS. Zod valida request; el servicio
  resuelve actor, pool, jugador y cotización; `User` y `TokenHolding`
  preservan invariantes.
- **Atomicity and Auditability**: PASS. Saldos, posiciones, operación y
  auditoría se escriben dentro de una única transacción PostgreSQL.
- **Simplicity / YAGNI**: PASS. No se agregan wallets, matching, comisiones,
  historial público, cache ni frontend.
- **Incremental Development**: PASS condicionado. La branch se crea desde
  `feature/004-player-quote-queries`, que contiene las dependencias de
  valuación y consulta de cotizaciones.

## Technical Context

**Language/Version**: TypeScript, Node.js `>=22.12.0`  
**Framework**: Next.js App Router  
**Persistence**: PostgreSQL con Drizzle ORM  
**Validation**: Zod  
**Authentication**: JWT mediante `requireAuth`  
**Testing**: Vitest; integración contra PostgreSQL real  
**Dependencies**: No se agregan paquetes npm  
**Frontend**: Fuera de alcance; se entrega contrato backend

## Domain Model and Responsibilities

### `User`

Mantiene el saldo de créditos y sus invariantes de débito/acreditación. El
actor inversor se resuelve desde `auth.sub`; el pool se resuelve buscando el
único usuario con rol `SUPERUSER`.

### `TokenHolding`

Representa la posición de un usuario para un jugador. Debe concentrar las
operaciones de dominio necesarias:

- aumentar una posición calculando el promedio ponderado;
- reducir una posición validando cantidad disponible;
- dejar el promedio en cero al liquidar la posición.

La misma entidad representa la posición del inversor y la del pool. No se crea
una clase `PoolHolding` ni una tabla de inventario adicional.

### `MarketOperation`

Representa el hecho financiero completado: compra o venta, actores, jugador,
cantidad, cotización utilizada, importe, fecha y correlation ID. Es inmutable
después de persistirse.

### `FinancialAuditRecord`

Representa el registro append-only de la transición patrimonial. Referencia a
`MarketOperation`, actor y snapshots anterior/posterior de los saldos y
posiciones. No repite los datos descriptivos de la operación.

### `MarketOperationService`

Orquesta la operación completa:

1. valida el actor autenticado y resuelve el pool;
2. obtiene jugador y cotización vigente;
3. abre la transacción y bloquea saldos/posiciones involucrados;
4. aplica reglas de `User` y `TokenHolding`;
5. delega el guardado de estados, operación y auditoría;
6. devuelve el resultado posterior.

### `PortfolioService`

Consulta el portfolio del actor autenticado. No persiste valor actual ni PnL;
los calcula a partir de tenencias y cotizaciones vigentes.

## Architecture and Data Flow

### Compra/venta

```text
POST route
  -> requireAuth
  -> Zod request schema
  -> MarketOperationController
  -> MarketOperationService
  -> User / TokenHolding / Quote domain rules
  -> MarketRepository.executeTrade()
  -> MarketRepository (read locks + persistence)
  -> MarketSettlement (domain rules)
  -> response with operation, balance and position
```

La route no recibe ni resuelve un `userId` del body. El controller pasa el
`auth.sub` al servicio como actor autenticado.

### Portfolio

```text
GET route
  -> requireAuth
  -> PortfolioController
  -> PortfolioService
  -> UserRepository + PortfolioRepository + ValuationRepository
  -> PortfolioService composes holdings with latest persisted quotes
```

El portfolio devuelve solo posiciones del actor con cantidad positiva. No
consulta operaciones ni expone posiciones del pool.

## Transaction Design

`MarketRepository` debe abrir una única transacción por operación mediante
`executeTrade`; `MarketOperationService` selecciona `MarketTrade.buy` o
`MarketTrade.sell` y delega el flujo atómico sin depender directamente de
Drizzle.

Dentro de la transacción se debe:

1. bloquear el usuario inversor y el usuario pool con `FOR UPDATE`;
2. bloquear la posición del inversor y la del pool para el jugador;
3. verificar nuevamente saldo, tenencia y disponibilidad después del lock;
4. leer/capturar la cotización vigente y su identificador;
5. actualizar ambos saldos y ambas posiciones;
6. insertar `market_operations`;
7. insertar `financial_audit_records`;
8. devolver el estado posterior.

Las actualizaciones no deben depender de valores leídos fuera de la
transacción. Un error en cualquier paso produce rollback completo.

El orden de locks será estable: primero usuarios ordenados por UUID y luego
tenencias ordenadas por `(userId, playerId)`, para reducir deadlocks en compras
y ventas concurrentes.

## Files to Add or Modify

### Domain and application

- `src/backend/models/TokenHolding.ts`: agregar operaciones de compra/venta y
  promedio ponderado sin introducir dependencia de infraestructura.
- `src/backend/models/MarketOperation.ts`: tipo de operación y datos inmutables
  del hecho financiero.
- `src/backend/models/FinancialAuditRecord.ts`: contrato de auditoría y
  snapshots mínimos.
- `src/backend/services/market-operation.service.ts`: compra/venta y frontera
  transaccional.
- `src/backend/services/portfolio.service.ts`: consulta derivada del portfolio.
- `src/backend/controllers/market-operation.controller.ts` y
  `portfolio.controller.ts`: adaptación HTTP y DTOs.

### Persistence

- `src/backend/db/schema.ts`: tablas de operación y auditoría, relaciones,
  índices y foreign keys; mantener `users`, `players`, `token_holdings` y
  `player_quotes` como fuentes existentes.
- `src/backend/repositories/market.repository.ts`: lectura con locks y
  persistencia usando el executor transaccional recibido.
- `src/backend/models/MarketTrade.ts`: estado, resultado y reglas de
  liquidación de una compra o venta sin dependencia de infraestructura.
- `src/backend/repositories/portfolio.repository.ts`: lectura y mapeo de
  posiciones del actor.
- `src/backend/db/migrations/*`: migración para las tablas nuevas y sus
  índices.
- Seed/sincronización existente: inicialización idempotente de cotización
  `1.00` y tenencia pool de `100` tokens por jugador, solo si las features
  precedentes no lo proveen.

### HTTP and documentation

- `src/backend/schemas/market-operation.schema.ts`: request estricto para
  `playerId` y `quantity`; rechazar campos confiados como `userId`, `quoteValue`
  y `total`.
- `src/backend/schemas/portfolio.schema.ts`: schemas de salida si el proyecto
  los requiere para serialización.
- `src/app/api/orders/buy/route.ts` y `sell/route.ts`.
- `src/app/api/portfolio/route.ts`.
- `specs/001-player-token-marketplace/contracts/openapi.yaml`: endpoints,
  schemas y errores.
- `specs/005-player-token-trading/contracts/market.yaml`: contrato aislado de
  la feature.
- `specs/005-player-token-trading/quickstart.md`: flujo de demostración.

## Data Model and Migration Strategy

El detalle de tablas, restricciones e índices está en
[data-model.md](./data-model.md).

La migración agrega únicamente `market_operations` y
`financial_audit_records`. No duplica saldos, posiciones, portfolio ni
cotizaciones. La inicialización de tokens y cotización es idempotente y no
debe modificar tenencias existentes.

## API Contract Summary

- `POST /api/orders/buy`: `201` con operación, saldo y posición posterior.
- `POST /api/orders/sell`: `201` con operación, saldo y posición posterior.
- `GET /api/portfolio`: `200` con saldo y posiciones activas del actor.
- `400`: request inválido o campos no permitidos.
- `401`: JWT ausente, inválido o expirado.
- `404`: jugador, pool o cotización no encontrados.
- `409`: saldo, tokens, tenencia o concurrencia incompatibles.

No se agrega endpoint de historial de operaciones en esta feature.

## Testing Strategy

### Domain unit tests

- compra con posición inexistente;
- compra con posición previa y promedio ponderado;
- venta parcial;
- venta total y promedio en cero;
- cantidades cero, negativas y fraccionarias;
- saldo negativo y cantidad superior a la posición.

### Service tests

- actor derivado del JWT y rechazo de actor no inversor;
- pool único y jugador/cotización inexistentes;
- validación de saldo y disponibilidad;
- ausencia de `userId` confiable en el input;
- respuesta posterior de compra y venta;
- rollback cuando falla la operación o la auditoría.

### PostgreSQL integration tests

- conservación de 100 tokens por jugador;
- transferencia de saldo y posiciones en compra/venta;
- inserción append-only de operación y auditoría;
- snapshots anterior/posterior correctos;
- claves foráneas e índices;
- dos operaciones concurrentes que no permitan doble gasto;
- inicialización idempotente del pool.

### Route tests

- `401` sin JWT;
- `400` para body inválido o campos confiados;
- `201` para compra y venta;
- `404` para jugador/cotización/pool inexistente;
- `409` para saldo, tokens, tenencia y conflicto;
- portfolio aislado por identidad autenticada y sin `userId` de ruta.

## Implementation Order

1. Confirmar que `feature/004-player-quote-queries` está disponible y localizar
   sus repositorios de cotización; no duplicar su lógica.
2. Definir invariantes de `TokenHolding` y tipos de `MarketOperation` y
   `FinancialAuditRecord`.
3. Agregar schemas y tests unitarios de dominio.
4. Agregar migración, tablas, foreign keys e índices.
5. Implementar repositorios transaccionales y lectura mínima del portfolio.
6. Implementar `MarketOperationService` y `PortfolioService`.
7. Implementar controllers y routes autenticadas.
8. Actualizar OpenAPI, contrato de feature y quickstart.
9. Ejecutar tests dirigidos, integración PostgreSQL, lint, TypeScript, build y
   `git diff --check`.

## Risks and Mitigations

| Riesgo | Mitigación |
|---|---|
| Operaciones concurrentes pierden tokens o saldo | Locks de filas y validación posterior dentro de una única transacción |
| Se usa un `userId` del cliente | El actor se toma exclusivamente de `auth.sub` y el schema rechaza el campo |
| Se duplica la lógica de cotización | Reutilizar el repositorio/servicio de `player-quote-queries` |
| Portfolio inconsistente | Derivar valores de holdings y cotización actual, sin snapshots persistidos |
| Auditoría duplicada | Operación guarda hechos; auditoría guarda transición y snapshots |
| Pool duplicado o inexistente | Seed/configuración idempotente y validación de único `SUPERUSER` |
| Promedios monetarios inconsistentes | Numeric/decimal y redondeo explícito a dos decimales |

## Definition of Done

- Las tres rutas funcionan con identidad JWT y contrato OpenAPI actualizado.
- La emisión total de cada jugador se conserva en 100.
- Compra y venta actualizan saldos, posiciones, operación y auditoría
  atómicamente.
- No se persisten valores derivados del portfolio.
- No se duplica la lógica de cotizaciones de las features anteriores.
- Tests unitarios, integración y rutas cubren positivos, negativos, límites y
  concurrencia básica.
- TypeScript, lint, build y `git diff --check` pasan.
