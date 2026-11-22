# Data Model: turnos batch básicos

## BatchTurn (`batch_turns`)

Un registro representa un turno programado o un disparo manual. Campos: `id` UUID; `process` (`PLAYER_SYNC` o `QUOTE_RECALCULATION`); `origin` (`SCHEDULED`, `MANUAL_API` o `MANUAL_CLI`); `scheduled_local`, `timezone` y `scheduled_for` UTC; `status` (`PENDING`, `RUNNING`, `COMPLETED`, `PARTIAL`, `FAILED`); `correlation_id`; `started_at`, `finished_at`; `processed_count`, `succeeded_count`, `rejected_count`; `reason_code`.

- Un índice único parcial sobre `(process, scheduled_for)` donde `origin = 'SCHEDULED'` impide turnos programados duplicados entre workers.
- `PENDING → RUNNING → COMPLETED | PARTIAL | FAILED`. Un manual rechazado pasa de `PENDING` a `FAILED`; un `RUNNING` abandonado pasa a `FAILED` con motivo `INTERRUPTED` tras adquirir el bloqueo.
- El turno registra la ejecución, no cada intento o jugador. Su correlation ID aparece en los eventos del lote.

## PlayerQuote (`player_quotes`)

`turn_id uuid NULL` referencia `batch_turns`; las cotizaciones históricas mantienen valor nulo. Un índice único parcial `(turn_id, player_id) WHERE turn_id IS NOT NULL` impide más de una cotización para el mismo jugador y turno. `calculated_at` es la fecha real de inserción; la estrategia y versión siguen registradas como antes.

## Atomicidad

WhoScored se valida antes de escribir; jugadores, tokens iniciales y resultado `COMPLETED` se confirman juntos. Para cotizaciones se calculan primero resultados y rechazos por jugador; cotizaciones válidas y estado `COMPLETED`, `PARTIAL` o `FAILED` se confirman juntos. Un fallo transaccional revierte los efectos de ese lote.
