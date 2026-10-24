# Feature Specification: Contexto Colectivo de Equipos desde football-data.org

**Feature Branch**: `football-data-context`

**Integration Base Branch**: `main`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Incorporar football-data.org como segunda fuente externa para obtener y persistir el contexto colectivo de los equipos de las cinco ligas soportadas, separado de las estadísticas individuales de WhoScored, sin implementar todavía estrategias ni cotizaciones."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sincronizar tablas de posiciones de las cinco ligas (Priority: P1)

Como sistema de valoración deportiva, quiero obtener de football-data.org la tabla de posiciones de cada una de las cinco competiciones soportadas, para disponer de contexto colectivo de equipo sin duplicar las estadísticas individuales provistas por WhoScored.

**Why this priority**: Es el mínimo de información necesario para que una futura estrategia pueda evaluar el rendimiento colectivo de un jugador.

**Independent Test**: Puede probarse ejecutando una sincronización con respuestas fixture de las cinco competiciones y verificando que cada respuesta válida produce un snapshot original y registros normalizados de posición, puntos, partidos jugados y diferencia de gol.

**Acceptance Scenarios**:

1. **Given** una temporada y las cinco competiciones configuradas, **When** se ejecuta la sincronización autorizada, **Then** se consulta `GET /v4/competitions/{competitionCode}/standings?season={season}` para cada código (`PL`, `BL1`, `PD`, `SA`, `FL1`) y se procesa únicamente la tabla de posiciones.
2. **Given** una respuesta válida de una competición, **When** se normaliza, **Then** se persisten la competición, temporada, equipo, posición, partidos jugados, puntos y diferencia de gol, junto con el snapshot original y sus metadatos de obtención.
3. **Given** una respuesta de football-data.org que incluya goleadores, asistencias, ratings o cualquier otra estadística individual, **When** se procesa, **Then** esos datos no se normalizan ni se persisten como parte de esta feature.
4. **Given** que las cinco competiciones fueron procesadas correctamente, **When** finaliza la sincronización, **Then** una nueva versión válida queda disponible para futuras consultas y estrategias.

---

### User Story 2 - Asociar equipos de WhoScored con football-data.org (Priority: P1)

Como consumidor de datos deportivos, quiero identificar de forma determinista que el equipo de un jugador de WhoScored corresponde al equipo de la tabla de football-data.org, para combinar fuentes sin confundir nombres o duplicar métricas.

**Why this priority**: Sin una asociación explícita, el contexto colectivo no puede aplicarse confiablemente a los jugadores existentes.

**Independent Test**: Puede probarse con nombres equivalentes, diferencias de mayúsculas, tildes y abreviaturas, verificando asociaciones válidas, rechazos de ambigüedad y ausencia de asociaciones inventadas.

**Acceptance Scenarios**:

1. **Given** un equipo de WhoScored y uno de football-data.org de la misma competición y temporada, **When** sus identificadores normalizados y reglas de alias producen una coincidencia única, **Then** se persiste la relación entre ambas identidades.
2. **Given** que los nombres de equipo no coinciden literalmente, **When** existe un alias previamente validado para esa competición, **Then** se utiliza el alias únicamente como clave de vinculación y no como métrica.
3. **Given** que no existe una coincidencia única o que la competición no coincide, **When** se intenta asociar el equipo, **Then** el registro queda sin vincular y se informa el motivo sin asignar contexto colectivo incorrecto.

---

### User Story 3 - Conservar datos válidos ante fallos de sincronización (Priority: P1)

Como operador del sistema, quiero que una respuesta incompleta, un límite de uso o una caída de football-data.org no reemplace la última sincronización válida, para que los consumidores internos puedan seguir usando el contexto colectivo previamente confirmado.

**Why this priority**: La indisponibilidad del proveedor no debe borrar datos útiles ni producir una vista parcialmente mezclada.

**Independent Test**: Puede probarse con fixtures de timeout, HTTP 401/403, HTTP 429, HTTP 5xx, JSON inválido y una competición incompleta, verificando que la versión válida anterior continúa activa y que el error queda registrado.

**Acceptance Scenarios**:

