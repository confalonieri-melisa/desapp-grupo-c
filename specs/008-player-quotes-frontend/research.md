# Research: cotizaciones en el perfil

**Fecha**: 2026-10-25. Fuentes: código y contratos locales; sin nuevas tecnologías ni actualizaciones. Revisión independiente de integración completada sin cambios de código.

## Cliente y contrato

**Decision**: Crear `services/client/player-quotes.service.ts` con `getPlayerQuotes(token, playerId, date?, signal?)`, DTO serializado y error compatible con Error que conserve status/mensaje. Ajustar mínimamente el error del cliente de jugadores para reconocer status sin cambiar firmas de sus consultas.

**Rationale**: `src/app/api/players/[id]/quotes/route.ts` autentica y valida UUID/fecha. `src/backend/controllers/player-quotes.controller.ts` expone items con playerId y timestamp serializado, sin id. `src/backend/services/player-quotes.service.ts` distingue mensajes de jugador inexistente y ausencia puntual. El parser de `src/frontend/services/client/player.service.ts` pierde status. `PlayerController` fija currentQuote en 1: ese campo no puede sustituir la cotización persistida.

**Alternatives considered**: Cambiar backend (fuera de alcance), usar currentQuote del perfil (no cumple), introducir cliente HTTP global (abstracción innecesaria).

## Selección e identidad

**Decision**: Cargar historial tras confirmar perfil; actual = items[0], consulta puntual separada. Detalle usa el mismo objeto recibido. Identidad local de fila por generación e índice, con posición visible; cerrar detalles al reemplazar su dataset.

**Rationale**: 004 determina selección y orden; no hay id público, y timestamps/metadatos pueden coincidir.

**Alternatives considered**: Sort/deduplicación en navegador (contradice spec), clave por timestamp (colisión), caché global (sin necesidad).

## Concurrencia e integración del perfil

**Decision**: Generaciones independientes por consulta y AbortController; comprobar vigencia antes de éxito, catch, unauthorized y finally. Guardar identidad jugador/token para ocultar datos viejos antes del efecto nuevo. Editar fecha invalida inmediatamente el resultado anterior. Limpiar/desmontar/cambiar jugador invalida pendientes. Mantener callback de autorización actualizado mediante referencia, sin usar su identidad como disparador de recarga.

**Rationale**: `src/frontend/features/profile/hooks/usePlayerProfile.ts` retiene jugador anterior y protege éxito/finally con abort, pero no todos los errores tardíos. Su corrección acotada es necesaria para FR-015. `AuthContext.tsx` recrea logout; depender de esa identidad puede reiniciar efectos sin cambio de consulta.

**Alternatives considered**: Solo abort (no cubre rechazos que ignoran señal), bloquear interacción durante carga (no permite secuencias requeridas), ampliar estado global (innecesario).

## Fecha y fidelidad

**Decision**: Enviar string YYYY-MM-DD exacto sin convertir a instante; validar calendario real y permitir futuro. Compatibilidad con `src/backend/schemas/player-quotes.schema.ts`, incluido que su Date.UTC rechaza años 0000–0099. Mostrar timestamp UTC con segundos y fracción recibida; números sin redondeo adicional al payload.

**Rationale**: El backend calcula el límite exclusivo del día siguiente. El cliente no debe calcular cutoff ni perder precisión. El ISO UTC recibido puede mostrarse sustituyendo T por espacio y Z por « UTC» sin truncar fracciones.

**Alternatives considered**: Conversión local/toISOString de fecha seleccionada (confunde calendario e instante), limitar a hoy (contradice futuro), formato solo minutos o decimales fijos (puede perder información).

## Explicación y pruebas

**Decision**: Presentación recursiva de JSON, scores null/undefined como no disponibles y cero preservado. Details/summary nativos, labels, anuncios y wrapping. Vitest existente para cliente/utilidades/hook con promesas controladas; navegador real para teclado/estilos/anuncios, sin nuevas dependencias.

**Rationale**: `src/backend/models/valuation.ts` contiene arrays de contribuciones, rangos, booleanos y metadatos; 004 no exige esquema nuevo. `vitest.config.mts` usa Node y tests .spec.ts/.test.ts; los tests de perfil ya simulan React. El harness debe cubrir rerender, cleanup y respuestas tardías, no solo setters aislados. La regresión real PostgreSQL está en `tests/integration/player-quotes.repository.spec.ts`; la prueba de rutas usa mocks. El script db:seed apunta a un archivo inexistente.

**Alternatives considered**: Esquema rígido de componentes (pierde datos), modal (más gestión de foco), añadir plataforma E2E (innecesario para este alcance), afirmar accesibilidad por mocks (no demuestra DOM real).
