# Data Model: Mi portfolio

No hay persistencia nueva. Los siguientes objetos son lecturas o proyecciones de presentación.

## PortfolioSnapshot (existente)

| Campo | Tipo | Regla |
|---|---|---|
| `creditBalance` | número | Saldo disponible en créditos; cero es válido. |
| `items` | lista de `PortfolioItem` | Solo posiciones actuales de la sesión autenticada; puede estar vacía. |

## PortfolioItem (existente)

| Campo | Tipo | Regla |
|---|---|---|
| `playerId` | identificador | Identifica de forma única al jugador de la posición. |
| `quantity` | número | Tokens poseídos. |
| `averagePurchasePrice` | número | Créditos por token. |
| `currentQuoteValue` | número o `null` | `null` indica que falta cotización; cero es un valor distinto. |
| `currentValue` | número o `null` | Valor actual en créditos; `null` se excluye del valor agregado. |
| `unrealizedPnl` | número o `null` | Resultado no realizado en créditos; puede ser negativo, cero o positivo; `null` se excluye de su agregado. |

## PlayerReference (derivado)

`playerId`, nombre opcional y estado de resolución (`pending`, `resolved`, `unavailable`). El identificador permanece visible cuando el nombre no se obtiene. Una falla de nombre no invalida el portfolio.

## PlayerQuoteTrend (derivado)

En el perfil del jugador se reutiliza el historial de cotizaciones ya cargado. Los puntos se ordenan por `calculatedAt`; el eje horizontal representa el tiempo transcurrido y el vertical el `quoteValue`. Se muestran fechas y valores inicial/final y el sentido del cambio. Con cero o un punto se explica que no hay evolución comparable. Un fallo conserva el error y reintento existentes de cotizaciones; no modifica los totales del portfolio.

## MetricAggregate (derivado)

`value: number | null`, `excludedCount: number` y estado `complete | partial | unavailable`. Para `items=[]`, valor 0, exclusiones 0 y estado `complete`. Con posiciones, los números no nulos se suman, incluidos los ceros. Si no hay ninguno, valor `null` y estado `unavailable`; si hay algunos pero no todos, estado `partial`.

Se derivan por separado `holdingsValue` de `currentValue` y `unrealizedTotal` de `unrealizedPnl`. `estimatedWorth` suma `creditBalance + holdingsValue.value` cuando este último no es `null`, y hereda estado y exclusiones de `holdingsValue`.

## PortfolioViewState (derivado)

Campos: identidad de sesión, snapshot vigente o previo de esa sesión, referencias de jugadores, fase (`initial-loading`, `content`, `empty`, `refreshing`, `initial-error`, `stale-error`), mensaje de error y generación de consulta.

Transiciones: entrada → `initial-loading` → `content`/`empty`/`initial-error`; actualización con snapshot → `refreshing` → `content`/`empty`/`stale-error`; reintento desde error repite la lectura; cambio de sesión o 401 descarta snapshot y referencias. `stale-error` conserva el último snapshot de la misma sesión con aviso visible.