1. **Given** una sincronización activa válida, **When** una ejecución posterior falla o devuelve datos incompletos, **Then** la última sincronización válida permanece disponible y la ejecución fallida no se publica como vigente.
2. **Given** un HTTP 429 o una respuesta que indique límite de uso, **When** se procesa el error, **Then** la ejecución finaliza sin reintentos ilimitados, conserva la versión anterior y registra el estado del proveedor.
3. **Given** que solo algunas de las cinco competiciones responden correctamente, **When** finaliza la ejecución, **Then** no se publica una versión global parcial; los datos válidos de la ejecución quedan asociados a esa ejecución no publicada para diagnóstico, sin reemplazar la versión anterior.
4. **Given** una respuesta válida repetida sin cambios, **When** se sincroniza nuevamente la misma competición y temporada, **Then** el resultado lógico es idempotente y no genera asociaciones o filas vigentes duplicadas.

---

### User Story 4 - Ejecutar y consultar la sincronización con permisos controlados (Priority: P2)

Como operador autorizado, quiero iniciar y consultar sincronizaciones de contexto colectivo, mientras que un usuario inversor solo pueda consumir los datos ya publicados mediante los servicios internos que correspondan.

**Why this priority**: La sincronización modifica datos compartidos y debe estar separada del acceso de lectura del catálogo y de las futuras estrategias.

**Independent Test**: Puede probarse invocando la operación con superusuario, inversor, credenciales ausentes y un proceso interno autorizado, verificando los permisos y la no exposición de la credencial del proveedor.

**Acceptance Scenarios**:

1. **Given** una solicitud manual de sincronización, **When** la realiza un superusuario autenticado, **Then** se acepta la operación y se registra quién la inició.
2. **Given** una solicitud manual de sincronización, **When** la realiza un inversor o una identidad no autenticada, **Then** se rechaza sin contactar al proveedor.
3. **Given** una consulta interna de datos colectivos, **When** la realiza un servicio autorizado de catálogo o estrategias, **Then** obtiene la última versión válida sin invocar directamente a football-data.org.

### Edge Cases

