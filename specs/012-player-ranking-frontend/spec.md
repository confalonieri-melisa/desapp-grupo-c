# Feature Specification: Ranking de jugadores en el frontend

**Feature Branch**: `feature/012-player-ranking-frontend`

**Integration Base Branch**: `main`

**Stacked On**: `feature/011-player-name-search` (branch de partida indicada por el usuario)

**Created**: 2026-10-26

**Status**: Approved for Implementation

**Approval**: El usuario autorizó iniciar `speckit-implement` y continuar por historias en la conversación del 2026-10-27. La aprobación formal de entrega sigue pendiente.

**Input**: [Prompt de specify](prompt.md)

## Alcance

Esta entrega permite consultar visualmente el ranking ya calculado por la feature 007. La clasificación corresponde a la versión activa de valuación y usa los valores persistidos que entrega la consulta existente. No cambia el cálculo, la selección de cotizaciones ni el orden del ranking.

## Clarifications

### Session 2026-10-26

- Q: ¿Dónde querés que aparezca el ranking para los usuarios autenticados? → A: Página «Ranking» con acceso en la navegación principal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar el ranking activo (Priority: P1)

Como usuario autenticado, quiero encontrar el ranking y comparar jugadores según su puesto, puntaje y cotización para entender quiénes encabezan la valuación activa.

**Why this priority**: Es la capacidad principal de la entrega.

**Independent Test**: Con una estrategia activa y varios jugadores rankeados, abrir la vista desde la navegación y contrastar los puestos, valores e identidad visibles con la respuesta del ranking existente.

**Acceptance Scenarios**:

1. **Given** una sesión válida y resultados de ranking, **When** el usuario abre «Ranking» desde la navegación principal, **Then** ve a los jugadores en el orden recibido, con el puesto global asignado a cada uno.
2. **Given** una entrada del ranking, **When** se presenta, **Then** muestra nombre, equipo, liga, posición, puntaje final, cotización en créditos por token, fecha y hora de cálculo, y permite abrir el perfil de ese jugador.
3. **Given** una respuesta de ranking, **When** se presenta la lista, **Then** la estrategia y versión activa informadas por esa respuesta son visibles como contexto de los resultados.
4. **Given** dos jugadores con el mismo puntaje, **When** se muestran, **Then** se conserva el orden y el puesto de la respuesta, sin resolver el empate de nuevo en la interfaz.

---

### User Story 2 - Filtrar y recorrer resultados (Priority: P1)

Como usuario, quiero combinar liga, equipo y posición y avanzar por las páginas del ranking para comparar el grupo que me interesa.

**Why this priority**: El resultado completo puede ser extenso y la consulta existente ya ofrece filtros y paginación.

**Independent Test**: Combinar filtros, avanzar y retroceder de página y comprobar que cada vista muestra el conjunto, orden y puestos devueltos para esa consulta.

**Acceptance Scenarios**:

1. **Given** un ranking cargado, **When** el usuario cambia liga, equipo o posición, **Then** ve los resultados de la combinación seleccionada desde la primera página.
2. **Given** filtros activos y más de una página, **When** el usuario avanza o retrocede, **Then** los filtros siguen activos y se informa la página actual y el total de páginas.
3. **Given** filtros activos, **When** el usuario los limpia, **Then** vuelve a la primera página del ranking sin filtros.
4. **Given** un filtro de equipo, **When** el usuario escribe un nombre parcial, **Then** puede consultar equipos coincidentes sin necesitar seleccionar uno visible en la página actual.
5. **Given** la última página o una única página, **When** se muestra la paginación, **Then** no se ofrece avanzar a una página inexistente.

---

### User Story 3 - Entender estados y recuperarse de fallos (Priority: P2)

Como usuario, quiero distinguir entre una consulta en curso, un ranking vacío y un fallo, y poder reintentar sin interpretar datos viejos como actuales.

**Why this priority**: Un ranking sin resultados y un fallo del servicio requieren acciones distintas.

**Independent Test**: Simular una respuesta vacía, un fallo temporal, ausencia de estrategia activa, expiración de sesión y respuestas tardías después de cambiar filtros o usuario.

**Acceptance Scenarios**:

1. **Given** una consulta pendiente, **When** se abre o actualiza el ranking, **Then** se informa la carga y no se presenta un estado vacío como resultado definitivo.
2. **Given** una respuesta exitosa sin jugadores, **When** termina la carga, **Then** se comunica que no hay jugadores rankeados para los filtros actuales y se permite cambiarlos o limpiarlos.
3. **Given** un fallo recuperable, **When** termina la consulta, **Then** se muestra un mensaje comprensible y una acción de reintento para la consulta actual.
4. **Given** que no existe una estrategia de valuación activa, **When** se consulta el ranking, **Then** se muestra un estado específico de indisponibilidad del ranking, sin presentar una lista vacía como si no hubiese jugadores.
5. **Given** una sesión ausente o vencida, **When** se abre o consulta el ranking, **Then** se aplica el flujo de inicio de sesión existente y no quedan resultados protegidos visibles.
6. **Given** una consulta anterior pendiente, **When** cambian los filtros, la página o la sesión antes de recibirla, **Then** esa respuesta tardía no reemplaza los resultados de la consulta vigente ni muestra datos de la sesión anterior.

### Edge Cases

