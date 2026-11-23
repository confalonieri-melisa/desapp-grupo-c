# Implementation Plan: Automatización semanal básica de procesos batch

**Branch**: `feature/016-job-scheduler` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

## Summary

Un worker Node separado de Next.js consulta dos horarios semanales configurados en el entorno. PostgreSQL guarda un registro por turno y un bloqueo global coordina worker, endpoint y CLI. La sincronización valida todo antes de una transacción de jugadores y tokens; el recálculo calcula primero y publica sus cotizaciones válidas en una transacción. Cada transacción guarda también el resultado del turno. Los jugadores persistidos quedan disponibles cuando falla WhoScored.

## Technical Context

- **Runtime**: TypeScript 5, Node.js >=22.12.0, Next.js 16; Python/Playwright existente para WhoScored.
- **Libraries**: Drizzle ORM, `postgres`, Zod y `@js-temporal/polyfill`; `tsx` ejecuta el worker.
- **Storage**: PostgreSQL; una tabla `batch_turns` y `player_quotes.turn_id` anulable. La migración no modifica cotizaciones previas.
- **Tests**: Vitest unitario para horario civil; integración con PostgreSQL real para unicidad, bloqueo, transacción, manuales y fallback local.
- **Configuration**: Día ISO, hora local y zona IANA por proceso; ambos son semanales. Sondeo inicial cada 15 segundos.

## Execution Design

1. El worker guarda en memoria el último instante observado desde su arranque. En cada sondeo calcula los horarios que vencieron mientras estuvo activo. Una restricción única `(process, scheduled_for)` para origen programado evita turnos duplicados entre workers. No se reconstruyen horarios de un período en que todos estuvieron apagados.
2. Los turnos programados se insertan `PENDING`. El worker intenta el bloqueo asesor global de PostgreSQL; si está ocupado, el turno espera al siguiente sondeo. Una vía manual ocupada termina con conflicto. La conexión reservada que posee el bloqueo ejecuta todas las transacciones del lote.
3. El worker intenta marcar como `FAILED` los turnos `RUNNING` abandonados sólo después de obtener el bloqueo; así no interrumpe a otro worker vivo.
4. WhoScored se obtiene con un reintento inmediato de un segundo ante error. Una respuesta vacía o un jugador inválido falla antes de escribir. Todos los upserts y asignaciones iniciales de tokens se confirman junto al estado `COMPLETED` del turno.
5. El recálculo consulta la estrategia activa y los jugadores persistidos, calcula cada resultado con el motor existente y conserva errores por jugador. Las cotizaciones válidas y el estado final del turno se confirman juntos. El cálculo manual conserva el formato de respuesta actual.
6. Los eventos de inicio y cierre se emiten como JSON con IDs y conteos. No hay tablas de intentos o ítems por jugador ni política de siete días.

## Project Structure

```text
scripts/run-batch-worker.ts
scripts/sync-whoscored.ts
src/app/api/quotes/recalculate/route.ts
src/backend/config/env.ts
src/backend/db/schema.ts
src/backend/db/migrations/0007_job_scheduler.sql
src/backend/models/batch-job.ts
src/backend/repositories/batch-job.repository.ts
src/backend/services/batch-scheduler.service.ts
src/backend/services/batch-execution.service.ts
src/backend/services/player-sync.service.ts
src/backend/services/quote-recalculation.service.ts
src/backend/observability/batch-audit.ts
tests/unit/services/batch-scheduler.service.spec.ts
tests/integration/batch-job.repository.spec.ts
tests/integration/batch-scheduler.spec.ts
```

## Constitution Check

El plan conserva capas de servicio y repositorio, servicios de negocio existentes, pruebas unitarias e integración, eventos estructurados y el historial de cotizaciones. El alcance reducido fue solicitado por el usuario y está reflejado en `spec.md`. La aprobación formal de entrega por la Project Owner sigue siendo un paso posterior conforme a la constitución.
