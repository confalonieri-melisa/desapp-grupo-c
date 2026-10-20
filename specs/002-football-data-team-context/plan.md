# Implementation Plan: Contexto Colectivo de Equipos desde football-data.org

**Branch**: `football-data-context` | **Date**: 2026-10-20 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar una integración aislada para consultar las tablas de posiciones de
football-data.org para `PL`, `BL1`, `PD`, `SA` y `FL1`, conservar cada respuesta
válida como snapshot y persistir solamente los datos colectivos requeridos.
La solución reutilizará la arquitectura existente de adapters, services,
repositories y rutas Next.js, sin modificar las estadísticas de `players` ni
implementar estrategias, cotizaciones o scheduler.

La publicación será transaccional por temporada: una ejecución solo se marca
vigente cuando las cinco competiciones fueron validadas. Las ejecuciones
fallidas o parciales se conservan para diagnóstico, pero no reemplazan la
última ejecución válida.

## Technical Context

**Language/Version**: TypeScript sobre Node.js `>=22.12.0`

**Primary Dependencies**: Next.js 16, Drizzle ORM, PostgreSQL, Zod, Vitest,
`fetch` nativo de Node

**Storage**: PostgreSQL mediante Drizzle ORM y migraciones SQL generadas por
Drizzle Kit

**Testing**: Vitest; tests unitarios con HTTP client y repositorios mockeados;
tests de integración contra PostgreSQL condicionados por
`RUN_DB_INTEGRATION_TESTS=true`

**Target Platform**: Backend Next.js ejecutado en Node.js y PostgreSQL

**Project Type**: Aplicación web con backend REST en `src/app/api` y capas
backend en `src/backend`

**Performance Goals**: Una sincronización manual debe procesar las cinco
competiciones dentro del timeout configurado, sin hacer requests de proveedor
durante lecturas locales de jugadores o contexto.

**Constraints**:

- Solo se consume el endpoint de standings.
- La credencial se mantiene en variables de entorno y nunca se registra.
- No se publica una ejecución parcial.
- Las pruebas no dependen de internet.
- No se agrega scheduler ni procesamiento asíncrono en esta feature.

**Scale/Scope**: Cinco competiciones por ejecución, múltiples temporadas
históricas, una fila normalizada por equipo y competición, y snapshots
inmutables por respuesta aceptada.

## Constitution Check

### Gates

- **Specification First**: PASS. La especificación existe en `spec.md` y
  delimita explícitamente el alcance.
- **Layered Architecture**: PASS. El plan conserva controllers → services →
  repositories y encapsula HTTP externo en un adapter.
- **Validation by Responsibility**: PASS. Zod validará configuración y
  payloads; el servicio validará completitud, coherencia de temporada y
  publicación; las restricciones relacionales quedarán en PostgreSQL.
- **Tests and Verifiable Behavior**: PASS. Se prevén tests unitarios de
  normalización, resiliencia, autorización e idempotencia, y tests de
  integración de migraciones/repositorios.
- **Operational Resilience**: PASS. Se conserva la última versión publicada,
  se registran fallos estructurados y se limita el retry.
- **Incremental Development / YAGNI**: PASS. No se implementan estrategias,
  scheduler, fixtures, dashboard ni nuevos procesos asíncronos.
- **GitFlow**: PASS. El trabajo se mantiene en la rama de feature y el PR
  objetivo será `main`.

No hay violaciones que requieran una excepción de complejidad.

## Architecture and Data Flow

```text
POST /api/competition-context/updates
  -> auth middleware (SUPERUSER)
  -> CompetitionContextController
  -> CompetitionContextUpdateService
  -> FootballDataAdapter (one standings request per league)
  -> payload schema + normalizer
  -> CompetitionContextRepository (single transaction)
  -> snapshots + standings + context update
```

Las lecturas futuras consumirán `CompetitionContextRepository` y nunca llamarán
al proveedor. La asociación con `players` se resolverá por una relación
explícita entre `WHOSCORED` y `FOOTBALL_DATA`, usando competición y temporada;
no se modificará `players.statistics`.

## Files Affected

### New source files

- `src/backend/adapters/football-data.adapter.ts`: cliente HTTP del endpoint
  standings, headers, timeout, clasificación de errores y retry finito.
- `src/backend/schemas/football-data.schema.ts`: validación de respuestas
  externas y request de sincronización.
- `src/backend/models/competition-context.ts`: enums y tipos de dominio para
  estados, competiciones, snapshots, standings y asociaciones.
- `src/backend/services/competition-context-update.service.ts`: orquestación de
  las cinco consultas, validación completa, publicación atómica e idempotencia.
- `src/backend/repositories/competition-context.repository.ts`: persistencia,
  consulta de la última ejecución válida y upserts históricos.
- `src/backend/controllers/competition-context.controller.ts`: contrato
  administrativo y transformación de respuestas.
- `src/app/api/competition-context/updates/route.ts`: endpoint manual autorizado.
- `tests/fixtures/football-data/*.json`: respuestas locales de las cinco ligas
  y payloads inválidos.