- Una competición puede devolver una tabla vacía, una temporada no disponible o más de una tabla: la ejecución se considera inválida para publicación.
- Una fila sin identificador de equipo, posición, puntos o partidos jugados no se persiste como registro normalizado.
- Valores numéricos negativos o incompatibles con las reglas de una tabla de posiciones se rechazan; la diferencia de gol sí puede ser negativa.
- Un nombre de equipo con cambios de idioma, tildes, puntuación o abreviatura no se considera coincidencia automática si deja más de un candidato posible.
- Un jugador de WhoScored puede no tener equipo asociado o pertenecer a una competición fuera de las cinco soportadas; no recibe contexto colectivo.
- Una respuesta exitosa de HTTP con JSON malformado o con una estructura distinta a la esperada se trata como fallo de proveedor.
- La ausencia o invalidez de la credencial de football-data.org impide iniciar la sincronización, pero no afecta la lectura de la última versión válida.
- Los datos históricos de temporadas anteriores permanecen consultables para recalcular fórmulas futuras y no son sobrescritos por una temporada nueva.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE consumir como único endpoint mínimo `GET /v4/competitions/{competitionCode}/standings?season={season}` de football-data.org. La integración DEBE mantener un mapeo interno entre las cinco ligas soportadas y los códigos del proveedor `PL`, `BL1`, `PD`, `SA` y `FL1`; esos códigos solo identifican qué tabla consultar y no son métricas ni datos de negocio.
- **FR-002**: El sistema DEBE tratar a WhoScored como única fuente de estadísticas individuales de jugador y a football-data.org como única fuente de contexto colectivo de competición/equipo para esta feature.
- **FR-003**: El sistema DEBE normalizar y persistir, por competición, temporada y equipo, únicamente el código/nombre de competición, la temporada, el identificador externo del equipo, el nombre externo del equipo para vinculación, la posición, los partidos jugados, los puntos y la diferencia de gol.
- **FR-004**: El sistema DEBE persistir el snapshot original de cada respuesta aceptada, junto con proveedor, endpoint lógico, competición, temporada, momento de obtención, estado HTTP y una huella de contenido, de modo que los registros normalizados puedan reconstruirse sin volver a consultar internet.
- **FR-005**: El sistema NO DEBE normalizar ni persistir desde football-data.org goleadores, asistencias, ratings, alineaciones, eventos de partidos, fixtures, forma reciente ni estadísticas individuales de jugadores.
- **FR-006**: El sistema DEBE distinguir como mínimo competición, temporada, equipo, versión de sincronización y estado de publicación, evitando mezclar temporadas o competiciones.
- **FR-007**: El sistema DEBE asociar la identidad de equipo de WhoScored con la de football-data.org mediante una clave compuesta por competición/temporada y una relación explícita de identificadores; los nombres y aliases solo pueden utilizarse para resolver esa relación.
- **FR-008**: El sistema DEBE resolver automáticamente las diferencias de nombres deterministas entre ambas fuentes usando la competición y los equipos del standings sincronizado; DEBE dejar sin vincular e informar únicamente los casos ambiguos o no resolubles.
- **FR-009**: El sistema DEBE publicar como vigente únicamente una sincronización completa y válida para las cinco competiciones configuradas; una ejecución parcial o inválida DEBE conservarse para auditoría técnica sin reemplazar la vigente.
- **FR-010**: El sistema DEBE conservar la última sincronización válida por combinación de temporada y conjunto de competiciones, incluyendo su identificador, fecha de publicación y estado.
- **FR-011**: El sistema DEBE ser idempotente: repetir una sincronización con la misma competición, temporada y contenido no DEBE duplicar la relación vigente ni cambiar sus datos normalizados.
- **FR-012**: El sistema DEBE soportar sincronización manual autorizada y DEBE dejar la periodicidad automática para una decisión posterior; no se implementa scheduler ni procesamiento asíncrono en esta feature.
- **FR-013**: La sincronización DEBE requerir una identidad de sistema o superusuario; los inversores y las solicitudes anónimas NO DEBEN iniciar sincronizaciones ni proporcionar la credencial del proveedor.
- **FR-014**: Ante HTTP 429, HTTP 5xx, timeout, credencial inválida, JSON inválido o estructura incompleta, el sistema DEBE registrar el motivo, no publicar la ejecución y mantener disponible la última sincronización válida.
- **FR-015**: El sistema DEBE aplicar un límite finito de reintentos para fallos transitorios y respetar la información de espera del proveedor cuando exista; no DEBE realizar reintentos ilimitados ni persistir datos parciales como vigentes.
- **FR-016**: El acceso de futuras estrategias y servicios internos DEBE realizarse contra la persistencia local de la última sincronización válida, sin consultas directas a football-data.org durante una lectura de jugador.
- **FR-017**: La feature DEBE dejar fuera de alcance el cálculo de scores colectivos, cotizaciones, rankings, compra/venta, portfolio, dashboard, fixtures, alineaciones y cualquier procesamiento asíncrono.
- **FR-018**: La integración DEBE exponer errores de sincronización de forma observable, incluyendo competición, temporada, ejecución, estado del proveedor y motivo, sin registrar la credencial de football-data.org.
- **FR-019**: La sincronización DEBE poder probarse completamente con respuestas locales simuladas, sin depender de internet, y DEBE cubrir las cinco competiciones, asociación, idempotencia, publicación y fallos.

### Key Entities

- **CompetitionContextSnapshot**: Snapshot original e inmutable de una respuesta de standings. Identifica la liga y temporada, y conserva los datos originales recibidos para poder recalcular el contexto si cambia la fórmula.
- **TeamCompetitionStanding**: Registro normalizado de la posición de un equipo en una competición y temporada. Incluye equipo externo, nombre de vinculación, posición, partidos jugados, puntos, diferencia de gol y la actualización de contexto que lo originó.
- **TeamSourceLink**: Relación validada entre el nombre de equipo de WhoScored ya disponible en `players.team` y el equipo identificado por football-data.org, con competición/temporada e identificador externo de football-data.org.
- **CompetitionContextUpdate**: Actualización del contexto colectivo de las cinco competiciones, con identidad, inicio/fin, estado (`VALID`, `PARTIAL`, `FAILED`), errores por competición y fecha de publicación.
- **PublishedCompetitionContext**: Vista lógica obtenida consultando la última actualización válida publicada para una temporada y conjunto de competiciones; no requiere una entidad persistida adicional.

