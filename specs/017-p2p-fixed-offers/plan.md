# Implementation Plan: Ofertas P2P a Precio Fijo

**Branch**: `feature/017-p2p-fixed-offers` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

## Summary

Agregar ofertas P2P de venta a precio fijo y aceptación completa entre dos inversores, reutilizando usuarios, saldos, `TokenHolding`, operaciones de mercado, auditoría, idempotencia, autenticación e historial existentes.

El mercado central contra el `SUPERUSER` permanece sin cambios funcionales. El nuevo flujo tendrá una entidad de oferta pequeña y un settlement P2P separado del settlement central, pero compartirá las mismas reglas de dominio y la misma frontera transaccional del repositorio de mercado.

No se agregan reservas, escrow, matching, compras parciales, vencimientos, comisiones ni un segundo portfolio o historial.

## Technical Context

**Language/Version**: TypeScript, Node.js >=22.12.0

**Primary Dependencies**: Next.js App Router, Drizzle ORM, PostgreSQL, Zod, JWT existente, Vitest

**Storage**: PostgreSQL existente; una tabla nueva para ofertas y una migración incremental sobre las tablas de operaciones y auditoría.

**Testing**: Vitest unitario; integración contra PostgreSQL real; pruebas E2E solo para el flujo visible que ya tenga infraestructura reutilizable.

**Target Platform**: Aplicación web existente y sus rutas API autenticadas.

**Project Type**: Web application con backend y frontend en el mismo proyecto.

**Performance Goals**: Mantener el comportamiento de latencia y paginación del mercado existente; no se introduce un requisito de escala superior para este MVP.

**Constraints**: Todas las transferencias P2P deben ser atómicas, idempotentes y auditables. La cotización vigente no participa en la aceptación: el precio persistido en la oferta es el precio aplicado.

**Scale/Scope**: MVP para ofertas de una sola cantidad completa; un jugador por oferta; una aceptación por oferta; sin matching ni procesamiento batch adicional.

## Constitution Check

_Gate evaluated before Phase 0 and re-evaluated after Phase 1._

- **I. Requisitos y alcance**: PASS. La spec fija el MVP y conserva explícitamente el mercado central existente.
- **II. Specification First**: PASS. La spec fue aclarada antes de este plan.
- **III. Arquitectura en capas**: PASS. Route/controller solo adaptan HTTP, el service coordina el caso de uso entre dominio y repositories, el dominio aplica invariantes y los repositories solo encapsulan persistencia, locks y transacciones.
- **IV. Validación por responsabilidad**: PASS. Zod valida requests; servicios resuelven identidad, oferta y saldo; dominio valida dinero, cantidades y tenencias.
- **V. Tests verificables**: PASS. Se agregan pruebas de dominio, integración transaccional, idempotencia, autorización y flujo principal.
- **VI. Auditabilidad**: PASS. Se reutiliza la auditoría financiera y se extiende el snapshot para comprador/vendedor.
- **VII. Desarrollo incremental**: PASS. La feature parte de `main` y no modifica el comportamiento central salvo ampliaciones compatibles del historial.
- **VIII. Simplicidad**: PASS. Una tabla nueva y extensiones mínimas; no se crea un subsistema paralelo.
- **IX. Definition of Done**: PASS condicionado a tests, documentación pública y aprobación posterior.
- **X. GitFlow**: PASS. Se implementará en `feature/017-p2p-fixed-offers` con un PR independiente hacia `main`.

## Research Summary

Las decisiones detalladas están en [research.md](./research.md). Las decisiones que condicionan el diseño son:

1. Usar una única fila de operación para el hecho P2P y proyectar `BUY` o `SELL` según el usuario que consulta el historial.
2. Reutilizar `market_operations` y `financial_audit_records`, agregando campos opcionales para P2P en lugar de crear tablas paralelas.
3. No reservar tokens al publicar; validar la tenencia nuevamente al aceptar dentro del lock transaccional.
4. Guardar el precio fijo de la oferta como precio ejecutado, sin consultar una cotización al aceptar.
5. Reutilizar el snapshot posterior de auditoría para que un retry idempotente devuelva el mismo recibo.

## Architecture and Flow

### Publicar oferta

