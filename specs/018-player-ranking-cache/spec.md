# Feature Specification: Caché en memoria del ranking de jugadores

**Feature Branch**: Pendiente de creación; esta etapa produce solo la especificación  
**Created**: 2026-11-23  
**Status**: Draft  
**Input**: Incorporar una caché en memoria para consultas repetidas del ranking de jugadores, con vencimiento e invalidación tras el recálculo de cotizaciones, sin cambiar su contrato ni otros ámbitos del marketplace.

## Clarifications

### Session 2026-11-23

- Q: ¿Cuántos resultados de consultas distintas debe conservar como máximo la caché al mismo tiempo? → A: Hasta 100 resultados; al superar el límite se descartan los más antiguos.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Repetir una consulta reciente (Priority: P1)

Como usuario autenticado del marketplace, quiero volver al mismo ranking sin esperar nuevamente la consulta completa, conservando exactamente los datos y el formato que ya recibo.

**Why this priority**: Reducir la espera en consultas repetidas es el objetivo de esta entrega.

**Independent Test**: Solicitar dos veces el ranking con los mismos criterios antes de su vencimiento y comparar ambas respuestas con la consulta original; comprobar que la segunda reutiliza el resultado reciente.

**Acceptance Scenarios**:

1. **Given** una consulta autenticada de ranking que terminó con respuesta completa `200`, **When** se repite con los mismos filtros, página y límite antes de 60 segundos desde la creación de ese resultado, **Then** se puede reutilizar el resultado y se devuelven los mismos jugadores, orden, puestos, valores, contexto de estrategia y paginación.
2. **Given** que todavía no hay un resultado vigente para una consulta, **When** un usuario autenticado la solicita, **Then** se obtiene el ranking a partir de los datos persistidos y se devuelve el contrato actual.
3. **Given** una respuesta completa `200` con `players: []`, **When** se repite la misma consulta antes de su vencimiento, **Then** puede reutilizarse esa respuesta vacía con sus metadatos de estrategia y paginación intactos.
4. **Given** 100 resultados vigentes de consultas distintas, **When** se guarda un resultado nuevo, **Then** se descarta el generado primero; si se vuelve a solicitar, se obtiene desde los datos persistidos.

---

### User Story 2 - Filtrar y recorrer páginas sin mezclar resultados (Priority: P1)

Como usuario, quiero aplicar los filtros y la paginación actuales para que un resultado reciente de otra búsqueda no altere lo que veo.

**Why this priority**: Una respuesta de otra página o filtro daría información incorrecta aunque llegara rápido.

**Independent Test**: Consultar distintas combinaciones de liga, equipo, posición, página y límite, repetirlas en distinto orden y contrastar cada respuesta con la misma consulta sin resultado vigente.

**Acceptance Scenarios**:

1. **Given** un resultado vigente para una combinación de `league`, `team` y `position`, **When** cambia cualquiera de esos filtros, **Then** la respuesta corresponde exclusivamente a la nueva combinación.
2. **Given** un resultado vigente para una página y un límite, **When** cambia `page` o `limit`, **Then** se obtienen los jugadores, puestos y metadatos de la página y tamaño solicitados.
3. **Given** filtros y paginación equivalentes tras la normalización y los valores predeterminados actuales, **When** se repite la consulta, **Then** puede reutilizarse el mismo resultado sin cambiar su significado.

---

### User Story 3 - Ver cotizaciones nuevas después de recalcular (Priority: P1)

Como usuario, quiero que el ranking muestre las cotizaciones recién publicadas después de un recálculo, aunque hubiese consultado el ranking momentos antes.

**Why this priority**: La rapidez no debe ocultar valores nuevos ni mantener el orden anterior después de una actualización exitosa.

**Independent Test**: Consultar y repetir un ranking, publicar cotizaciones nuevas mediante los flujos de recálculo existentes y verificar que la primera consulta posterior muestra los valores, puestos y totales que corresponden a los datos persistidos actualizados.

**Acceptance Scenarios**:

1. **Given** resultados vigentes para varias combinaciones de filtros y páginas, **When** un recálculo manual o programado publica exitosamente una o más cotizaciones, **Then** la primera consulta posterior de cualquiera de esas combinaciones refleja los datos persistidos nuevos, aunque no hayan transcurrido 60 segundos.
2. **Given** un recálculo que publica algunas cotizaciones y termina con estado `PARTIAL`, **When** se consulta el ranking después de su publicación, **Then** se reflejan esas cotizaciones publicadas y no se reutiliza un resultado anterior al recálculo.
3. **Given** una consulta de ranking iniciada antes de una publicación exitosa y terminada después, **When** llega una consulta posterior, **Then** el resultado anterior a la publicación no puede volver a considerarse vigente.

