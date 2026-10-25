# Data model: proyecciones y estado de interfaz

Sin entidades persistidas nuevas, tablas ni migraciones. Player y PlayerQuote siguen siendo los existentes. Se definen tipos frontend propuestos.

## PlayerQuoteDto

| Campo | Tipo serializado | Regla |
|---|---|---|
| playerId | string UUID | Jugador vigente |
| quoteValue | number | Valor recibido, cero válido |
| unit | CREDIT_PER_TOKEN | Mostrar «créditos por token» |
| calculatedAt | string ISO UTC | Mantener segundos/fracciones y zona explícita |
| strategyCode | string | Código recibido, sin catálogo cerrado nuevo |
| strategyVersion | string | Versión recibida |
| score | objeto | API actual lo garantiza; presentación tolera ausencia |

score contiene individualScore, teamScore, finalScore (números, tolerando null/ausencia en presentación) y components (valor JSON). JSON comprende objetos, arrays, strings, números, booleanos y null. Conservar nombres, estructura y todos los valores. Colecciones vacías indican ausencia de componentes; null interno conserva su propiedad y muestra indisponibilidad. No usar valores por defecto ni fórmulas.

`PlayerQuotesResponse = { items: PlayerQuoteDto[] }`. No usar el snapshot de persistencia con Date/id como DTO del navegador: id no está expuesto.

## Relaciones

- Player tiene cero o muchas cotizaciones en secuencia backend. Actual = history.items[0], o ausencia tras éxito vacío.
- Consulta puntual contiene el único item devuelto para requestedDate; no altera history.
- Explicación pertenece al objeto recibido en su superficie. Identidad local = jugador + superficie + generación + índice cuando corresponda. No identificar por timestamp.
- La posición de fila permite distinguir metadatos idénticos. Reemplazar dataset cierra detalles asociados; cambiar fecha cierra solo detalle puntual; cambiar jugador/token cierra todos.

## Estados

| Estado | Datos | Presentación |
|---|---|---|
| idle | Sin consulta vigente | Fecha sin consultar o sección no habilitada |
| loading | Identidad y generación | Carga perceptible, distinta de ausencia |
| success | Items o registro puntual | Datos vigentes |
| empty | Historial 200 [] o ausencia puntual reconocida | Mensaje específico |
| error | Status y mensaje | Error recuperable y reintento |

selectedDate es string calendario; requestedDate identifica la fecha realmente consultada. Error de validación se asocia al input. Estado del perfil invalid-player/player-not-found retira cotizaciones. Un 401 vigente limpia datos y aplica logout/login.

## Transiciones

1. Perfil confirmado + token → historial loading → success/empty/error. Nunca habilitar quotes para perfil pendiente, inválido o de otra identidad.
2. Reintentar historial → nueva generación, invalidar intento previo y cerrar sus detalles.
3. Editar fecha → invalidar intento y retirar resultado/error/carga puntual; idle con indicación de consultar nueva selección.
4. Consultar fecha inválida → validación, sin fetch. Fecha válida → loading → success/empty/error; historial intacto.
5. Reintentar puntual → validar criterio actual, nueva generación; no reutilizar fecha anterior.
6. Limpiar → fecha vacía, idle, sin detalle/error/resultado/carga puntual; historial intacto.
7. Cambiar jugador/token/desmontar → abortar e invalidar ambos canales. Ocultar estado de otra identidad antes del efecto.
8. Éxito/error/401/finally tardíos → ningún efecto si señal abortada o generación/identidad no coincide.

La validación de calendario corresponde a entrada; existencia y selección temporal al backend. No hay transiciones de negocio ni escrituras.