- Una página válida sin elementos, por cambios en los datos entre consultas o por una URL antigua, se informa como sin resultados para esa página y permite volver a una página válida; no se inventan puestos.
- Cuando el conjunto filtrado contiene cero resultados, el total de páginas es cero y no se muestra navegación hacia páginas inexistentes.
- Si cambia la estrategia activa entre consultas, cada vista muestra únicamente el contexto de estrategia y versión de su propia respuesta.
- Una cotización o puntaje se muestra con su unidad y significado correctos; el puntaje no se convierte en una clasificación calculada por la interfaz.
- Una respuesta tardía de una sesión cerrada no vuelve a poblar la vista.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El usuario autenticado DEBE poder acceder a una página propia «Ranking» desde la navegación principal de la aplicación.
- **FR-002**: La vista DEBE presentar los resultados de la consulta de ranking existente de la feature 007 y respetar su orden y el puesto `rank` recibido, incluidos los puestos de páginas posteriores. NO DEBE ordenar, recalcular puntajes ni fabricar cotizaciones o puestos.
- **FR-003**: Cada resultado DEBE mostrar puesto, nombre y acceso al perfil del jugador, equipo, liga, posición, puntaje final, cotización con unidad y fecha y hora de cálculo. El contexto DEBE identificar la estrategia y versión activa informadas por la misma consulta.
- **FR-004**: La vista DEBE permitir combinar filtros de liga, equipo y posición admitidos por el ranking. El filtro de equipo DEBE aceptar texto parcial y no depender de los equipos presentes en la página visible.
- **FR-005**: La vista DEBE permitir limpiar todos los filtros. Al cambiar o limpiar cualquier filtro DEBE consultar la primera página; al cambiar de página DEBE conservar la combinación de filtros.
- **FR-006**: La paginación DEBE indicar página actual, total de páginas y total de jugadores del conjunto filtrado. Solo DEBE permitir navegar a páginas válidas y DEBE mantener los puestos globales devueltos por el ranking.
- **FR-007**: La vista DEBE distinguir carga, resultados, ausencia de resultados, fallo recuperable, ausencia de estrategia activa y sesión no válida. Los fallos recuperables DEBEN ofrecer reintentar la consulta vigente.
- **FR-008**: Si cambia la consulta o la sesión mientras hay una respuesta pendiente, la vista NO DEBE presentar esa respuesta como vigente. Al cerrar o vencer la sesión DEBE retirar los resultados y seguir el flujo de autenticación existente.
- **FR-009**: Los controles, enlaces, puestos y estados DEBEN ser comprensibles con teclado y tecnologías asistivas, tener foco visible y conservar la legibilidad en escritorio y móvil. El puesto y el estado no DEBEN depender exclusivamente del color.
- **FR-010**: La vista DEBE usar únicamente datos del ranking y perfiles existentes. NO DEBE ofrecer recálculo, cambio de estrategia, trading, portfolio, rankings históricos ni búsqueda por nombre dentro del ranking.

### Key Entities *(include if feature involves data)*

- **Entrada de ranking**: Puesto global, identidad del jugador, puntaje final, cotización persistida, unidad y fecha de cálculo recibidos para la versión activa.
- **Contexto de ranking**: Código y versión de la estrategia activa asociada a la respuesta mostrada.
- **Selección de consulta**: Filtros de liga, equipo y posición junto con la página solicitada.
- **Paginación**: Total de jugadores, página actual, tamaño de página y total de páginas del conjunto filtrado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los escenarios con resultados, los puestos, el orden, los puntajes y las cotizaciones visibles coinciden con la consulta de ranking correspondiente.
- **SC-002**: En el 100% de los escenarios de filtrado y paginación, el usuario puede recorrer las páginas válidas sin perder los filtros ni reiniciar los puestos globales.
- **SC-003**: En el 100% de los escenarios de vacío, error, falta de estrategia activa y sesión vencida, la vista muestra un estado distinto y la acción de recuperación que corresponda.
- **SC-004**: En el 100% de los escenarios de cambio de filtros, página o sesión con una consulta anterior pendiente, no se muestran resultados de esa consulta anterior como si fueran actuales.
- **SC-005**: Un usuario autenticado puede llegar al ranking desde la navegación principal en una acción, abrir un perfil y manejar filtros y paginación solo con teclado, tanto en escritorio como en móvil.

## Assumptions

- La página «Ranking» tiene acceso propio en la navegación principal, según la decisión registrada en Clarifications.
- La feature 007 ya proporciona una consulta autenticada y de solo lectura con `players`, `strategyCode`, `strategyVersion` y `pagination`; el backend conserva la autoridad sobre el orden, los filtros y los puestos.
- La consulta admite `league`, `team`, `position`, `page` y `limit`, con tamaño predeterminado de 20 y máximo de 100. La elección de tamaño visible sigue el contrato existente.
- Los roles autenticados actuales pueden consultar el ranking según las reglas del backend. La feature no cambia permisos.
- La fecha y hora usan las convenciones de presentación ya presentes en la aplicación; el instante recibido no se altera.

## Out of Scope

- Cambios al backend, contratos, datos persistidos o reglas de valuación.
- Activar estrategias, recalcular cotizaciones o comparar versiones históricas.
- Trading, portfolio, PnL, exportación, filtros adicionales y búsqueda por nombre dentro del ranking.
