# Feature Specification: Observabilidad operativa del marketplace

**Feature Branch**: `feature/015-api-observability`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Incorporar observabilidad operativa al marketplace con un alcance MVP, dejando preparada una evolución futura hacia cache y Redis sin hacerlos necesarios ahora."

## Contexto y objetivo

La feature permite a los responsables de la plataforma conocer qué está
ocurriendo con los servicios del marketplace: qué operaciones se ejecutaron,
quién las realizó, cuánto demoraron, cuántos errores se produjeron y si la
plataforma está disponible para atender nuevas solicitudes.

También ofrece un resumen del estado del catálogo y de la valuación para
facilitar el seguimiento operativo del negocio.

La información operativa de esta primera versión puede reiniciarse cuando se
reinicia la plataforma. El historial funcional del marketplace —jugadores,
cotizaciones, usuarios, portfolios y operaciones— no se ve afectado.

## Clarifications

### Session 2026-11-22

- Q: ¿Quién debe poder consultar los endpoints de observabilidad (`/api/metrics`, `/api/metrics/advanced` y los health checks)? → A: Todos los endpoints de observabilidad serán públicos y sólo expondrán datos técnicos o agregados; no utilizarán autenticación de usuarios ni el superusuario del marketplace.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Auditar la ejecución de los servicios (Priority: P1)

Como responsable de la plataforma, quiero consultar el registro de las
operaciones realizadas sobre el marketplace para conocer quién ejecutó cada
acción, qué información utilizó y cuánto tiempo demoró.

**Why this priority**: La trazabilidad permite investigar errores, validar
operaciones sensibles y entender el comportamiento de los servicios sin
consultar manualmente cada componente del sistema.

**Independent Test**: Ejecutar una operación exitosa y otra fallida, consultar
los registros y comprobar que ambas pueden reconstruirse sin exponer datos
confidenciales.

**Acceptance Scenarios**:

1. **Given** una request a cualquier servicio REST publicado, **When** la
   request finaliza, **Then** se genera un registro estructurado con timestamp,
   usuario o `anonymous`, método HTTP, operación, parámetros sanitizados,
   status HTTP, tiempo de ejecución y correlation ID.
2. **Given** una request autenticada, **When** se registra la operación,
   **Then** el usuario se identifica mediante el usuario autenticado sin
   registrar el token de acceso.
3. **Given** una request con password, token u otro secreto en sus datos,
   **When** se genera el registro, **Then** esos valores se omiten o redactan.
4. **Given** una request que termina con error `4xx` o `5xx`, **When** se
   registra la operación, **Then** el evento conserva el status y el tiempo de
   ejecución y no impide que la respuesta HTTP llegue al cliente.

---

### User Story 2 - Consultar métricas operativas (Priority: P1)

Como responsable de la plataforma, quiero consultar indicadores de tráfico,
errores y tiempos de respuesta para detectar rápidamente degradaciones en los
servicios del marketplace.

**Why this priority**: Estos indicadores permiten diferenciar problemas de
disponibilidad, validación y rendimiento, y sirven como base para futuras
decisiones de escalabilidad.

**Independent Test**: Ejecutar varias operaciones exitosas y fallidas, revisar
los indicadores y verificar que reflejen el tráfico generado.

**Acceptance Scenarios**:

1. **Given** que se ejecutaron requests contra la API, **When** un cliente
   consulta `GET /api/metrics`, **Then** recibe una respuesta en formato de
   exposición compatible con Prometheus.
2. **Given** requests con distintos métodos, rutas y resultados, **When** se
   consultan las métricas, **Then** se pueden distinguir al menos el método,
   la operación y el resultado HTTP.
3. **Given** una request `4xx` o `5xx`, **When** se actualizan las métricas,
   **Then** se incrementa el contador correspondiente al rango de error.
4. **Given** que la aplicación se reinicia, **When** se consulta nuevamente el
   endpoint, **Then** las métricas volátiles comienzan una nueva ventana de
   medición sin afectar los datos funcionales del sistema.

---

### User Story 3 - Verificar disponibilidad de la aplicación (Priority: P1)

Como responsable de operaciones, quiero saber si la plataforma está activa y
si puede atender nuevas solicitudes para distinguir una caída total de un
problema con alguna dependencia.

**Why this priority**: Esta información permite reaccionar antes de que los
usuarios encuentren errores durante el acceso al catálogo o el uso del
mercado.

