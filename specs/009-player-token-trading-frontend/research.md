# Research: trading desde el perfil

**Fecha**: 2026-10-25. Fuentes: código, pruebas y contratos locales de las features 004, 005 y 008. Se investigó el comportamiento actual; no se agregan tecnologías.

## Integración de cotización y perfil

**Decision**: Elevar `usePlayerQuotes` desde `PlayerQuotesSection` a `src/app/players/[id]/page.tsx` y compartir su `current` e indicadores de carga/error con ambas secciones. `current` continúa siendo `history.items[0]`, sin ordenar ni recalcular.

**Rationale**: `usePlayerQuotes.ts` ya maneja abortos, generaciones, 401 y selecciona el registro vigente. La sección actual consume privadamente el hook; montar otro hook duplicaría la consulta. `PlayerApiDetail.currentQuote` no representa la cotización persistida de 004.

**Alternatives considered**: segunda consulta de cotizaciones (solicitud duplicada), usar `currentQuote` del perfil (dato incorrecto), estado global (alcance innecesario).

## Cliente HTTP y errores

**Decision**: Cliente tipado para `GET /api/portfolio` y `POST /api/orders/{buy,sell}` con Bearer JWT, `AbortSignal` para lecturas, y error con `status` y texto del campo `{error}`. Enviar estrictamente `{playerId, quantity}`. Conservar el resultado efectivo `operation` como comprobante.

**Rationale**: Las rutas y `to-http-response.ts` devuelven `{error}` para 400, 401, 404 y 409; la documentación anterior `specs/005-player-token-trading/contracts/market.yaml` usa `{message}` y rutas `/orders/*`. La integración en Next expone `/api/orders/*`. El 500 puede no traer JSON utilizable; el cliente debe admitir mensaje genérico.

**Alternatives considered**: confiar en `market.yaml` sin contrastarlo con las rutas (rompe mensajes de error), enviar `userId` (contradice JWT y spec), crear un cliente HTTP general (abstracción innecesaria).

## Portfolio y posición visible

**Decision**: Leer el portfolio íntegro como DTO, seleccionar exclusivamente `items.find(item => item.playerId === player.id)` y mostrar el saldo. Sin posición: tenencia cero y métricas de posición ausentes. Mostrar `currentQuoteValue`, `currentValue` y `unrealizedPnl` recibidos, preservando `null`, cero y valores negativos.

**Rationale**: `PortfolioService` expone los tres campos como `number | null`; `PortfolioRepository` filtra cantidad > 0, por lo que una venta total elimina la posición del resultado aunque la fila permanezca en DB. El saldo de `AuthContext.user` proviene del login y puede estar desactualizado; la fuente de pantalla debe ser `GET /api/portfolio`.

**Alternatives considered**: calcular PnL/valor actual en frontend (contradice contrato), mostrar todo el portfolio en cada perfil (fuera de alcance), usar saldo de sesión como actual (obsoleto tras operar).

## Cantidad y total orientativo

**Decision**: Mantener la entrada como texto hasta validarla con dígitos decimales enteros, `Number.isSafeInteger` y rango 1..2.147.483.647, límite de `integer` PostgreSQL usado para cantidades. Calcular cantidad por cotización visible como total orientativo en créditos, con redondeo de presentación a centavos coherente con el total monetario actual; validar frente al saldo visible. Revalidar al confirmar con el snapshot visible y dejar al backend la decisión final.

**Rationale**: Zod exige número entero positivo, pero la persistencia usa `integer` y el navegador usa `number`; limitar antes del envío evita cantidades que no caben en DB o pierden precisión. La cotización puede cambiar entre visualización y ejecución. `MarketOperation.total` redondea a dos decimales; el total anterior es solo una ayuda para decidir y nunca reemplaza `operation.total`.

**Alternatives considered**: confiar solo en `type=number` (permite entradas intermedias/decimales), usar `parseInt` (acepta texto parcial), presentar producto sin unidad ni redondeo (confunde la comparación), inventar límite menor (regla no aprobada).

## Rechazos y resultado incierto

**Decision**: Traducir solo combinaciones de status y texto conocidas: 409 `Insufficient credit balance`, `Insufficient token holding`, `Insufficient tokens in central pool`, `Insufficient central pool balance`, `The central pool cannot operate as an investor`; 404 `Current quote not available`; 401 invalida sesión. Otros 400/404/409 se muestran como rechazo genérico con actualización de datos. Fallos de red, respuesta no confirmada o 5xx se presentan como estado indeterminado, con acción para consultar portfolio antes de decidir repetir. Un 201 mantiene su comprobante incluso si falla la actualización del portfolio.

**Rationale**: `MarketTrade.ts` y `MarketRepository.ts` contienen esas cadenas exactas. El transporte puede fallar después de que el servidor procese la orden; no existe clave de idempotencia ni consulta de órdenes en el alcance. Un portfolio posterior aporta contexto, pero no prueba por sí solo si una orden incierta se ejecutó.

**Alternatives considered**: atribuir todo 409 a saldo/tenencia (puede ser pool/rol), reintento automático de POST (riesgo de duplicación), asumir fracaso ante un error de red (afirmación no sustentada).

## Concurrencia, identidad y accesibilidad

**Decision**: Invalidar lecturas y estados financieros al cambiar token/jugador; comprobar identidad y generación antes de cada éxito, error y `finally`. Bloquear sincrónicamente el envío al confirmar para cubrir doble clic antes del rerender. Mantener un snapshot de jugador, operación, cantidad y token para etiquetar el comprobante de una orden pendiente; ante cambio de jugador, ese resultado no modifica el portfolio visible. Ante cambio de sesión, borrar datos protegidos y no presentar resultados de la anterior. Usar diálogo accesible con foco inicial, retorno de foco, Escape/cancelación, `aria-describedby`, `aria-invalid` y regiones de estado.

**Rationale**: `usePlayerProfile` y `usePlayerQuotes` ya aíslan lecturas tardías. Una orden enviada no se puede deshacer abortando `fetch`. La página recibe el rol en `AuthContext.user.role`; SUPERUSER no verá controles operativos. `vitest.config.mts` usa Node y `tests/unit/features/profile/hook-harness.ts` permite probar secuencias de hooks; foco y diseño requieren inspección real en navegador.

**Alternatives considered**: solo deshabilitar el botón mediante estado React (ventana de doble clic), abortar POST y tratarlo como fracaso (incierto), guardar recibos en estado global/persistencia (fuera de alcance), asumir accesibilidad solo por tests de hooks (no comprueba DOM).
