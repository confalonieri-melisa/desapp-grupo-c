# Tasks: automatización semanal básica de procesos batch

**Alcance**: Versión mínima solicitada para la implementación. Las tres fases reúnen el worker, la persistencia de resultados y la integración con las vías manuales. La regla de frescura, el procesamiento parcial de la fuente y los reintentos durables quedan fuera del alcance.

## Phase 1: Preparación

- [x] T001 Añadir `@js-temporal/polyfill`, habilitar `tsx` en ejecución y crear `npm run jobs:worker`.
- [x] T002 Configurar día, hora local y zona IANA semanales para sincronización y recálculo, más el intervalo de sondeo.
- [x] T003 Documentar las variables y el despliegue del worker separado de la web en `.env.example` y `docs/whoscored-ingestion.md`.

## Phase 2: Persistencia y coordinación

- [x] T004 Crear una única tabla `batch_turns` con proceso, origen, horario, estado, correlation ID, tiempos, conteos y motivo; asociar cotizaciones nuevas al turno con `player_quotes.turn_id`.
- [x] T005 Generar y probar la migración `0007_job_scheduler.sql` sin reescribir cotizaciones históricas.
- [x] T006 Implementar el repositorio de turnos y un bloqueo asesor de PostgreSQL compartido por worker, API y CLI.
- [x] T007 Permitir transacciones de lote en los repositorios de jugadores, tokens y cotizaciones; conservar las operaciones existentes.

## Phase 3: Ejecución básica

- [x] T008 Calcular horarios semanales con zona horaria y ejecutar turnos pendientes desde `scripts/run-batch-worker.ts`, independiente de requests web.
- [x] T009 Sincronizar un lote validado completo en una transacción, rechazar fuente vacía y reintentar una sola vez si la fuente falla; conservar jugadores previos ante fallo.
- [x] T010 Recalcular desde jugadores persistidos con la estrategia existente y publicar las cotizaciones válidas de un turno en una transacción.
- [x] T011 Integrar endpoint y CLI manuales con el bloqueo y los turnos; conservar autenticación, cuerpo y respuesta del endpoint; informar conflicto cuando otro lote está activo.
- [x] T012 Registrar inicio y resultado de cada ejecución con correlation ID y marcar como interrumpidos los turnos abandonados al reiniciar.
- [x] T013 Probar horarios y zona horaria, unicidad de turnos, orden de procesos, fallos de fuente, transacciones y conservación de la respuesta HTTP.
- [x] T014 Ejecutar comprobaciones finales de tipos, lint, pruebas y build; registrar los resultados en `quickstart.md`.
