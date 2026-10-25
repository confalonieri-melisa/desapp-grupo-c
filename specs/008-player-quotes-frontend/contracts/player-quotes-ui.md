# Contrato de consumo y presentación

Normativo: [004](../../004-player-quote-queries/spec.md). Tipos: [data-model.md](../data-model.md). No cambia rutas, payloads ni permisos existentes.

## HTTP

`getPlayerQuotes(token, playerId, date?, signal?)` devuelve Promise de PlayerQuotesResponse. GET `/api/players/${encodeURIComponent(playerId)}/quotes`, Authorization Bearer y AbortSignal. Sin date omitir query; con fecha usar URLSearchParams y conservar string calendario exacto. Sin escrituras ni requests de detalle.

| Respuesta existente | Tratamiento |
|---|---|
| Sin date, 200 items | Historial completo en secuencia recibida; actual = primer elemento |
| Sin date, 200 items vacío | «No hay cotización disponible» y «No existen cotizaciones históricas» |
| Con date, 200 con un item | Resultado puntual independiente |
| 404, error `Quote not available for the requested date` | Solo en puntual con perfil confirmado: «No hay cotización disponible hasta [fecha]» |
| 404, error `Player not found` | Retirar cotizaciones; jugador no encontrado y enlace al catálogo |
| 400, error `Invalid player id` | Jugador solicitado inválido; sin residuos y enlace al catálogo |
| 400, error `Invalid date` | Error asociado al input; sin éxito aparente |
| 401 | Si vigente: retirar datos, logout y router.replace('/login') |
| Red, 5xx, error no reconocido | Error recuperable y reintento; nunca ausencia |

El cuerpo de error actual es `{ error: string }`. Conservar status y mensaje; usar contexto de perfil confirmado y mensaje para distinguir 404. No clasificar todo 404 como ausencia. El cliente de perfil también conserva status; Error sigue siendo compatible con consumidores actuales. Sin nuevos códigos backend ni exposición de tokens.

## Componentes

- PlayerQuotesSection: sección «Cotizaciones» dentro del perfil confirmado; integra hook y superficies independientes.
- QuoteSummary: valor, unidad, timestamp UTC completo, estrategia y versión; reutilizado en actual, filas y puntual.
- QuoteHistory: todos los items sin sort, deduplicación, agrupamiento ni paginación. Posición visible para empates.
- QuoteDateQuery: label «Fecha de consulta», input date, «Consultar», «Limpiar», reintento en fallo. Permitir reemplazar solicitudes pendientes y fechas futuras. Mostrar «Fecha solicitada», «Fecha y hora de cálculo» y «Último valor disponible hasta la fecha seleccionada». Editar retira vigencia inmediatamente.
- QuoteExplanation: details/summary «Ver explicación» con contexto/posición, scores y JSON anidado completo. Null/undefined no disponibles; cero/false preservados. Vacíos explícitos. React escapa nombres y valores.

Cambiar/consultar/limpiar fecha no modifica historial/actual. Fallo puntual no los oculta. Reintento usa criterio vigente. Perfil no se bloquea por fallo aislado de quotes.

## Accesibilidad y presentación

Labels explícitos; error de fecha con aria-describedby/aria-invalid; carga/resultados mediante status/live region y errores mediante alert sin duplicación. Teclado, foco visible y orden coherente. Details/summary conserva foco local; consultar no roba foco y limpiar mantiene foco en su control. Cambio de jugador retira detalles previos.

En 360/1280 px permitir wrap de códigos/versiones/valores largos; mantener jerarquía de componentes y acciones accesibles sin truncar información. Conservar regreso al catálogo y estilo existente.

Timestamp UTC conserva segundos y fracción recibida; input calendario no se convierte a zona local. Valor numérico sin redondeo arbitrario ni conversión a porcentaje. Unit recibe etiqueta «créditos por token»; estrategia y versión conservan identificación.

## Trazabilidad

| Requisitos | Evidencia prevista |
|---|---|
| FR-001, 002, 017 | Navegación/roles/sesión y regresión del perfil |
| FR-003–006 | Hook con orden/empates/vacío, comparación de todas las filas |
| FR-007–011 | Calendario, cliente, hook; fecha exacta/anterior/futura/limpieza |
| FR-012, 013 | Cero/null, JSON anidado y detalles en tres superficies |
| FR-014–016 | Promesas diferidas, éxitos/errores/401/finally tardíos, reintentos |
| FR-018, 019 | Navegador: teclado, anuncios, foco, 360/1280 px |
| FR-020 | Red solo GET y regresión existente de 004 |