---

### User Story 4 - Conservar las respuestas y los errores actuales (Priority: P2)

Como usuario o consumidor del ranking, quiero recibir la misma respuesta autenticada y los mismos errores actuales cuando falten datos válidos o falle una lectura.

**Why this priority**: Una optimización de lectura no debe cambiar el contrato ni convertir un fallo en datos incompletos o antiguos.

**Independent Test**: Repetir consultas sin sesión válida, con parámetros inválidos, sin estrategia activa y con una falla de lectura; recuperar la lectura y comprobar que ninguna respuesta de error se reutiliza.

**Acceptance Scenarios**:

1. **Given** un resultado vigente obtenido por otro usuario, **When** se solicita el ranking sin autenticación válida, **Then** se mantiene `401` y no se entrega el resultado protegido.
2. **Given** parámetros inválidos o desconocidos, **When** se solicita el ranking, **Then** se mantiene `400` y no se reutiliza un resultado válido de otra consulta.
3. **Given** ausencia de estrategia activa, **When** se solicita el ranking, **Then** se mantiene `409` y no se presenta un ranking guardado de una estrategia anterior.
4. **Given** que falla una lectura necesaria o no se logra completar la respuesta, **When** se solicita el ranking, **Then** se mantiene el error actual; una solicitud posterior vuelve a intentar obtener datos persistidos.

### Edge Cases

- Un resultado deja de ser vigente al cumplir 60 segundos desde que terminó de generarse; consultarlo no reinicia ese plazo.
- La caché conserva como máximo 100 resultados simultáneos; cuando se supera el límite, se descarta primero el de generación más antigua, aunque no haya vencido.
- Si la aplicación se reinicia, la primera consulta vuelve a obtener datos persistidos y conserva el mismo contrato.
- Si cambia la versión activa de valuación, la siguiente consulta usa esa versión y nunca una respuesta de la versión anterior; sin versión activa corresponde `409`.
- Una página válida sin jugadores y una búsqueda sin coincidencias son respuestas completas que pueden reutilizarse durante su vigencia.
- Una falla entre la obtención de jugadores y el total de paginación no produce una respuesta reutilizable.
- Un recálculo fallido que no publica cotizaciones no introduce valores ficticios ni modifica por sí mismo la respuesta del ranking; rige el vencimiento ordinario del resultado previo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La caché en memoria DEBE aplicarse exclusivamente a la lectura del ranking de jugadores existente; no DEBE alterar saldos, portfolios, compras, ventas ni historial de operaciones.
- **FR-002**: Una respuesta `200` completa DEBE poder reutilizarse para consultas equivalentes de ranking durante menos de 60 segundos desde que terminó de generarse. Al cumplir 60 segundos, DEBE obtenerse nuevamente desde los datos persistidos.
- **FR-003**: La identidad de cada resultado vigente DEBE distinguir la versión activa de valuación, los filtros `league`, `team` y `position`, la página `page` y el tamaño `limit`, según la validación, normalización y valores predeterminados existentes.
- **FR-004**: La consulta DEBE conservar el método, la autenticación, los parámetros admitidos, sus valores por defecto y límites, el orden, los desempates, la selección de cotización, los puestos globales, la paginación, el formato de respuesta y los códigos de error actuales.
- **FR-005**: La autenticación y la validación de parámetros DEBEN aplicarse en cada solicitud, incluso cuando exista un resultado vigente. Ningún resultado del ranking DEBE entregarse a una solicitud no autorizada.
- **FR-006**: Ante una ausencia o vencimiento del resultado vigente, el ranking DEBE seguir funcionando con la versión activa y las cotizaciones persistidas, sin recalcular valores durante la lectura.
- **FR-007**: Después de la publicación exitosa de una o más cotizaciones por cualquiera de los recálculos existentes, incluidos los de estado `PARTIAL` y los ejecutados por el worker programado en otro proceso, la siguiente consulta DEBE reflejar el estado persistido posterior a esa publicación. Ningún resultado generado antes de ella DEBE seguir vigente ni volver a quedar vigente por una consulta concurrente.
- **FR-008**: Un cambio de versión activa DEBE hacerse visible en la siguiente consulta; una ausencia de versión activa DEBE seguir produciendo `409`, aun si existe un resultado guardado de una versión anterior.
- **FR-009**: Solo respuestas `200` completas, incluidos rankings vacíos válidos, PUEDEN guardarse. Errores, respuestas parciales y combinaciones inconsistentes de jugadores y paginación NO DEBEN guardarse.
- **FR-010**: La caché PUEDE vaciarse al reiniciar la aplicación; tras ese reinicio, el ranking DEBE continuar disponible mediante su lectura habitual de datos persistidos.
- **FR-011**: La caché DEBE conservar como máximo 100 resultados de consultas distintas. Si guardar uno nuevo supera ese límite, DEBE descartar el resultado con instante de generación más antiguo; una consulta posterior de ese resultado DEBE obtener los datos persistidos.