### Existing files to modify

- `src/backend/config/env.ts`: agregar base URL, token, timeout y máximo de
  reintentos con defaults apropiados para tests/local.
- `src/backend/db/schema.ts`: agregar tablas, índices, constraints y tipos
  inferidos.
- `src/backend/errors/http.error.ts`: agregar únicamente el error `Forbidden`
  si el patrón actual no permite responder `403`.
- `src/app/api/docs/route.ts` y `specs/001-player-token-marketplace/contracts/openapi.yaml`:
  documentar el nuevo endpoint y seguridad.
- `src/backend/db/migrations/*`: generar una migración nueva; no modificar
  migraciones ya aplicadas.

### Files not to modify for behavior

- `src/backend/adapters/player-data-source.ts`
- `src/backend/services/player-sync.service.ts`
- `src/backend/repositories/player.repository.ts`
- `src/backend/models/Player.ts`

Esos componentes siguen siendo responsables de WhoScored y estadísticas
individuales.

## Data Model and Migration

Agregar una migración nueva con las siguientes tablas lógicas:

### `competition_context_updates`

- `id` UUID primary key.
- `season` integer not null.
- `requested_by` UUID nullable si la identidad es un proceso interno; foreign
  key a `users` cuando corresponde.
- `status` (`RUNNING`, `VALID`, `PARTIAL`, `FAILED`).
- `started_at`, `finished_at`, `published_at` timestamps.
- `error_summary` JSONB nullable, sin credenciales.
- Se conservan ejecuciones fallidas para diagnóstico; no se impone una única
  ejecución por temporada.

### `competition_context_snapshots`

- `id` UUID primary key.
- `context_update_id` foreign key.
- `provider` constante `FOOTBALL_DATA`.
- `competition_code` y `league`.
- `season`.
- `endpoint_path` sin token ni query sensible.
- `http_status`.
- `fetched_at`.
- `content_hash`.
- `payload` JSONB inmutable.
- Unique `(context_update_id, competition_code)`.

### `team_competition_standings`

- `id` UUID primary key.
- `context_update_id` foreign key.
- `snapshot_id` foreign key.
- `competition_code`, `league`, `season`.
- `team_external_id`, `team_name`.
- `position`, `played_games`, `points`, `goal_difference`.
- Unique `(context_update_id, competition_code, team_external_id)`.
- Índices para `(league, season, team_external_id)` y
  `(context_update_id, competition_code)`.
- Checks para posición, partidos jugados y puntos no negativos; diferencia de
  gol puede ser negativa.

### `team_source_links`

- `id` UUID primary key.
- `league`, `season`.
- `whoscored_team_external_id` nullable pero requerido para una relación
  confirmada.
- `whoscored_team_name`.
- `football_data_team_external_id`.
- `football_data_team_name`.
- `resolution_method` (`EXACT_ID`, `VALIDATED_ALIAS`, `MANUAL`).
- `validated_at`.
- Unique por `(league, season, whoscored_team_external_id)` y por equipo
  football-data dentro de una misma liga/temporada.

La última actualización válida se obtiene desde `competition_context_updates`, filtrando
por temporada y estado `VALID`, y ordenando por `published_at` descendente. No
se agrega una tabla de referencia duplicada.

## External Adapter and Normalization

1. Mapear `League` a `PL`, `BL1`, `PD`, `SA`, `FL1` mediante una constante
   privada del adapter y testeada. Es un detalle del proveedor, no un nuevo
   concepto de dominio.
2. Construir únicamente:
   `GET /v4/competitions/{code}/standings?season={season}`.
3. Enviar `X-Auth-Token` desde configuración segura.
4. Aplicar timeout abortable y un máximo finito de retries solo para errores
   transitorios (`429`, `5xx`, timeout); no reintentar `401`/`403` ni payloads
   inválidos.
5. Validar que exista exactamente una tabla utilizable y que cada fila tenga
   `team.id`, `team.name`, `position`, `playedGames` y `points`; aceptar
   `goalDifference` negativo.
6. Proyectar el payload externo al contrato interno mínimo. Campos como
   scorers, assists, ratings, matches o lineups no entran al contrato interno.
7. Calcular el hash del payload recibido para detectar reejecuciones idénticas.

## Synchronization Service

- Validar `season` y que solo se soliciten las cinco competiciones soportadas.
- Crear `competition_context_updates` en `RUNNING`.
- Obtener y validar las cinco respuestas.
- Guardar cada snapshot y standings bajo el mismo `context_update_id`.
- Si todas son válidas, marcar `VALID` y `published_at`.
- Si alguna falla, marcar `PARTIAL` o `FAILED`, conservar lo obtenido para
  diagnóstico y mantener disponible la ejecución `VALID` anterior.
- La idempotencia se garantiza con una restricción única por actualización,
  competición y equipo, más la consulta de la última ejecución válida. Una
  respuesta idéntica no debe duplicar sus standings publicados.
