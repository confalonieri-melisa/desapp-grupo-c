# Research: caché del ranking de jugadores

## Decisión 1: detectar publicaciones entre procesos

**Decision**: Antes de reutilizar un resultado, leer una revisión persistida calculada como la cantidad de turnos de `batch_turns` con `process = QUOTE_RECALCULATION`, `status` en `COMPLETED` o `PARTIAL` y `succeeded_count > 0`. Asociar esa revisión a cada entrada. El recálculo manual de la API y el worker programado usan `BatchExecutionService` y `QuoteRecalculationService.recalculateBatch`; este último guarda cotizaciones y finaliza el turno dentro de la misma transacción.

**Rationale**: El conteo aumenta una vez por publicación con al menos una cotización y se hace visible junto con las cotizaciones confirmadas. Funciona aunque el worker y la aplicación web tengan memorias distintas, sin tabla nueva ni sistema externo. Un recálculo fallido sin publicaciones no modifica la revisión.

**Alternatives considered**:

- Invalidación local al terminar el recálculo: sirve para la API manual, pero no llega del worker a la memoria web.
- Último `finished_at`: puede empatar por resolución de reloj y depende de la hora del proceso.
- Último UUID de cotización: los UUID son aleatorios y no expresan orden de publicación.
- `COUNT(*)` de `player_quotes`: detecta publicaciones, pero revisa una tabla mucho mayor que `batch_turns`.
- Notificaciones de PostgreSQL como única señal: perder una notificación durante un reinicio o desconexión permitiría reutilizar datos antiguos.

**Boundary**: El método directo `QuoteRecalculationService.recalculate()` no crea turno, pero no tiene llamadores productivos actuales; el contrato de esta entrega cubre los flujos manual y programado existentes. Si se expone otro flujo de publicación, deberá participar de la misma señal o invalidar de forma equivalente antes de usar esta caché.

## Decisión 2: identidad y vigencia de cada entrada

**Decision**: Usar una caché local del proceso web para respuestas completas `PlayerRankingResponse`. La clave se forma con `active.id`, `league`, `team`, `position`, `page` y `limit` ya validados; representar ausencias explícitamente y serializar la tupla para evitar colisiones. Conservar el texto `team` recortado según la validación existente; la coincidencia sin distinguir mayúsculas del repositorio permanece intacta aunque dos formas de escribir el mismo equipo ocupen entradas separadas. Cada entrada guarda respuesta, revisión y momento de generación. Se reutiliza solo si tiene menos de 60 segundos y coincide la revisión actual.

**Rationale**: El servicio de ranking ya obtiene la versión activa y recibe criterios validados del controlador; la ruta autentica antes de llamar al controlador. La clave incluye todo lo que cambia el resultado. El plazo fijo desde la respuesta completa cumple el máximo de antigüedad sin renovarse por uso.

**Alternatives considered**:

- Clave basada en URL cruda: separa solicitudes equivalentes con valores por defecto implícitos y espacios normalizados.
- Clave sin versión activa: podría devolver un ranking de una estrategia anterior.
- Normalizar `team` a minúsculas en la clave: puede mejorar aciertos, pero no es necesario para la corrección y añade reglas distintas de la validación actual.
- Deslizar el vencimiento con cada acierto: permitiría resultados con más de 60 segundos de antigüedad.

## Decisión 3: capacidad y descarte

**Decision**: Mantener como máximo 100 entradas. Eliminar entradas vencidas al consultarlas o antes de agregar nuevas; si se alcanza la capacidad, descartar la entrada con generación más antigua. Los aciertos no alteran el momento de generación ni la prioridad de descarte. Una entrada descartada recurre a la lectura persistida.

**Rationale**: La capacidad coincide con la aclaración aceptada y limita el uso de memoria frente a combinaciones arbitrarias de filtros y páginas. La antigüedad de generación ofrece un orden verificable y estable.

**Alternatives considered**: Descarte por último uso cambia la prioridad al consultar y contradice «los más antiguos»; capacidad sin límite expone el proceso a crecimiento de memoria.

## Decisión 4: respuestas completas y carreras de actualización

**Decision**: Mantener autenticación y validación antes del acceso a la caché. Leer versión activa y revisión para decidir el acierto. En una falta, obtener filas y total del ranking sobre un mismo estado persistido mediante una lectura transaccional con snapshot estable. Comprobar de nuevo versión activa y revisión después de construir la respuesta. Solo guardar el resultado si ambas señales coinciden; si cambian, descartar ese candidato y repetir la lectura. Nunca guardar una promesa rechazada, un error o una respuesta incompleta. Una consulta iniciada antes de una publicación puede terminar con su snapshot anterior, pero no puede contaminar la caché posterior.

**Rationale**: Hoy `PlayerRankingRepository.findRankedPlayers` consulta filas y total por separado. Si se publica un lote entre esas lecturas, la paginación podría describir otro conjunto. PostgreSQL `REPEATABLE READ` permite que las dos lecturas vean el mismo snapshot; la instalación local de Drizzle admite `isolationLevel: 'repeatable read'`. La comprobación posterior impide que un resultado construido antes de una publicación vuelva a quedar vigente.

**Alternatives considered**:

- Guardar el resultado de las dos consultas actuales sin snapshot: puede almacenar filas y total incompatibles.
- Usar solo la revisión al comienzo: una publicación durante la lectura podría guardar una respuesta antigua bajo revisión nueva o contaminar la caché tras invalidar.
- Mantener un resultado viejo cuando falla la lectura de revisión: ocultaría un recálculo y cambiaría el comportamiento de error actual.

## Verificación prevista

- Pruebas con reloj controlado para los límites de 59,999 y 60,000 ms, sin renovar el plazo por acierto.
- 101 claves distintas, aciertos intermedios y descarte de la primera entrada generada.
- Aislamiento de filtros, página, límite y versión activa; normalización existente y respuesta vacía.
- Fallo de la lectura de filas, total o revisión: no se agrega entrada, y la siguiente solicitud reintenta.
- Publicación manual y programada desde otro proceso, `COMPLETED` y `PARTIAL`, sin reutilización del resultado anterior.
- Carrera entre una lectura en curso y una publicación, y comparación de filas y total en snapshot coherente.
- Medición de las 30 consultas frías y 30 vigentes con 1000 jugadores definida en SC-001.