### Key Entities _(include if feature involves data)_

- **Consulta de ranking**: combinación validada de versión activa, liga, equipo, posición, página y límite que identifica un resultado independiente.
- **Resultado de ranking**: respuesta completa con estrategia, versión, jugadores ordenados y paginación, idéntica en contenido a la consulta existente para ese estado de datos.
- **Vigencia del resultado**: instante de generación y límite máximo de 60 segundos durante el cual puede reutilizarse, salvo una publicación de cotizaciones o cambio de versión activa anterior al vencimiento.
- **Capacidad de resultados**: máximo de 100 resultados simultáneos; los más antiguos por instante de generación salen antes de su vencimiento si se alcanza ese máximo.
- **Publicación de cotizaciones**: finalización exitosa de la persistencia de una o más cotizaciones por un recálculo manual o programado que hace obsoletos los resultados previos.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: En una prueba controlada con al menos 1000 jugadores rankeables y 30 consultas idénticas por grupo, la mediana del tiempo de las consultas repetidas con resultado vigente es al menos 25% menor que la mediana de 30 consultas equivalentes sin resultado vigente, en el mismo entorno y con los mismos datos.
- **SC-002**: En el 100% de los escenarios de filtros, página, límite, respuesta vacía y usuarios autenticados, la respuesta coincide en contenido, orden, puestos, paginación y contexto de estrategia con la lectura del ranking existente para los mismos datos.
- **SC-003**: En el 100% de los casos de vencimiento, ningún resultado con 60 segundos o más desde su generación se reutiliza; consultar durante su vigencia no extiende su antigüedad máxima.
- **SC-004**: En el 100% de las consultas iniciadas después de una publicación exitosa de cotizaciones, el ranking refleja los valores persistidos nuevos en la primera respuesta, tanto para recálculos completos como parciales con al menos una cotización publicada.
- **SC-005**: En el 100% de las pruebas de falta de autenticación, parámetros inválidos, ausencia de estrategia, fallas de lectura y respuestas incompletas, se conserva el comportamiento de error actual y no se reutiliza ni se guarda una respuesta indebida.
- **SC-006**: Tras un reinicio, el primer ranking válido se completa con datos persistidos sin intervención del usuario y las consultas repetidas pueden volver a beneficiarse de la caché.
- **SC-007**: En el 100% de las pruebas con más de 100 consultas distintas, nunca se conservan más de 100 resultados simultáneos; al pedir uno descartado se obtiene la respuesta correspondiente a los datos persistidos vigentes.

## Assumptions

- El ranking existente de la feature 007 y su interfaz de la feature 012 son las referencias del contrato y de la experiencia; esta entrega no cambia ninguna de las dos.
- El plazo de 60 segundos es una decisión de esta especificación para hacer verificable la antigüedad máxima solicitada.
- El alcance operacional es una instancia de aplicación web con memoria local y el worker programado existente, que se ejecuta en otro proceso y comparte los datos persistidos. La coordinación entre varias instancias web no forma parte de esta entrega.
- Los flujos manual y programado de recálculo existentes pueden publicar cotizaciones; `PARTIAL` puede implicar cotizaciones nuevas persistidas y requiere la misma frescura del ranking que `COMPLETED` cuando publica al menos una.
- Los cambios de jugadores por otras vías, como sincronización del catálogo, quedan sujetos al vencimiento máximo ordinario de 60 segundos; no se agregan disparadores de invalidación para esas vías.

## Out of Scope

- Redis, caché distribuida, persistencia de la caché, coordinación entre instancias y cambios en la base de datos.
- Caché para saldos, portfolios, compras, ventas, cotizaciones individuales, catálogo o historial de operaciones.
- Nuevos filtros, cambios de autenticación, cambios en la fórmula o programación del recálculo y cambios en la pantalla del ranking.