```text
POST /api/p2p/offers
  -> requireAuth
  -> request schema
  -> P2POfferController
  -> P2POfferService
  -> P2POffer domain validation
  -> OfferRepository.publishOffer()
  -> response DTO
```

La creación valida la tenencia actual, pero no la transfiere ni la reserva.

### Consultar ofertas

```text
GET /api/p2p/offers?playerId=...
  -> requireAuth
  -> P2POfferController
  -> P2POfferService
  -> OfferRepository.findAvailableOffers()
```

Solo se devuelven ofertas `OPEN`. El filtro de jugador es opcional.

### Aceptar oferta

```text
POST /api/p2p/offers/{offerId}/accept
  -> requireAuth
  -> Idempotency-Key
  -> P2POfferController
  -> P2PTradeService
  -> persistence transaction context (technical detail hidden below the service)
       P2PTradeService coordinates:
         OfferRepository.findOfferForCompletion()
         UserRepository.findTradeParticipants()
         PortfolioRepository.findTradeHoldings()
         P2PTrade.complete()
         OfferRepository.completeOffer()
         MarketRepository.recordCompletedTrade()
         MarketRepository.recordFinancialTransition()
         P2PTradeService builds response from the recorded transition
  -> response for authenticated buyer
```

El vendedor no se obtiene del request. El comprador es el sujeto autenticado.

### Cancelar oferta

```text
DELETE /api/p2p/offers/{offerId}
  -> requireAuth
  -> P2POfferController
  -> P2POfferService
  -> OfferRepository.findOwnedOffer()
  -> P2POffer.cancel()
  -> OfferRepository.cancelOffer()
```

Cancelar no mueve saldos ni tokens.

## Naming and Domain Vocabulary

Los nombres de clases, métodos, comandos y respuestas expuestos desde route, controller, service y dominio DEBEN usar vocabulario del negocio y permanecer independientes de la implementación.

Se prefieren nombres como:

- `publishOffer`, `findAvailableOffers`, `cancelOffer`.
- `completeOffer`, `recordCompletedTrade`, `recordFinancialTransition`.
- `P2POffer`, `P2PTrade`, `OfferView`, `P2PTradeReceipt`.

Se deben evitar nombres ligados a bajo nivel o a un framework, como `executeQuery`, `findOpenForUpdate`, `lockAccounts`, `saveRow`, `insertOffer`, `updateStatus`, `withTransaction` o `DrizzleOffer`. Las operaciones de SQL, locks, commits y rollbacks quedan encapsuladas dentro de los adapters de persistencia y no se filtran como vocabulario de las capas superiores. Si un detalle técnico es necesario internamente, debe quedar restringido al adapter y no formar parte del contrato del service.

## Layer Responsibilities

La regla principal del diseño es que el service coordina el caso de uso; ningún repository decide el flujo de negocio ni invoca directamente modelos de dominio.

### Route / middleware

- Recibe el request HTTP y obtiene autenticación, correlation ID e idempotency key.
- Ejecuta `requireAuth` y delega la validación sintáctica a los schemas.
- Traduce excepciones a la respuesta HTTP existente.
- No consulta repositories, no instancia reglas de negocio y no calcula saldos.

### Schema / DTO

- Valida forma, tipos, UUIDs, cantidades, precio y campos desconocidos.
- Convierte parámetros de ruta y query a comandos tipados.
- No valida existencia de jugador, tenencia, saldo ni estado de una oferta.

### Controller

- Recibe el actor autenticado y el comando validado.
- Invoca únicamente al service correspondiente.
- Mapea el resultado de aplicación a DTOs públicos y decide códigos de éxito.
- No conoce Drizzle, tablas, locks ni reglas de transferencia.

### Service

- Es el coordinador del caso de uso.
- Resuelve la identidad autenticada, carga datos mediante repositories y decide qué operación de dominio ejecutar.
- Inicia el contexto transaccional a través de una abstracción de persistencia y coordina las llamadas a los repositories dentro de ese contexto.
- Ejecuta `P2POffer.create/cancel` o `P2PTrade.execute` con entidades de dominio.
- Ordena validaciones de existencia, autorización, saldo, tenencia, idempotencia y estado.
- Construye el resultado de aplicación sin exponer snapshots de auditoría ni saldos de terceros.
- No contiene consultas SQL ni conoce detalles de tablas.