**Independent Test**: Consultar el estado con la plataforma operativa y repetir
la consulta cuando la base de datos no esté disponible.

**Acceptance Scenarios**:

1. **Given** que el proceso de la aplicación está activo, **When** se consulta
   `GET /api/health/live`, **Then** responde exitosamente indicando que la
   aplicación está viva.
2. **Given** que la aplicación puede conectarse a sus dependencias mínimas,
   **When** se consulta `GET /api/health/ready`, **Then** responde exitosamente
   indicando que está preparada para atender requests.
3. **Given** que la base de datos no está disponible, **When** se consulta el
   readiness check, **Then** responde con estado no saludable y un status HTTP
   que permita identificar que no está preparada.
4. **Given** el endpoint de health existente, **When** se consulta durante la
   transición a los nuevos checks, **Then** se conserva un comportamiento
   compatible o una respuesta documentada para no romper consumidores actuales.

---

### User Story 4 - Consultar métricas avanzadas del dominio (Priority: P2)

Como responsable del marketplace, quiero consultar un resumen de la actividad
del catálogo y de la valuación para conocer el estado actual del negocio.

**Why this priority**: El estado de la valuación y de las cotizaciones impacta
directamente en el ranking, las consultas de jugadores y las decisiones de
inversión.

**Independent Test**: Con jugadores y una estrategia de valuación activa,
consultar el resumen y verificar que refleje el estado actual del sistema.

**Acceptance Scenarios**:

1. **Given** que existe una estrategia de valuación activa, **When** se
   consulta `GET /api/metrics/advanced`, **Then** la respuesta informa el
   código y versión de la estrategia activa.
2. **Given** que existen jugadores y resultados de recálculo, **When** se
   consulta el endpoint, **Then** informa cantidades de jugadores, cotizaciones
   calculadas y rechazadas, y el estado del último recálculo disponible.
3. **Given** que no existe información opcional de recálculo o mercado, **When**
   se consulta el endpoint, **Then** devuelve valores explícitos de ausencia o
   cero sin inventar datos.
4. **Given** que cualquier persona o sistema consulta el endpoint, **When** se
   devuelve el resumen operativo, **Then** sólo se exponen datos técnicos o
   agregados y nunca datos personales, credenciales, saldos o portfolios
   individuales.

### Edge Cases

- Una request sin usuario autenticado se registra como `anonymous`.
- Una request sin correlation ID recibe uno generado por el sistema y ese mismo
  valor se devuelve en la respuesta.
- Una request con parámetros de consulta, body o path inválidos registra una
  representación sanitizada y conserva el status de validación.
- Un error inesperado al ejecutar una ruta se registra como `5xx` sin ocultar
  la respuesta de error existente.
- Una ruta que no puede determinarse de forma segura no debe usar valores de
  parámetros de alta cardinalidad como etiquetas de métricas.
- El endpoint de métricas no debe contabilizarse a sí mismo de forma recursiva.
- Si la base de datos no está disponible, el liveness check puede continuar
  saludable mientras el readiness check informa que la aplicación no está lista.
- Si no hay estrategia activa o no hay recálculos, las métricas avanzadas deben
  responder de forma válida indicando la ausencia, sin producir un error
  interno.
- La futura incorporación de una cache no debe ser necesaria para que esta
  feature funcione.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST auditar todas las requests dirigidas a servicios
  REST publicados, incluyendo requests exitosas y fallidas.
- **FR-002**: Cada evento de auditoría MUST contener timestamp, usuario o
  `anonymous`, método HTTP, operación, parámetros sanitizados, status HTTP,
  tiempo de ejecución y correlation ID.
- **FR-003**: El sistema MUST redactar passwords, tokens de acceso y secretos
  antes de emitir un evento de auditoría.
- **FR-004**: El sistema MUST aceptar el correlation ID enviado por el cliente
  o generar uno cuando no esté presente, y MUST devolverlo en la respuesta.
- **FR-005**: El sistema MUST exponer `GET /api/metrics` con formato compatible
  con Prometheus.
- **FR-006**: Las métricas MUST incluir cantidad de requests, duración de
  requests y cantidad de respuestas `4xx` y `5xx`.
- **FR-007**: Las métricas MUST permitir distinguir como mínimo método HTTP,
  operación y resultado HTTP, evitando etiquetas con valores sensibles o de
  cardinalidad innecesariamente alta.
- **FR-008**: El sistema MUST exponer `GET /api/health/live` para informar si
  la aplicación está activa.
