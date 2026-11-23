# Research: Ofertas P2P a Precio Fijo

## Decision 1: Reutilizar la operación de mercado existente

**Decision**: Registrar la aceptación P2P en `market_operations` como un único hecho financiero, agregando comprador, vendedor y oferta como datos opcionales para conservar las operaciones centrales existentes.

**Rationale**: El proyecto ya usa `market_operations` como fuente del historial, junto con una auditoría financiera asociada. Una tabla paralela obligaría a duplicar lecturas, auditoría e historial.

**Alternatives considered**:

- Crear `p2p_operations`: rechazado porque duplicaría el historial y aumentaría la superficie de persistencia.
- Crear dos operaciones, una BUY y una SELL: rechazado porque la spec exige un único hecho financiero.

## Decision 2: Proyectar el lado del historial por usuario

**Decision**: Guardar una operación única con `buyerId` y `sellerId`. Al consultar el historial, el comprador la recibe como `BUY` y el vendedor como `SELL`, con el mismo `operationId`.

**Rationale**: Preserva el contrato conceptual que ya consume el frontend y permite que ambos usuarios vean la operación sin duplicar el hecho financiero.

**Alternatives considered**:

- Introducir un tipo `P2P` nuevo: rechazado porque obligaría a cambiar la semántica y presentación de todos los consumidores de historial.
- Guardar dos filas: rechazado por duplicación y riesgo de inconsistencias.

## Decision 3: No reservar tokens al publicar

**Decision**: Validar tenencia al crear la oferta, pero no transferirla ni bloquearla. Validar de nuevo al aceptar dentro de la transacción.

**Rationale**: Es la alternativa mínima y evita escrow, balances reservados y estados adicionales. Si el vendedor consume los tokens antes de aceptar, la aceptación falla sin cambios parciales.

**Alternatives considered**:

- Reservar tokens al publicar: rechazado para este MVP por introducir una segunda cantidad disponible/reservada y más transiciones.

## Decision 4: Precio de oferta independiente de la cotización

**Decision**: Persistir el precio fijo de la oferta y usarlo como importe unitario de la aceptación. No consultar ni modificar cotizaciones al aceptar.

**Rationale**: Las cotizaciones se recalculan semanalmente en `main`; usar una cotización posterior cambiaría el contrato de una oferta ya publicada.

**Alternatives considered**:

- Recalcular con la cotización vigente al aceptar: rechazado porque viola el precio fijo.
- Copiar el flujo central completo y vender al pool: rechazado porque no es P2P.

## Decision 5: Recibo persistente para idempotencia

**Decision**: Reconstruir la respuesta de aceptación desde la operación P2P y el `financial_audit_record` asociado, cuyo snapshot posterior ya persiste el estado de comprador y vendedor.

**Rationale**: El replay actual del mercado central consulta el estado actual; después de operaciones posteriores eso puede devolver un saldo o tenencia que no corresponde a la aceptación original. Reutilizar la auditoría corrige este límite sin agregar una tabla general ni columnas de recibo.

**Alternatives considered**:

- Responder con el saldo actual: rechazado porque no garantiza idempotencia observable.
- Crear una tabla general de requests idempotentes: rechazado por ser infraestructura fuera del MVP; se reutiliza el snapshot de auditoría.

## Decision 6: Locks en orden estable

**Decision**: Bloquear oferta, usuarios y tenencias en orden determinista dentro de la transacción.

**Rationale**: Evita doble aceptación de una oferta y reduce deadlocks con operaciones centrales y otras aceptaciones.

**Alternatives considered**:

- Confiar solo en el estado leído antes de actualizar: rechazado por carreras concurrentes.
- Incorporar un servicio de matching o cola: rechazado por estar fuera del MVP.

## Decision 7: El service coordina; los repositories persisten

**Decision**: `P2PTradeService` será dueño de la secuencia del caso de uso. Los repositories expondrán operaciones de lectura, locks, transacción y persistencia, pero no invocarán dominio ni decidirán el flujo.

**Rationale**: Mantiene la arquitectura en capas del proyecto: HTTP adapta, service orquesta, dominio valida invariantes y persistence encapsula Drizzle. También permite reutilizar el contexto transaccional sin convertir `MarketRepository` en un segundo service.

**Alternatives considered**:

- `MarketRepository.executeP2PTrade()` como método que carga estado, ejecuta reglas y persiste: rechazado porque mezcla coordinación de aplicación con acceso a datos.
- Acceso directo del service a Drizzle: rechazado porque rompe la separación de infraestructura.

## Decision 8: Nomenclatura orientada al negocio

**Decision**: Los nombres de objetos y métodos visibles entre capas expresan acciones y conceptos del dominio: `publishOffer`, `findAvailableOffers`, `completeOffer`, `cancelOffer`, `P2POffer`, `P2PTrade` y `recordCompletedTrade`.

**Rationale**: Evita que la arquitectura quede acoplada a SQL, Drizzle, filas, locks o detalles de transacción. Los adapters pueden encapsular esos detalles internamente, pero no deben filtrarlos hacia services, controllers, dominio o frontend.

**Alternatives considered**:

- Exponer nombres como `insertOffer`, `findOpenForUpdate` o `withTransaction` entre capas: rechazado porque comunica mecanismos de implementación en lugar de intención de negocio.
