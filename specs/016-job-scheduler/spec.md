# Feature Specification: Automatización semanal básica de procesos batch

**Feature Branch**: `feature/016-job-scheduler`  
**Created**: 2026-11-22  
**Status**: Draft  
**Scope revision**: El usuario pidió implementar sólo la versión básica. Esta versión reemplaza las decisiones anteriores sobre frescura de siete días, actualización parcial de WhoScored, reintentos durables y reanudación ítem por ítem.

## User Scenarios & Testing

### User Story 1 - Ejecutar sin visitas a la aplicación (Priority: P1)

Como responsable del marketplace, quiero sincronizar jugadores desde WhoScored y recalcular cotizaciones una vez por semana en horarios configurados sin intervención de un usuario.

**Independent Test**: Configurar turnos próximos, dejar el worker activo sin enviar requests y observar un turno y un resultado por proceso.

1. Con día, hora local y zona válidos, el worker crea un único turno al llegar el horario y llama al servicio existente.
2. Si ambos turnos coinciden, termina primero la sincronización y luego comienza el recálculo con jugadores persistidos.
3. Dos workers que observan el mismo horario crean un solo turno efectivo.

### User Story 2 - Conservar datos válidos ante fallos (Priority: P1)

Como responsable operativo, quiero conocer el resultado del lote y seguir usando los jugadores guardados cuando WhoScored falle.

**Independent Test**: Simular proveedor caído, respuesta vacía y una fila inválida; verificar que no cambian jugadores guardados y que el recálculo puede usar los datos locales.

1. La sincronización valida el lote completo antes de escribir. Una respuesta vacía o inválida deja el turno `FAILED` y no modifica jugadores ni tokens.
2. Si la fuente lanza un error, se intenta obtenerla una segunda vez tras una espera breve; si vuelve a fallar, se registra `FAILED`.
3. El recálculo utiliza los jugadores locales disponibles aunque la última sincronización haya fallado. Sin jugadores o sin estrategia activa termina fallido sin cotizaciones nuevas.
4. El recálculo conserva `COMPLETED`, `PARTIAL` o `FAILED` y los errores por jugador del servicio existente. Los resultados válidos se publican juntos.

### User Story 3 - Conservar disparos manuales y evitar solapamientos (Priority: P1)

Como administrador, quiero seguir usando el endpoint y comando manuales sin que coincidan con otro lote que modifica jugadores o cotizaciones.

**Independent Test**: Iniciar un lote y disparar ambas vías manuales; verificar rechazo por conflicto, y repetirlas sin lote activo para obtener resultados normales.

1. Worker, API y CLI usan el mismo bloqueo compartido en PostgreSQL.
2. Un turno programado ocupado queda `PENDING` y se ejecuta al liberarse el bloqueo; un disparo manual ocupado recibe `409` o código de salida no cero.
3. El endpoint conserva autenticación, cuerpo y campos de respuesta existentes, y mantiene el correlation ID de la observación HTTP. El comando conserva su nombre.

## Requirements

- **FR-001**: Ambos procesos DEBEN ejecutarse semanalmente sin tráfico web. Cada uno configura día ISO 1–7, hora `HH:mm` y zona IANA; una configuración inválida impide iniciar el worker.
- **FR-002**: El worker DEBE identificar hora local e instante efectivo UTC de cada turno. Una hora local repetida o inexistente produce un único instante conforme a la desambiguación compatible.
- **FR-003**: Debe existir como máximo un turno programado por proceso e instante previsto, incluso con varios workers.
- **FR-004**: Cada turno DEBE registrar proceso, origen, horario, estado, correlation ID, inicio, cierre, cantidades y motivo de fallo cuando corresponda.
- **FR-005**: La sincronización DEBE validar el conjunto completo antes de escribir y confirmar jugadores y asignación inicial de tokens en una transacción. Si la fuente falla, puede reintentarse una vez; un fallo final NO DEBE borrar los últimos datos persistidos.
- **FR-006**: El recálculo DEBE conservar la estrategia y fórmula existentes, los resultados por jugador y el historial inmutable. Los resultados válidos de un turno se publican en una transacción; sin estrategia o jugadores no publica cotizaciones.
- **FR-007**: El recálculo automático PUEDE utilizar jugadores locales tras un fallo de WhoScored; no inventa estadísticas. Esta versión no establece un límite de antigüedad.
- **FR-008**: Worker, API y CLI DEBEN compartir un bloqueo global. El programado espera como `PENDING`; el manual informa el conflicto sin producir efectos.
- **FR-009**: Después de un reinicio, un turno que estaba `RUNNING` queda `FAILED` con motivo `INTERRUPTED`; un turno ya materializado `PENDING` puede ejecutarse. Los horarios transcurridos mientras el worker estuvo apagado no se reconstruyen.
- **FR-010**: Inicio y cierre DEBEN emitir eventos JSON con proceso, turno, correlation ID, origen, horario y resultado, sin credenciales ni payload crudo.
- **FR-011**: El endpoint `POST /api/quotes/recalculate` y el comando `npm run db:sync-whoscored` DEBEN seguir disponibles sin cambiar las fórmulas ni reescribir cotizaciones históricas.

## Success Criteria

- **SC-001**: Con worker disponible y horarios controlados, cada proceso se despacha una vez dentro de los 60 segundos posteriores a su horario, salvo conflicto registrado.
- **SC-002**: Con dos workers, se registra un solo turno por proceso e instante previsto.
- **SC-003**: Tras un fallo completo de WhoScored, los jugadores persistidos siguen disponibles y el turno queda fallido; el recálculo puede usar esos datos locales.
- **SC-004**: Un fallo durante la publicación de un lote revierte sus escrituras de ese lote; las cotizaciones históricas anteriores permanecen intactas.
- **SC-005**: Los disparos manuales funcionan sin conflicto y son rechazados de forma visible durante otro lote.

## Out of Scope

Frecuencia diaria, interfaz administrativa nueva, fecha de frescura por jugador y regla de siete días, sincronización parcial por fila, reintentos durables, recuperación de horarios no observados durante una caída y reanudación del trabajo pendiente del mismo turno. Una nueva necesidad de estas reglas requiere otra feature y una nueva decisión de alcance.
