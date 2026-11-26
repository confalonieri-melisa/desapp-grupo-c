# Implementation Plan: Caché en memoria del ranking de jugadores

> Actualización 2026-11-26: la implementación final no usa TTL; usa una revisión persistida de turnos de recálculo y sincronización.

**Branch**: `feature/018-player-ranking-cache` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Especificación de `specs/018-player-ranking-cache/spec.md`. La rama propia `feature/018-player-ranking-cache`, basada en `main`, debe existir antes de implementar esta feature.

## Summary

Agregar al servicio de lectura del ranking una caché local de respuestas completas, identificadas por versión activa, filtros y paginación. La capacidad máxima es 100, con descarte por antigüedad de inserción. Antes de servir un acierto, consultar una revisión persistida de publicaciones de cotizaciones que funciona entre la aplicación web y el worker programado. En una falta, leer filas y total en un snapshot coherente; comprobar nuevamente la revisión antes de guardar. Conservar los endpoints, autenticación, errores y formato actuales.

## Technical Context

**Language/Version**: TypeScript, Node.js >=22.12  
**Primary Dependencies**: Next.js 16, Drizzle ORM 0.45, PostgreSQL 17; sin dependencia nueva para la caché  
**Storage**: PostgreSQL existente para jugadores, cotizaciones, versiones y turnos; memoria del proceso web para resultados reutilizables  
**Testing**: Vitest unitario e integración con PostgreSQL; medición controlada de latencia  
**Target Platform**: Aplicación Next.js con una instancia web y worker programado en otro proceso  
**Project Type**: Aplicación web con API de ranking autenticada  
**Performance Goals**: Bajo una base aislada con 1000 jugadores y 20 solicitudes concurrentes, el p95 de una consulta con entrada vigente debe ser <=200 ms y el p95 de una consulta sin entrada vigente <=1000 ms; además, la mediana vigente debe ser al menos 25% menor.
**Constraints**: Las entradas son válidas mientras coincidan la versión activa y la revisión persistida; máximo 100 entradas; el primer ranking posterior a una publicación visible desde otro proceso debe reflejar cotizaciones nuevas; sin Redis ni caché distribuida.
**Scale/Scope**: Solo `GET /api/players/ranking` y los dos caminos productivos de recálculo como origen de la revisión; filtros `league`, `team`, `position`, `page`, `limit`; hasta 100 jugadores por página

## Constitution Check

_Gate antes de Phase 0: PASS. Revisión posterior a Phase 1: PASS._

| Principio | Evaluación previa | Reevaluación después del diseño |
| --- | --- | --- |
| I y VII. Alcance e incrementalidad | PASS: optimización de la lectura existente; sin reglas de mercado nuevas. | PASS: el contrato de ranking y el recálculo permanecen iguales. |
| II. Especificación primero | PASS: `spec.md` y aclaración de capacidad completos antes del plan. | PASS: escenarios y criterios conservados en los artefactos de diseño. |
| III y IV. Capas y validación | PASS: la ruta autentica y el controlador valida antes del servicio. | PASS: caché y coordinación en lectura de servicio, consultas persistidas en repositorios. |
| V y IX. Verificación | PASS: existen suites unitarias e integración de ranking y recálculo. | PASS: `quickstart.md` cubre aciertos, vencimiento, capacidad, publicación entre procesos, errores y rendimiento; la aprobación formal de entrega seguirá siendo necesaria. |
| VI. Resiliencia y observabilidad | PASS: una falta usa datos persistidos y la revisión se confirma en la base existente. | PASS: no se sirven entradas si falla la lectura necesaria de revisión; se mantienen observación HTTP y correlation ID actuales. |
| VIII y X. Simplicidad y GitFlow | PASS para planificación: memoria local y tablas existentes son suficientes. | PASS para diseño: sin Redis ni caché distribuida; la revisión persistida requiere una tabla singleton y una migración acotada. |

No hay excepciones arquitectónicas ni decisiones pendientes que bloqueen el diseño.

## Phase 0: Outline & Research

Las decisiones y alternativas están documentadas en [research.md](research.md): revisión persistida actualizada dentro de la transacción de publicación, clave de consulta validada, límite de 100 entradas, snapshot consistente para filas y total, y control de carreras entre lectura y publicación. No quedan incógnitas técnicas pendientes.