- **FR-009**: El sistema MUST exponer `GET /api/health/ready` para informar si
  la aplicación puede utilizar sus dependencias mínimas requeridas.
- **FR-010**: El sistema MUST exponer `GET /api/metrics/advanced` con un
  resumen válido de métricas operativas del dominio, incluyendo estrategia de
  valuación activa y resultado del último recálculo disponible.
- **FR-011**: El endpoint de métricas avanzadas MUST informar explícitamente
  ausencia o cero cuando no existan datos opcionales, sin inventar valores.
- **FR-012**: Los endpoints de observabilidad MUST poder consultarse sin iniciar
  sesión y MUST evitar cualquier dependencia del superusuario del marketplace.
- **FR-013**: Los endpoints públicos de observabilidad MUST exponer únicamente
  información técnica o agregada; no deben devolver credenciales, datos
  personales, saldos ni portfolios individuales.
- **FR-014**: La feature MUST funcionar sin Redis, sin una cache externa y sin
  persistencia histórica de métricas.
- **FR-015**: La información de métricas MUST poder reiniciarse con la
  aplicación sin modificar jugadores, cotizaciones, usuarios, portfolios ni
  transacciones.
- **FR-016**: La feature MUST incluir tests automatizados para escenarios
  positivos, errores, sanitización de secretos, correlation IDs, health checks
  y formato de métricas.
- **FR-017**: La documentación pública de la API MUST incluir los nuevos
  endpoints y sus respuestas principales.

### Key Entities

- **Evento de auditoría**: Registro estructurado de una request, con actor,
  operación, parámetros sanitizados, resultado, duración y correlation ID.
- **Métrica operativa**: Medición agregada de requests, errores o duración
  observable durante la vida de la aplicación.
- **Estado de salud**: Resultado de la verificación de actividad de la
  aplicación o disponibilidad de sus dependencias mínimas.
- **Resumen de métricas avanzadas**: Vista agregada del estado de jugadores,
  valuaciones, recálculos y, cuando corresponda, operaciones de mercado.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de las rutas REST publicadas genera un evento de auditoría
  con todos los campos obligatorios en requests exitosas y fallidas.
- **SC-002**: Una persona puede consultar el endpoint operativo y verificar la
  cantidad de requests, errores y duración sin acceder directamente a la base
  de datos.
- **SC-003**: Las solicitudes ejecutadas por la plataforma pueden seguirse de
  extremo a extremo mediante un único correlation ID presente en el registro y
  en la respuesta HTTP.
- **SC-004**: Los endpoints de liveness y readiness distinguen correctamente
  entre aplicación activa y aplicación preparada cuando la base de datos está
  disponible o caída.
- **SC-005**: El responsable de la plataforma puede consultar los indicadores
  operativos y el estado de la valuación sin acceder directamente a la base de
  datos ni depender de servicios externos de monitoreo.
- **SC-006**: Los tests automatizados cubren todos los requisitos críticos y
  pasan junto con la suite existente sin eliminar ni debilitar tests previos.
- **SC-007**: Una futura incorporación de cache puede agregar métricas de hit,
  miss e invalidación sin cambiar el contrato de los endpoints de observabilidad.

## Assumptions

- La feature se implementa sobre las APIs REST existentes del marketplace.
- La auditoría requerida en esta versión es de logs estructurados; no se
  agrega una nueva tabla de auditoría para eventos HTTP.
- Las métricas de esta versión son volátiles y sirven para el diagnóstico
  operativo durante la ejecución actual de la plataforma.
- No se requiere desplegar Prometheus; alcanza con exponer el formato que un
  recolector Prometheus podría consumir.
- El readiness check considera PostgreSQL como dependencia mínima actual.
- Los endpoints de observabilidad son públicos porque no existe un rol técnico
  separado del usuario de negocio; los datos expuestos se limitan a información
  técnica o agregada.
- La cache y Redis pertenecen a una evolución posterior orientada a optimizar
  consultas de alta frecuencia, especialmente el ranking.
- Cuando se incorpore cache, se podrán agregar métricas de hit/miss sin hacer
  que Redis sea una dependencia de esta feature.
- Los datos sensibles se identifican como mínimo por nombre de campo y patrón
  de token; la política puede ampliarse sin cambiar el contrato de auditoría.
- Los nuevos endpoints y ejemplos se documentan en OpenAPI y la colección de
  requests existente cuando corresponda.
