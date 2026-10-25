# Tasks: Compra y Venta de Tokens de Jugadores

**Input**: Design documents from `specs/005-player-token-trading/`  
**Base branch**: `feature/004-player-quote-queries`  
**Branch**: `feature/005-player-token-trading`  
**Scope**: Compra/venta inmediata contra el único `SUPERUSER`, portfolio
mínimo, persistencia atómica y auditoría financiera append-only.

## Reglas de ejecución

- Todas las tareas pertenecen exclusivamente a esta feature.
- `feature/004-player-quote-queries` es la base de esta feature y ya contiene
  las dependencias de valuación y consulta de cotizaciones; no se implementan
  ni modifican en estas tareas.
- No se agrega libro de órdenes, matching entre inversores, comisiones,
  depósitos, retiros, frontend ni historial público de operaciones.
- El pool se resuelve por el único usuario `SUPERUSER`; no se persiste `poolId`.
- `market_operations` contiene el hecho comercial y
  `financial_audit_records` contiene snapshots de auditoría. No se mezclan sus
  responsabilidades.

## Phase 0: Preparación y dependencias

### T001 — Crear la branch de la feature

- **Área**: Git.
- **Acción**: crear `feature/005-player-token-trading` desde
  `feature/004-player-quote-queries`.
- **Verificación**: `git branch --show-current` devuelve la branch indicada y
  no se trabaja directamente sobre `main`.

### T002 — Verificar las dependencias de cotización

- **Archivos/áreas**: implementación disponible en
  `feature/004-player-quote-queries`, sin modificarla.
- **Acción**: confirmar que existe una consulta reutilizable para obtener la
  última cotización persistida de un jugador, junto con `quoteId`, `quoteValue`
  y `calculatedAt`.
- **Verificación**: documentar en el PR qué servicio/repositorio se reutiliza;
  no crear una segunda consulta ni invocar el motor de valuación.

### T003 — Confirmar el pool y la inicialización existente

- **Archivos/áreas**: seed/sincronización existente de usuarios y jugadores.
- **Acción**: identificar cómo se crea el único `SUPERUSER`, su saldo inicial,
  la cotización inicial `1.00` y los 100 tokens por jugador.
- **Verificación**: definir si se reutiliza el seed existente o si esta feature
  agrega una inicialización idempotente mínima; no duplicar seeds.

**Checkpoint 0**: Las dependencias están disponibles y la feature tiene una
única fuente para cotizaciones, pool y emisión inicial.

## Phase 1: Modelo de dominio

### T004 — Definir invariantes de `TokenHolding`

- **Archivo**: `src/backend/models/TokenHolding.ts`.
- **Acción**: definir operaciones de dominio para aumentar una posición,
  reducirla y liquidarla, manteniendo cantidad entera no negativa y precio
  promedio válido.
- **Verificación**: las operaciones no importan Drizzle, Next.js ni HTTP.

### T005 — Implementar promedio ponderado de compra

- **Archivo**: `src/backend/models/TokenHolding.ts`.
- **Acción**: implementar el promedio ponderado usando la cotización de la
  compra y redondeo monetario a dos decimales.
- **Verificación**: el total usa la cotización ejecutada; el promedio se
  persiste a dos decimales; una posición vacía adopta el precio de compra.

### T006 — Implementar reducción y liquidación de posición

- **Archivo**: `src/backend/models/TokenHolding.ts`.
- **Acción**: rechazar ventas superiores a la cantidad disponible, conservar el
  promedio en ventas parciales y establecerlo en cero en ventas totales.
- **Verificación**: la cantidad nunca queda negativa y la venta no recalcula el
  precio promedio restante.

### T007 — Testear las reglas de posición

- **Archivo**: `tests/unit/models/TokenHolding.spec.ts`.
- **Acción**: agregar tests para compra inicial, compra acumulada, venta
  parcial, venta total, cantidad cero, negativos, fracciones y exceso de venta.
- **Verificación**: tests unitarios verdes sin conexión a PostgreSQL.

### T008 — Crear el objeto de dominio `MarketOperation`

- **Archivo nuevo**: `src/backend/models/MarketOperation.ts`.
- **Acción**: definir un registro inmutable con tipo, inversor, jugador,
  cotización, cantidad, total, unidad, correlation ID y fecha.