- Persistir únicamente asociaciones confirmadas. Las coincidencias ambiguas o
  no resueltas no se vinculan ni reciben contexto.

## API Contracts

### `POST /api/competition-context/updates`

Request:

```json
{ "season": 2026 }
```

Auth: `Authorization: Bearer <JWT>` con `role=SUPERUSER`. La credencial del
proveedor se toma de configuración del servidor y nunca del request.

Success `200`:

```json
{
  "syncRunId": "uuid",
  "season": 2026,
  "status": "VALID",
  "publishedAt": "2026-10-20T10:00:00.000Z",
  "competitions": ["PL", "BL1", "PD", "SA", "FL1"]
}
```

Errors:

- `400`: temporada inválida.
- `401`: token ausente o inválido.
- `403`: usuario autenticado sin rol `SUPERUSER`.
- `502`: proveedor inválido o no disponible sin versión nueva publicada.
- `429`: límite del proveedor, manteniendo la última versión válida.

La consulta del contexto para futuras estrategias será inicialmente un contrato
interno del repositorio, no un endpoint público; el endpoint de lectura queda
como decisión pendiente de la especificación.

## Authorization

Reutilizar `requireAuth` dentro de la ruta y validar
`payload.role === UserRole.SUPERUSER` antes de construir la llamada externa. La
identidad `requested_by` se obtiene del claim `sub`. La identidad de sistema y
su integración con un scheduler quedan fuera de esta feature.

## Testing Strategy

### Unit tests

- Mapeo exacto de las cinco ligas a códigos del proveedor.
- Construcción de URL, header y ausencia de token en logs/errores.
- Normalización de standings válidos y rechazo de filas incompletas.
- Exclusión de scorers, assists, ratings, fixtures y eventos.
- Clasificación de `401`, `403`, `429`, `5xx`, timeout y JSON inválido.
- Retry finito para errores transitorios.
- Asociación exacta, alias validado, temporada/competición incompatible y
  ambigüedad.
- Servicio: publicación solo con cinco respuestas válidas, preservación de la
  última versión y comportamiento idempotente.
- Middleware: superusuario permitido; inversor, anónimo y rol inválido
  rechazados.

### Integration tests

Con PostgreSQL real y migraciones:

- insertar snapshot, ejecución y standings;
- publicar una ejecución completa;
- conservar la última ejecución `VALID` ante ejecución parcial;
- restricciones únicas e idempotencia;
- conservar temporadas históricas;
- Persistir links confirmados sin contaminar `players`.

### Route/API tests

- `POST /api/competition-context/updates` con JWT de superusuario.
- Respuestas `401` y `403` sin contactar al adapter.
- `400` para temporada inválida.
- `502`/`429` según error del adapter y disponibilidad de versión previa.

Todos los tests de proveedor usarán un cliente HTTP inyectable o un mock de
`fetch`; no se realizarán requests de internet.

## Dependencies

- Credencial y acceso contratado a football-data.org para ejecución manual real
  fuera de tests.
- PostgreSQL local para tests de integración.
- No se requiere nueva dependencia npm: `fetch`, `AbortController`, Zod,
  Drizzle y Vitest ya están disponibles.
- Para la huella del snapshot, usar una implementación estándar disponible en
  Node; no persistir secretos.

## Risks and Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambio de contrato del proveedor | No se publica contexto nuevo | Schema estricto, snapshots de diagnóstico y última versión válida |
| Límite `429` | Sin actualización nueva | Retry finito y conservación de la publicación anterior |
| Respuesta parcial entre ligas | Contexto mezclado | Publicación atómica de cinco competiciones |
| Nombres de equipos distintos | Asociación incorrecta | IDs, aliases validados y rechazo de ambigüedades |
| Exposición de API key | Compromiso de proveedor | Env backend-only, redacción de errores y OpenAPI sin credencial |
| Confusión con métricas WhoScored | Score futuro incorrecto | Tablas separadas de `players` |

## Implementation Order

1. Agregar configuración, tipos de dominio y schemas de payload.
2. Crear migración y tipos Drizzle.
3. Implementar adapter HTTP inyectable y sus tests.
4. Implementar repositorio y tests de integración.
5. Implementar servicio de sincronización/publicación.
6. Implementar controller y ruta manual con autorización inline.
7. Actualizar OpenAPI y contrato de documentación.
8. Completar tests de ruta, resiliencia, idempotencia y permisos.
9. Ejecutar lint, tests unitarios, tests de integración habilitados y build.

## Definition of Done for This Plan

- La implementación futura no cambia el contrato de WhoScored.
- Las cinco competiciones tienen fixtures y cobertura.
- Solo standings se consultan y solo el subconjunto especificado se normaliza.
- La publicación es atómica y la última válida se conserva ante errores.
- El endpoint manual está protegido por rol.
- Migración, OpenAPI y tests quedan sincronizados.
- No se agregan scheduler, estrategias, cotizaciones ni procesamiento asíncrono.