## Phase 1: Design & Contracts

### Flujo de lectura

1. La ruta conserva `requireAuth`; el controlador conserva la validación de `playerRankingQuerySchema` y entrega criterios normalizados al servicio.
2. El servicio obtiene la versión activa y la revisión de publicaciones confirmadas. Sin versión activa responde con el mismo `409`; un error de lectura mantiene el error habitual y no consulta una entrada potencialmente obsoleta.
3. La clave incluye ID de versión activa y todos los criterios normalizados. Un acierto exige revisión idéntica. El acierto no cambia el orden de descarte.
4. Ante falta o descarte, el repositorio lee filas y total en un único snapshot de `REPEATABLE READ`. El servicio arma el mismo `PlayerRankingResponse` y vuelve a leer versión activa y revisión.
5. Si ambas señales coinciden, almacena la respuesta completa con la revisión y el momento de generación. Si cambian durante la lectura, descarta el candidato y repite la lectura una vez; si vuelve a haber cambio, devuelve el segundo resultado completo sin guardarlo. Una respuesta fallida o parcial nunca entra en caché.
6. Si hay 100 entradas, se elimina la de generación más antigua antes de agregar la nueva. Reiniciar el proceso vacía la caché sin afectar la consulta persistida.

### Publicación y consistencia

Ambos caminos productivos de recálculo pasan por `BatchExecutionService.recalculate`, que confirma `player_quotes`, el estado del turno y el incremento de `ranking_publication_revision` en una transacción. La revisión global se lee desde esa tabla singleton y aumenta por cada publicación confirmada; es visible desde el proceso web sin contar el historial. No se necesita comunicación directa del worker a la caché. El método directo `QuoteRecalculationService.recalculate()` no tiene llamadores productivos actuales; si se usa como nuevo punto de publicación, deberá participar de la misma revisión.

La selección de la versión activa sigue ocurriendo por solicitud. Una versión nueva o la ausencia de versión activa jamás reutiliza una entrada previa. Una consulta que comenzó antes de la confirmación de un lote puede finalizar con el snapshot anterior; no deja esa respuesta vigente para consultas que comiencen después de la confirmación.

### Artefactos

- [data-model.md](data-model.md): entrada de caché, clave, revisión y transiciones; datos persistidos reutilizados.
- [contracts/ranking-cache.md](contracts/ranking-cache.md): comportamiento observable del endpoint existente y sus garantías de frescura.
- [quickstart.md](quickstart.md): validación de extremo a extremo y medición de SC-001.

## Project Structure

### Documentation (this feature)

```text
specs/018-player-ranking-cache/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/ranking-cache.md
└── checklists/requirements.md
```

`tasks.md` pertenece a una etapa posterior y no se crea con este plan.

### Source Code (repository root)

```text
src/app/api/players/ranking/route.ts                # autenticación y observación existentes
src/backend/controllers/player-ranking.controller.ts # validación existente
src/backend/services/player-ranking.service.ts      # orquestación de lectura
src/backend/services/player-ranking-cache.ts        # caché local acotada (nuevo)
src/backend/repositories/player-ranking.repository.ts # filas y total en snapshot coherente
src/backend/repositories/batch-job.repository.ts     # lectura de revisión de publicación
src/backend/repositories/valuation.repository.ts     # versión activa existente
src/backend/services/batch-execution.service.ts      # publicación productiva existente
tests/unit/services/player-ranking-cache.spec.ts
tests/unit/services/player-ranking.service.spec.ts
tests/unit/repositories/player-ranking.repository.spec.ts
tests/integration/player-ranking.routes.spec.ts
tests/integration/player-ranking.repository.spec.ts
```

**Structure Decision**: Mantener las capas existentes. La ruta y el controlador preservan autenticación, validación y contrato; el servicio decide reutilización; los repositorios encapsulan las lecturas persistidas. El plan no modifica frontend ni base de datos.

## Complexity Tracking

No hay violaciones de la constitución que requieran excepciones. La lectura de revisión por solicitud es necesaria para cumplir la frescura entre procesos; su costo se contrastará con SC-001.