- **Verificación**: no contiene saldos, posiciones ni snapshots de auditoría;
  valida tipo, cantidades e importes positivos.

### T009 — Crear el objeto de dominio `FinancialAuditRecord`

- **Archivo nuevo**: `src/backend/models/FinancialAuditRecord.ts`.
- **Acción**: definir snapshots anterior/posterior del inversor y del pool,
  actor, acción, operación relacionada, correlation ID y fecha.
- **Verificación**: el objeto es inmutable y no repite jugador, cantidad,
  cotización ni total de `MarketOperation`.

### T010 — Testear los objetos financieros

- **Archivo nuevo**: `tests/unit/models/market-operation.spec.ts`.
- **Acción**: cubrir invariantes de operación y auditoría, tipos `BUY`/`SELL`,
  datos obligatorios e imposibilidad de estados financieros inválidos.
- **Verificación**: tests unitarios verdes y sin dependencias de persistencia.

**Checkpoint 1**: El dominio puede expresar compra, venta, operación y
auditoría sin conocer la infraestructura.

## Phase 2: Persistencia y migración

### T011 — Agregar `market_operations` al esquema Drizzle

- **Archivo**: `src/backend/db/schema.ts`.
- **Acción**: agregar columnas, foreign keys a usuario, jugador y cotización,
  checks para tipo/cantidad/importe e índices por inversor, jugador y fecha.
- **Verificación**: la tabla no contiene `poolId`, saldos, tenencias ni PnL.

### T012 — Agregar `financial_audit_records` al esquema Drizzle

- **Archivo**: `src/backend/db/schema.ts`.
- **Acción**: agregar referencia única a `market_operations`, actor, acción,
  snapshots JSONB, correlation ID y fecha.
- **Verificación**: la auditoría es append-only a nivel de aplicación y no
  repite los datos descriptivos de la operación.

### T013 — Generar y revisar la migración

- **Archivos**: `src/backend/db/migrations/<migration>.sql` y snapshot Drizzle.
- **Acción**: generar la migración de ambas tablas y revisar foreign keys,
  checks, índices y orden de creación.
- **Verificación**: aplicar la migración sobre PostgreSQL limpio y existente;
  las tablas previas permanecen intactas.

### T014 — Testear restricciones de persistencia

- **Archivo**: `tests/integration/market-operations.repository.spec.ts`.
- **Acción**: verificar foreign keys, cantidad positiva, integridad de
  operación-auditoría y rechazo de modificaciones inválidas.
- **Verificación**: tests contra PostgreSQL real, habilitados según el patrón
  `RUN_DB_INTEGRATION_TESTS` del proyecto.

### T015 — Persistir y resolver el pool de forma idempotente

- **Archivos**: seed/sincronización existente y repositorio de mercado.
- **Acción**: resolver el único `SUPERUSER`; si esta feature debe inicializarlo,
  crear de forma idempotente la posición de 100 tokens y no sobrescribir una
  posición existente.
- **Verificación**: ejecutar el proceso dos veces no duplica usuarios,
  tenencias ni tokens.

**Checkpoint 2**: El esquema soporta operaciones y auditoría sin duplicar las
fuentes de verdad del dominio.

## Phase 3: Repositorios y frontera transaccional

### T016 — Definir el executor transaccional de mercado

- **Archivo nuevo**: `src/backend/repositories/market.repository.ts`.
- **Acción**: definir el límite `executeTrade` y operaciones de lectura y
  escritura que acepten el executor transaccional de Drizzle.
- **Verificación**: ningún repositorio inicia una segunda transacción anidada.

### T017 — Implementar locks de cuentas y posiciones

- **Archivo**: `src/backend/repositories/market.repository.ts`.
- **Acción**: bloquear usuarios y tenencias del inversor y del pool en orden
  estable antes de validar saldos o disponibilidad.
- **Verificación**: dos operaciones concurrentes no pueden gastar el mismo
  saldo ni transferir los mismos tokens.

### T018 — Implementar lectura de cotización vigente

- **Archivos**: repositorio/servicio de `004-player-quote-queries` y
  `src/backend/repositories/market.repository.ts`.
