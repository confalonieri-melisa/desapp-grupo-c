# Data Model: trading en perfil

Modelos de transporte y de estado de interfaz. No se crean tablas ni se alteran entidades persistidas.

## Identidad del contexto

| Dato | Origen | Uso |
|---|---|---|
| `player.id`, nombre visible | Perfil confirmado de `GET /api/players/{id}` | Filtrar posición y etiquetar confirmación/comprobante. |
| `token` | `AuthContext` | Bearer en todas las llamadas; identidad de sesión para invalidar respuestas tardías. |
| `user.role` | `AuthContext` | Mostrar controles solo a INVESTOR; el backend decide autorización final. |

No hay entrada ni selección de `userId`. Los `userId` recibidos en la respuesta de orden no se usan para determinar la identidad de pantalla.

## DTO existentes

### Cotización vigente

`PlayerQuoteDto` de `services/client/player-quotes.service.ts`: `playerId`, `quoteValue: number`, `unit: CREDIT_PER_TOKEN`, `calculatedAt` y metadatos. La actual es `history.items[0]` del hook existente. Su estado distingue carga, vacío, éxito y error. Solo el valor vigente habilita operaciones.

### Portfolio

`PortfolioSnapshot = { creditBalance: number; items: PortfolioItem[] }`.

`PortfolioItem = { playerId: string; quantity: number; averagePurchasePrice: number; currentQuoteValue: number | null; currentValue: number | null; unrealizedPnl: number | null }`.

Una búsqueda exacta por `playerId` produce cero o una posición visible. `items.length === 0` identifica portfolio vacío; una lista con otras posiciones y sin la del jugador indica solo «sin tokens de este jugador». Ninguna de ambas crea precio promedio o PnL ficticio. `null` se presenta como «No disponible»; `0` y negativos se muestran como números.

### Solicitud y resultado

`MarketOrderRequest = { playerId: string; quantity: number }`, sin campos adicionales. `playerId` sale del perfil confirmado y `quantity` de la entrada validada.

`MarketOperationResult = { operation: { id: string; type: BUY | SELL; userId: string; playerId: string; quantity: number; quoteValue: number; total: number; createdAt: string }; account: { creditBalance: number }; holding: { quantity: number; averagePurchasePrice: number } }`.

El comprobante usa `operation.type`, `quantity`, `quoteValue` y `total` del 201. `account` y `holding` pertenecen a la respuesta, pero el saldo y la posición presentados como actuales provienen de la consulta nueva del portfolio.

## Estado de interfaz

| Estado | Campos / significado | Transiciones |
|---|---|---|
| `portfolio.idle/loading` | Sin cifras actuales; indica carga | `success`, `empty` o `error` tras GET. |
| `portfolio.success` | Snapshot vigente; puede tener posición del jugador o solo otras posiciones | `refreshing` por reintento o tras 201. |
| `portfolio.empty` | `items=[]` con saldo vigente | `refreshing` por reintento o tras 201. |
| `portfolio.error` | Error y acción de reintento; cotización independiente permanece visible | `loading/refreshing` por reintento. |
| `portfolio.refreshing` | GET posterior a orden o reintento; cifras previas no se presentan como actuales | `success`, `empty` o `error`. |
| `draft` | Tipo BUY/SELL y cantidad como texto; validación inline | `confirming` si es válida y hay cotización, saldo/tenencia conocidos. |
| `confirming` | Snapshot de jugador, tipo, cantidad, cotización y total orientativo | Cancelar vuelve a `draft` sin POST; confirmar pasa a `submitting`. |
| `submitting` | Candado sincrónico y progreso; una sola solicitud POST | 201 a `succeeded` y `refreshing`; rechazo explícito a `rejected`; fallo no confirmado a `uncertain`. |
| `succeeded` | Comprobante 201 inmutable y etiquetado con el jugador | Se conserva durante el refresco, incluso si éste falla. |
| `rejected` | Motivo conocido o rechazo genérico; cantidad preservada | Corrección de entrada y/o refresco antes de otro intento. |
| `uncertain` | Ejecución desconocida; ofrece consultar portfolio | Refresco aporta datos vigentes, sin inferir ejecución de la orden. |

## Reglas de validación y vigencia

- Cantidad: texto de dígitos enteros, valor `Number.isSafeInteger`, mayor que cero y no superior a 2.147.483.647; rechazar vacío, signos, decimales, exponentes y texto mixto.
- Compra: el total orientativo de la cotización visible no supera `creditBalance` vigente. Venta: cantidad no supera `position.quantity` vigente. Si faltan cotización o portfolio vigente, no se confirma.
- Un cambio de jugador o token invalida selección, cifras y respuestas GET del contexto anterior. La respuesta de un POST pendiente mantiene su snapshot original: puede producir comprobante contextual si sigue la misma sesión, sin alterar los datos del nuevo jugador. Un cambio de sesión borra todo dato financiero y comprobante anterior.
- Una lectura posterior al 201 tiene identidad/generación propia. Solo su resultado vigente cambia la presentación de saldo y posición; un error deja el comprobante y una acción para reintentar GET.
