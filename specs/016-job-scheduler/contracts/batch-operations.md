# Contract: operación batch básica

## Configuración

Ambos procesos son semanales. `BATCH_SYNC_WEEKDAY` y `BATCH_RECALC_WEEKDAY` aceptan día ISO 1–7 (inicial `1`); `BATCH_SYNC_TIME` y `BATCH_RECALC_TIME` aceptan `HH:mm` (iniciales `02:00` y `03:00`); `BATCH_SYNC_TIMEZONE` y `BATCH_RECALC_TIMEZONE` aceptan zona IANA (inicial `America/Argentina/Buenos_Aires`). `BATCH_POLL_SECONDS` es entero 1–30 (inicial `15`). Una configuración inválida detiene el worker con error observable.

## Comandos

- `npm run jobs:worker`: proceso persistente separado de la web. Usa el mismo `DATABASE_URL`, permite varias instancias y se detiene con señal del sistema.
- `npm run db:sync-whoscored`: comando manual conservado. Devuelve estado, conteos, `turnId` y `correlationId`; ante lote ocupado sale con código no cero y `errorCode: BATCH_CONFLICT`.

## `POST /api/quotes/recalculate`

Conserva autenticación de superusuario, cuerpo `{}`, respuesta de recálculo (`status`, `season`, `strategyCode`, `version`, `calculated`, `rejected`, `quotes`, `errors`) y header `x-correlation-id`. El ID se propaga al turno. Ante otro lote responde `409` con `{"error":"Another batch is running"}`; sin estrategia activa conserva `409` con `{"error":"No active valuation strategy"}`.

## Eventos y reinicio

`batch.started` y `batch.finished` incluyen proceso, turno, correlation ID, origen, horario, estado y conteos. La fuente puede emitir `batch.source.retry`. No se registran secretos ni payload crudo. Al reiniciar, un `RUNNING` abandonado queda `FAILED` con motivo `INTERRUPTED`; un `PENDING` materializado puede ejecutarse. No se generan horarios que vencieron mientras todos los workers estuvieron apagados.