### Domain models

- `User` mantiene invariantes de saldo.
- `TokenHolding` mantiene invariantes de cantidad y precio promedio.
- `P2POffer` mantiene cantidad, precio y transiciones `OPEN -> FILLED/CANCELLED`.
- `P2PTrade` aplica la transferencia entre comprador y vendedor y produce el resultado/auditoría necesarios.
- No dependen de Next.js, Drizzle, HTTP ni repositories.

### Repositories / persistence

- Ejecutan lecturas, escrituras, locks y mapeo entre filas y entidades.
- Proveen un contexto transaccional interno, pero no coordinan el caso de uso ni exponen su nombre técnico al service.
- Exponen operaciones con vocabulario de negocio como `findOfferForCompletion`, `findTradeParticipants`, `findTradeHoldings`, `recordCompletedTrade` y `recordFinancialTransition`.
- No llaman servicios, no deciden BUY/SELL/P2P, no aplican `User.debit`, `TokenHolding.sell` ni cambian estados por iniciativa propia.
- La implementación de Drizzle queda encapsulada en esta capa.

### Frontend

- Los servicios cliente llaman únicamente las rutas HTTP existentes/nuevas.
- Hooks y componentes coordinan estado visual, loading, error y refresco del portfolio/historial.
- No replican reglas financieras ni acceden a persistencia.

## Contracts Between Layers

Los contratos internos deben transportar solo lo necesario para la siguiente capa:

```text
Route -> Controller
  AuthTokenPayload + parsed request + correlation/idempotency metadata

Controller -> Service
  CreateP2POfferCommand { actorId, playerId, quantity, unitPrice }
  AcceptP2POfferCommand { buyerId, offerId, idempotencyKey, correlationId }
  CancelP2POfferCommand { actorId, offerId }

Service -> Domain
  User, TokenHolding, P2POffer y datos estrictamente necesarios para la regla

Service -> Repository
  filtros, ids, comandos de persistencia y contexto transaccional; nunca Request/Response HTTP

Service -> Controller
  OfferView o P2PTradeReceipt, sin filas Drizzle ni snapshots de auditoría de terceros

Controller -> Route
  DTO público y código de estado
```

`P2PTradeService` será dueño de la secuencia del caso de uso. Puede solicitar un contexto transaccional a la infraestructura de persistencia, pero el callback y el orden de las operaciones pertenecen al service. El adapter solo abre, confirma o revierte la transacción y ejecuta las operaciones de persistencia solicitadas; esos detalles no forman parte del vocabulario de negocio.

Los repositories no reciben `AuthTokenPayload`, `Request` ni `Response`; reciben identificadores y filtros ya resueltos. Los modelos de dominio no reciben repositories ni contexto transaccional.

## Reuse Boundaries

Se reutilizan sin duplicar:

- `requireAuth` y el modelo de identidad JWT.
- `User.debit`, `User.credit` y validación de saldo.
- `TokenHolding.buy` y `TokenHolding.sell`.
- `MarketOperation` para el registro financiero único, extendiendo sus datos P2P.
- `MarketRepository` y repositories existentes como acceso a datos del negocio, sin trasladarles la coordinación del caso de uso ni exponer detalles de bajo nivel.
- `financialAuditRecords` para snapshots de comprador/vendedor.
- `Idempotency-Key` y `correlationId` existentes.
- `MarketRepository.findOperationsByInvestorId` como base del historial, ampliando el filtro a comprador o vendedor.
- Cliente y componentes existentes de historial, agregando únicamente los campos P2P necesarios.

No se reutilizará `MarketTrade` directamente para forzar la semántica de pool sobre dos inversores. Se agregará una operación P2P pequeña que use las mismas entidades y primitives de settlement sin contaminar el flujo central. La llamada a esa operación será responsabilidad de `P2PTradeService`, no de `MarketRepository`.

## Data and Transaction Design

El service inicia una única transacción mediante la abstracción transaccional de persistencia y coordina dentro de ella las operaciones de repositories y dominio. La transacción P2P debe bloquear siempre en orden estable:

1. La oferta por `id`.
2. Las cuentas de comprador y vendedor ordenadas por `userId`.
3. Las tenencias de ambos usuarios ordenadas por `userId`.

Después de obtener los locks se vuelve a validar:

- oferta `OPEN`;
- comprador distinto del vendedor;
- saldo del comprador;
- tenencia suficiente del vendedor;
- cantidad y precio persistidos de la oferta.

La operación P2P usa `investorId = buyerId` para conservar la idempotencia actual y agrega `sellerId` y `offerId`. El historial consulta operaciones donde el usuario es comprador o vendedor y calcula el lado visible: `BUY` para el comprador y `SELL` para el vendedor. El `operationId` sigue siendo único para ambas vistas.

Para no introducir una segunda noción monetaria, el campo existente de valor unitario conserva el precio ejecutado de la oferta; la referencia a una cotización puede ser nula para operaciones P2P porque no se consulta una cotización para aceptar la oferta.

La respuesta idempotente debe salir de la operación y su auditoría persistida, no del saldo actual leído después de operaciones posteriores. No se agrega una tabla ni columnas de recibo separadas.

## Project Structure

### Documentation

```text
specs/017-p2p-fixed-offers/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/p2p.yaml
└── checklists/requirements.md
```

### Source Code

```text
src/app/api/p2p/offers/route.ts
src/app/api/p2p/offers/[id]/route.ts
src/app/api/p2p/offers/[id]/accept/route.ts

src/backend/db/schema.ts
src/backend/db/migrations/0008_p2p_fixed_offers.sql
src/backend/models/P2POffer.ts
src/backend/models/P2PTrade.ts
src/backend/models/FinancialAuditRecord.ts
src/backend/models/MarketOperation.ts
src/backend/repositories/p2p-offer.repository.ts
src/backend/repositories/market.repository.ts
src/backend/services/p2p-offer.service.ts
src/backend/services/p2p-trade.service.ts
src/backend/controllers/p2p-offer.controller.ts
src/backend/schemas/p2p-offer.schema.ts

src/frontend/services/client/p2p-offer.service.ts
src/frontend/features/p2p/

tests/unit/models/p2p-offer.spec.ts
tests/unit/models/p2p-trade.spec.ts
tests/unit/services/p2p-offer.service.spec.ts
tests/unit/services/p2p-trade.service.spec.ts
tests/unit/services/client.p2p-offer.service.spec.ts
tests/integration/p2p-offers.repository.spec.ts
tests/integration/p2p-offers.routes.spec.ts
tests/e2e/p2p-trading-journey.spec.ts
```

**Structure Decision**: Se mantiene el layout web existente. La lógica P2P se ubica junto a los módulos de mercado actuales; no se crea un nuevo bounded context, aplicación, worker ni almacenamiento alternativo.

## Implementation Phases

1. **Contratos y modelos**: comandos/DTOs, `P2POffer`, `P2PTrade` y snapshots sin dependencias de infraestructura.
2. **Persistencia mínima**: oferta, estados, campos P2P opcionales en operaciones, auditoría y migración; repositories con operaciones explícitas.
3. **Services y settlement**: coordinación transaccional, locks pedidos a repositories, validaciones de contexto y ejecución del dominio.
4. **Rutas y controladores**: crear, listar, cancelar y aceptar oferta con autenticación y errores existentes.
5. **Historial compatible**: consultar una operación P2P para comprador y vendedor sin duplicarla; adaptar DTO y UI existente.
6. **Frontend mínimo**: reutilizar selección de jugador, cotización, portfolio, autenticación y estilos para publicar, listar, aceptar y cancelar.
7. **Verificación**: pruebas unitarias, integración, contrato, regresión del mercado central y quickstart.

## Complexity Tracking

No hay violaciones de la constitución que requieran justificar complejidad adicional.

| Decisión | Motivo | Alternativa más simple rechazada |
| --- | --- | --- |
| Extender operaciones y auditoría existentes | Permite un único hecho financiero e historial común | Crear tablas paralelas rompería la reutilización y duplicaría trazabilidad |
| Reutilizar snapshot de auditoría para el recibo | Garantiza que un retry devuelva el resultado original sin otra persistencia | Recalcular desde el saldo actual puede devolver un resultado incorrecto |