## Sync Contract

### Minimum source request

Para cada competición se realiza una solicitud autenticada a. Los códigos son
identificadores técnicos requeridos por la URL de football-data.org; no
reemplazan al enum interno `League`, no se exponen como una métrica y no
requieren una entidad propia.

```text
GET https://api.football-data.org/v4/competitions/{competitionCode}/standings?season={season}
Header: X-Auth-Token: <provider credential>
```

Los valores soportados son:

| Internal league | football-data.org competition | Code |
|---|---|---|
| `PREMIER_LEAGUE` | Premier League | `PL` |
| `BUNDESLIGA` | Bundesliga | `BL1` |
| `LA_LIGA` | Primera División | `PD` |
| `SERIE_A` | Serie A | `SA` |
| `LIGUE_1` | Ligue 1 | `FL1` |

El parámetro `season` identifica el año de inicio de la temporada según el
contrato del proveedor. No se deben consultar endpoints de scorers, matches,
lineups o fixtures para esta feature.

### Normalized data boundary

La frontera normalizada contiene únicamente los campos necesarios para reconstruir un score colectivo posterior: `league`, `season`, `teamExternalId`, `teamName`, `position`, `playedGames`, `points` y `goalDifference`. `teamName` solo soporta la vinculación y no puede utilizarse como métrica.

El snapshot original se conserva aparte de los registros normalizados. La existencia del snapshot no habilita a consumidores internos a tratar campos no permitidos como estadísticas individuales.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una sincronización fixture completa procesa exactamente las cinco competiciones soportadas y publica una única versión válida con todos sus equipos normalizados.
- **SC-002**: El 100% de los registros normalizados publicados contiene competición, temporada, identificador de equipo, posición, partidos jugados y puntos; la diferencia de gol está presente cuando el proveedor la informa.
- **SC-003**: Una repetición de la misma sincronización con contenido idéntico deja una sola representación vigente por combinación de competición, temporada y equipo, sin duplicados lógicos.
- **SC-004**: Frente a cualquier fixture incompleto, inválido, limitado o fallido, la última sincronización válida continúa siendo recuperable y no se publica una versión parcial.
- **SC-005**: Las pruebas automatizadas ejecutan sin acceso de red y cubren las cinco competiciones, las reglas de asociación, los permisos de sincronización y los escenarios de recuperación.
- **SC-006**: Ninguna respuesta de football-data.org utilizada por esta feature genera registros de goleadores, asistencias, ratings o cualquier estadística individual de jugador.
- **SC-007**: Un consumidor interno puede obtener el contexto colectivo vigente desde almacenamiento local sin emitir una solicitud a football-data.org durante la consulta.

## Assumptions

- La API de football-data.org mantiene el endpoint de standings y los códigos de competición indicados; cualquier cambio de contrato se trata como error de proveedor y no se publica.
- Una temporada se sincroniza como una unidad de cinco competiciones. La publicación global requiere que las cinco sean válidas para evitar una vista mezclada.
- La primera sincronización será manual y explícitamente autorizada. La frecuencia automática, scheduler y reintentos operativos detallados se decidirán en una feature posterior.
- La retención de snapshots y tablas históricas no se limita en esta especificación, porque es necesaria para recalcular fórmulas futuras y comparar temporadas.
- La credencial del proveedor se configura fuera de los datos de dominio, nunca se expone en respuestas de API ni se incluye en logs o snapshots.
- La resolución automática utiliza reglas de identidad deterministas por competición; una excepción no resoluble puede corregirse manualmente sin formar parte del flujo normal.
- El modelo existente de `Player` continúa siendo la fuente de identidad WhoScored para estadísticas individuales; esta feature agrega contexto colectivo sin reemplazar ni copiar sus métricas.

## Decisions Pending

- Definir en una feature posterior la frecuencia concreta de sincronización automática y el mecanismo scheduler.
- Definir si el acceso de lectura del contexto colectivo tendrá un endpoint administrativo/operativo propio o será exclusivamente un contrato interno para estrategias.
- Definir la política de actualización de aliases cuando un proveedor cambie el nombre de un equipo.