- **Acción**: reutilizar la consulta existente o delegar en ella; capturar
  `quoteId`, valor y fecha dentro de la transacción.
- **Verificación**: no se ejecuta `ValuationEngine`, no se recalculan quotes y
  no se llama a fuentes externas.

### T019 — Implementar liquidación y persistencia de compra

- **Archivos**: `src/backend/models/MarketTrade.ts` y
  `src/backend/repositories/market.repository.ts`.
- **Acción**: delegar al objeto de dominio la actualización de saldos y
  posiciones, y al repository guardar `market_operations` y
  `financial_audit_records` con snapshots.
- **Verificación**: todo ocurre dentro de una transacción y devuelve estado
  posterior.

### T020 — Implementar liquidación y persistencia de venta

- **Archivos**: `src/backend/models/MarketTrade.ts` y
  `src/backend/repositories/market.repository.ts`.
- **Acción**: realizar la transferencia inversa en el objeto de dominio,
  validando tenencia del inversor y saldo del pool, y guardar el resultado.
- **Verificación**: la suma de tokens antes y después sigue siendo 100.

### T021 — Testear rollback transaccional

- **Archivo**: `tests/integration/market-operations.repository.spec.ts`.
- **Acción**: provocar fallos al actualizar saldos, posiciones, operación o
  auditoría y verificar rollback completo.
- **Verificación**: no quedan cambios parciales ni registros huérfanos.

### T022 — Testear concurrencia básica

- **Archivo**: `tests/integration/market-operations.repository.spec.ts`.
- **Acción**: ejecutar compras/ventas concurrentes sobre el mismo jugador y
  cuenta.
- **Verificación**: no hay saldo negativo, tenencias negativas ni emisión
  distinta de 100; los conflictos se traducen a `409`.

**Checkpoint 3**: La persistencia garantiza atomicidad, conservación y
auditabilidad antes de exponer HTTP.

## Phase 4: Compra y venta de mercado

### T023 — Crear schema estricto de órdenes

- **Archivo nuevo**: `src/backend/schemas/market-operation.schema.ts`.
- **Acción**: validar UUID de jugador, cantidad entera positiva y ausencia de
  campos confiados (`userId`, `poolUserId`, `quoteValue`, `total`).
- **Verificación**: body inválido responde con error de validación sin tocar la
  base.

### T024 — Implementar servicio de compra

- **Archivo nuevo**: `src/backend/services/market-operation.service.ts`.
- **Acción**: recibir `auth.sub` y request validado, resolver jugador/pool/quote,
  delegar reglas de dominio y persistencia transaccional.
- **Verificación**: el usuario autenticado es siempre el inversor afectado.

### T025 — Implementar servicio de venta

- **Archivo**: `src/backend/services/market-operation.service.ts`.
- **Acción**: delegar la operación de venta con las mismas reglas de identidad,
  quote y atomicidad.
- **Verificación**: no se puede vender desde una tenencia ajena ni operar como
  pool mediante el endpoint inversor.

### T026 — Testear el servicio de mercado

- **Archivo nuevo**: `tests/unit/services/market-operation.service.spec.ts`.
- **Acción**: cubrir compra, venta, saldo insuficiente, tokens insuficientes,
  tenencia insuficiente, quote ausente, pool ausente, actor inválido y
  rollback delegado.
- **Verificación**: tests con dobles de repositorio; sin repetir tests SQL.

### T027 — Crear controller de operaciones

- **Archivo nuevo**: `src/backend/controllers/market-operation.controller.ts`.
- **Acción**: mapear request autenticado al servicio y serializar operación,
  saldo posterior y tenencia posterior.
- **Verificación**: el controller no contiene reglas de saldo, tokens o precio.

### T028 — Exponer compra y venta

- **Archivos nuevos**: `src/app/api/orders/buy/route.ts` y
  `src/app/api/orders/sell/route.ts`.
- **Acción**: aplicar `requireAuth`, parsear schema, delegar al controller y
  usar `toHttpResponse`.
- **Verificación**: `201`, `400`, `401`, `404` y `409` coinciden con el
  contrato; no se aceptan identificadores de usuario del cliente.

**Checkpoint 4**: Compra y venta funcionan por HTTP sobre la transacción ya
verificada.

## Phase 5: Portfolio mínimo

### T029 — Implementar consulta de portfolio

- **Archivo nuevo**: `src/backend/repositories/portfolio.repository.ts`.
- **Acción**: consultar únicamente holdings del actor con cantidad positiva y
  unir la cotización vigente ya persistida.
- **Verificación**: no se consultan operaciones ni posiciones del pool.

### T030 — Implementar `PortfolioService`

- **Archivo nuevo**: `src/backend/services/portfolio.service.ts`.
- **Acción**: calcular `currentValue` y `unrealizedPnl` en memoria; mantener
  `null` si no existe cotización vigente, sin fallback silencioso.
- **Verificación**: no se persisten valores derivados.

### T031 — Crear controller y route de portfolio

- **Archivos nuevos**: `src/backend/controllers/portfolio.controller.ts` y
  `src/app/api/portfolio/route.ts`.
- **Acción**: derivar usuario desde `auth.sub` y devolver saldo e items activos.
- **Verificación**: no existe `userId` en path/query/body y un usuario no ve
  holdings ajenos.

### T032 — Testear portfolio y resultado de operaciones

- **Archivos**: `tests/unit/services/portfolio.service.spec.ts` y
  `tests/integration/market.routes.spec.ts`.
- **Acción**: probar portfolio vacío, posición activa, cotización ausente,
  aislamiento por usuario y estado posterior de compra/venta.
- **Verificación**: los cálculos coinciden con la cotización y posición actuales.

**Checkpoint 5**: El inversor puede operar y verificar su posición sin una
consulta de usuario confiada.

## Phase 6: API, documentación y cierre

### T033 — Actualizar contrato OpenAPI principal

- **Archivo**: `specs/001-player-token-marketplace/contracts/openapi.yaml`.
- **Acción**: agregar las tres rutas, BearerAuth, schemas de request/response y
  respuestas `200`, `201`, `400`, `401`, `404`, `409` y `500`.
- **Verificación**: `/api/docs` carga el contrato sin errores y no documenta
  campos que el cliente no puede enviar.

### T034 — Mantener contrato aislado de la feature

- **Archivo**: `specs/005-player-token-trading/contracts/market.yaml`.
- **Acción**: sincronizarlo con la implementación final, incluyendo el pool
  implícito y la ausencia de `poolId`.
- **Verificación**: ejemplos y schemas coinciden con las respuestas reales.

### T035 — Actualizar colección Postman

- **Archivo**: `specs/001-player-token-marketplace/contracts/postman_collection.json`.
- **Acción**: agregar requests autenticados de buy, sell y portfolio sin
  `userId` en el body.
- **Verificación**: la colección permite reproducir el quickstart con un JWT.

### T036 — Documentar demostración MVP

- **Archivo**: `specs/005-player-token-trading/quickstart.md`.
- **Acción**: documentar seed/login, consulta de quote, compra, portfolio,
  venta y conservación de 100 tokens.
- **Verificación**: otra persona puede ejecutar el flujo sin interpretar reglas
  no documentadas.

### T037 — Ejecutar validación final

- **Áreas**: suite del proyecto y archivos de la feature.
- **Acción**: ejecutar tests dirigidos, integración PostgreSQL, `npm test`,
  `npm run lint`, `npx tsc --noEmit`, `npm run build` y `git diff --check`.
- **Verificación**: registrar resultados; los fallos preexistentes deben quedar
  identificados y no ocultarse.

### T038 — Revisar alcance y fuentes de verdad

- **Archivos**: diff completo de `specs/005-player-token-trading/` y código.
- **Acción**: confirmar que no se agregaron tabla `portfolio`, PnL persistido,
  libro de órdenes, cotización duplicada calculada ni funcionalidad externa.
- **Verificación**: checklist de out-of-scope completo y listo para review.

**Checkpoint final**: La feature tiene implementación verificable, migración,
tests, contrato OpenAPI, colección Postman y quickstart sincronizados.

## Dependencias y orden

```text
T001-T003
    -> T004-T010
    -> T011-T015
    -> T016-T022
    -> T023-T028
    -> T029-T032
    -> T033-T038
```

No se inicia una fase antes de completar el checkpoint de la fase anterior.
