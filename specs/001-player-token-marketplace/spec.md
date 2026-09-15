# Feature Specification: Entrega 1 - Core CI/CD, Modelo Mínimo, Autenticación y Catálogo de Jugadores

**Feature Branch**: `feature/001-player-token-marketplace`

F**Integration Base Branch**: `main`

**Created**: 2026-09-12

**Status**: Ready

**Input**: User description: "Entrega 1 del TP: Core (GitHub Actions, Build SUCCESS, SonarCloud <10 issues, JWT, Swagger v3), Modelo (Modelo mínimo y estructura de datos, Testing unitario automático), Funcionalidad (Creación de usuario y ApiKEY/JWT para acceder al resto de endpoints, Endpoint de catálogo de jugadores protegido)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pipeline de Integración Continua, Calidad y Documentación API (Priority: P1)

Como desarrollador o evaluador del proyecto, quiero que cada cambio subido al repositorio ejecute un pipeline automatizado de integración continua que compile la aplicación, ejecute la suite de tests unitarios, valide los umbrales de calidad en SonarCloud (menos de 10 issues) y exponga la documentación OpenAPI/Swagger v3 interactiva, para asegurar la calidad arquitectónica y la observabilidad del sistema desde el inicio.

**Why this priority**: Es la base técnica y de infraestructura obligatoria para asegurar que todo el código subsiguiente esté verificado y documentado bajo los estándares de la materia y de la constitución del proyecto.

**Independent Test**: Puede probarse de forma independiente disparando el workflow en GitHub Actions, verificando el estado `SUCCESS` del build, comprobando el análisis de SonarCloud con menos de 10 issues, y accediendo a la documentación OpenAPI v3 interactiva en `/api/docs` o `/swagger`.

**Acceptance Scenarios**:

1. **Given** un commit en el repositorio, **When** se ejecuta el workflow de GitHub Actions, **Then** compila el proyecto TypeScript exitosamente y ejecuta todos los tests automáticos en Vitest pasando al 100% en verde con estado `SUCCESS`.
2. **Given** el código fuente analizado por SonarCloud, **When** finaliza el escaneo de calidad estático, **Then** el reporte registra un número de issues estrictamente menor a 10 y aprueba el Quality Gate.
3. **Given** la aplicación backend en ejecución, **When** un cliente HTTP o desarrollador accede a la ruta de documentación de Swagger (`/api/docs`), **Then** se presenta la especificación OpenAPI v3 con todos los esquemas de modelos, endpoints disponibles y el esquema de seguridad Bearer JWT documentado.

---

### User Story 2 - Modelo de Dominio Mínimo, Invariantes y Persistencia (Priority: P1)

Como sistema de valoraciones deportivas, quiero disponer de un modelo de dominio rico y una capa de persistencia relacional con Drizzle ORM sobre PostgreSQL que represente a los Usuarios y a los Jugadores de las 5 ligas europeas oficiales, garantizando sus invariantes mediante tests unitarios aislados.

**Why this priority**: El modelo conceptual es el núcleo de las reglas de negocio; debe estar limpio de dependencias de infraestructura y sólidamente verificado antes de exponer lógica de aplicación.

**Independent Test**: Puede probarse mediante la suite de tests unitarios de dominio en Vitest, verificando la creación de entidades válidas, el rechazo de invariantes violadas (ej. ligas no soportadas, saldos negativos) y el mapeo en base de datos.

**Acceptance Scenarios**:

1. **Given** los datos de un jugador perteneciente a una de las 5 ligas oficiales (Premier League, Bundesliga, La Liga, Serie A, Ligue 1), **When** se instancia la entidad de dominio `Player`, **Then** se valida correctamente su posición, equipo y liga asignada.
2. **Given** un intento de crear un jugador con una liga no perteneciente a las 5 oficiales, **When** se ejecuta la validación de dominio, **Then** se rechaza la creación lanzando una excepción de dominio específica.
3. **Given** la definición del modelo de tokens para el momento inicial $t_0$, **When** se inicializa un jugador en el sistema, **Then** se asocia la estructura base para su emisión fija de 100 tokens a cotización base de 1 crédito.

---

### User Story 3 - Registro, Autenticación y Control de Acceso de Usuarios (Priority: P1)

Como usuario inversor, quiero registrarme en la plataforma con email y contraseña, recibir automáticamente un saldo de bienvenida de 1.000 créditos y obtener un token JWT de autenticación con validez de 24 horas para poder autenticarme y consumir los endpoints protegidos del sistema vía el header `Authorization: Bearer <token>`.

**Why this priority**: Permite la gestión segura de identidades y constituye el mecanismo de acceso y autorización requerido para interactuar con la plataforma.

**Independent Test**: Puede probarse registrando un nuevo usuario con email y contraseña, verificando la persistencia de credenciales seguras (hasheadas), obteniendo el token de autenticación con expiración de 24h e intentando acceder a rutas protegidas con y sin dicho token.

**Acceptance Scenarios**:

1. **Given** datos válidos de registro (email, nombre, contraseña), **When** el usuario solicita su creación en `POST /auth/register`, **Then** el sistema persiste al usuario con contraseña hasheada, le asigna 1.000 créditos iniciales de bienvenida y retorna la confirmación de registro.
2. **Given** un usuario registrado previamente, **When** envía sus credenciales correctas en `POST /auth/login`, **Then** el sistema responde con un token de autenticación JWT válido por 24 horas conteniendo claims de identidad.
3. **Given** una solicitud a un endpoint protegido sin token o con un token inválido/expirado, **When** la petición llega al backend, **Then** el sistema intercepta la petición y responde con código HTTP 401 Unauthorized sin ejecutar la acción solicitada.

---

### User Story 4 - Catálogo y Consulta Protegida de Jugadores de las 5 Ligas (Priority: P1)

Como usuario inversor autenticado, quiero consultar el catálogo de futbolistas filtrando de manera combinada por liga, equipo y posición con paginación por defecto de 20 elementos, y obtener el detalle completo de un jugador con sus métricas deportivas, para explorar el universo de activos disponibles de forma segura.

**Why this priority**: Es la funcionalidad principal de lectura del sistema que permite descubrir y consultar futbolistas pertenecientes a las 5 ligas oficiales, restringida a usuarios autenticados.

**Independent Test**: Puede probarse consultando los endpoints `GET /players` (con y sin filtros / parámetros de paginación) y `GET /players/:id` con un token JWT válido (verificando respuestas 200 OK) y sin token (verificando rechazo con 401 Unauthorized).

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con un token JWT válido, **When** solicita `GET /players` filtrando por `league=LA_LIGA` y `position=FORWARD`, **Then** el sistema responde con la lista paginada de jugadores que cumplen ambos filtros (máximo 20 por defecto) y código HTTP 200 OK.
2. **Given** una petición a `GET /players` o `GET /players/:id` sin header `Authorization: Bearer <token>` o con token inválido, **When** se envía la solicitud, **Then** el sistema rechaza la petición respondiendo con código HTTP 401 Unauthorized.
3. **Given** un usuario autenticado y un identificador válido de jugador, **When** solicita `GET /players/:id`, **Then** el sistema retorna la ficha completa del jugador con código HTTP 200 OK.
4. **Given** un usuario autenticado y un identificador inexistente, **When** solicita `GET /players/:id`, **Then** el sistema responde con código HTTP 404 Not Found y mensaje descriptivo de error.

---

### Edge Cases

- **Registro duplicado de usuario:** Si se intenta registrar un usuario con un email que ya existe en el sistema, debe responder con código HTTP 409 Conflict o 400 Bad Request sin filtrar información sensible ni duplicar registros.
- **Formato inválido de credenciales o token manipulado:** Un JWT con firma alterada, secreto incorrecto o expirado (más de 24 horas) debe ser rechazado inmediatamente en el middleware con 401 Unauthorized.
- **Acceso anónimo a rutas restringidas:** Salvo las rutas públicas explícitas (`POST /auth/register`, `POST /auth/login`, `/api/docs`, `GET /health`), cualquier otro endpoint (`/players/*`, etc.) debe devolver 401 Unauthorized si no se incluye un token Bearer válido.
- **Filtros de catálogo sin coincidencias:** Si una búsqueda combinada por liga, equipo y posición no encuentra ningún jugador, el sistema debe responder 200 OK con una lista vacía `[]`.
- **Paginación y límites en catálogo:** El endpoint `GET /players` adopta paginación con `limit=20` por defecto y un tope máximo de `limit=100` por consulta, soportando navegación por `page` u `offset`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE proveer un pipeline en GitHub Actions que ejecute linting, compilación TypeScript y suite de tests unitarios asegurando resultado `SUCCESS` en cada integración.
- **FR-002**: El sistema DEBE integrarse con SonarCloud para análisis estático continuo garantizando un número total de issues menor a 10.
- **FR-003**: El sistema DEBE exponer la documentación interactiva OpenAPI v3 / Swagger en una ruta pública (`/api/docs`), documentando todos los endpoints y el esquema de autenticación `BearerAuth`.
- **FR-004**: El sistema DEBE modelar las entidades de dominio puras `User` y `Player` desacopladas de frameworks y persistencia, validando sus invariantes mediante tests unitarios en Vitest.
- **FR-005**: El sistema DEBE restringir los jugadores exclusivamente a las 5 ligas oficiales: Premier League (`PREMIER_LEAGUE`), Bundesliga (`BUNDESLIGA`), La Liga (`LA_LIGA`), Serie A (`SERIE_A`) y Ligue 1 (`LIGUE_1`).
- **FR-006**: El sistema DEBE persistir los datos de usuarios y jugadores en PostgreSQL utilizando Drizzle ORM con migraciones estructuradas.
- **FR-007**: El sistema DEBE implementar el endpoint público de registro `POST /auth/register`, persistiendo la contraseña hasheada y asignando el rol `INVESTOR`.
- **FR-008**: El sistema DEBE asignar automáticamente un saldo inicial de bienvenida de exactamente **1.000 créditos** a cada nuevo usuario inversor registrado.
- **FR-009**: El sistema DEBE implementar el endpoint público de autenticación `POST /auth/login`, retornando un token JWT estándar con expiración configurable fijada por defecto en **24 horas** para ser utilizado en el header `Authorization: Bearer <token>`.
- **FR-010**: El sistema DEBE proteger todos los endpoints de negocio (incluyendo el catálogo de jugadores `GET /players` y `GET /players/:id`), permitiendo acceso únicamente con un token JWT válido y respondiendo con HTTP 401 Unauthorized en caso contrario. Los únicos endpoints públicos son `POST /auth/register`, `POST /auth/login`, `/api/docs` y `GET /health`.
- **FR-011**: El sistema DEBE permitir filtrar jugadores en `GET /players` de manera combinada u opcional por `league`, `team` y `position`, con soporte de paginación por defecto de 20 registros y máximo de 100 por consulta.
- **FR-012**: El sistema DEBE exponer el endpoint de detalle individual `GET /players/:id` retornando las estadísticas y atributos biográficos del jugador solicitado.
- **FR-013**: El sistema DEBE proveer un dataset de inicialización (seeding reproducible) que incluya entre 2 y 3 jugadores representativos por cada una de las 5 ligas oficiales (total de 10 a 15 jugadores) para habilitar pruebas y demostraciones inmediatas.

---

### Key Entities *(include if feature involves data)*

- **User (Usuario):** Entidad representativa del inversor o superusuario. Atributos: `id`, `name`, `email`, `passwordHash`, `role` (`INVESTOR`, `SUPERUSER`), `creditBalance` (inicia en 1.000), `createdAt`, `updatedAt`.
- **Player (Jugador):** Entidad deportiva perteneciente a una de las 5 ligas oficiales. Atributos: `id`, `name`, `team`, `league` (`PREMIER_LEAGUE`, `BUNDESLIGA`, `LA_LIGA`, `SERIE_A`, `LIGUE_1`), `position` (`GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`), `statistics` (partidos, minutos, goles, asistencias, etc.).
- **Token Valuation Reference ($t_0$):** Estructura base para emisión fija de 100 tokens y cotización inicial de 1 crédito en preparación para la Entrega 2.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El pipeline de GitHub Actions compila y pasa el 100% de la suite de tests unitarios automáticamente en cada commit a la rama principal o Pull Request.
- **SC-002**: El reporte del proyecto en SonarCloud registra menos de 10 issues en total y mantiene el Quality Gate en estado superado (`Passed`).
- **SC-003**: El 100% de los endpoints implementados (`/auth/register`, `/auth/login`, `/players`, `/players/:id`, `/health`) se encuentran documentados con tipos y respuestas en Swagger UI (OpenAPI v3).
- **SC-004**: Los tests unitarios de dominio en Vitest cubren al menos el 80% de ramas y líneas de la lógica de negocio pura sin dependencias de base de datos externa.
- **SC-005**: El endpoint protegido `GET /players` responde con los jugadores filtrados correctamente en menos de 500 ms ante peticiones autenticadas.
- **SC-006**: El 100% de las peticiones a endpoints protegidos (`/players/*`) sin token JWT o con token inválido/expirado son interceptadas y rechazadas con código HTTP 401 Unauthorized.

---

## Assumptions

- **Stack Tecnológico**: Definido en la Constitución: Next.js / Node.js con TypeScript, Drizzle ORM sobre PostgreSQL, y Vitest para testing.
- **Modelo de Seguridad**: Autenticación centralizada mediante JWT con vigencia de 24 horas (Bearer Token en header `Authorization`). Rutas públicas restringidas exclusivamente a `/auth/register`, `/auth/login`, `/api/docs` y `/health`.
- **Saldo Inicial**: 1.000 créditos asignados automáticamente a cada nuevo inversor en el momento del registro.
- **Seed inicial de jugadores**: El catálogo de la Entrega 1 se nutre de un dataset inicial de seeding con 2 a 3 jugadores por cada una de las 5 ligas (10 a 15 jugadores totales).
- **Paginación del Catálogo**: 20 jugadores por página por defecto, hasta un máximo de 100 registros por solicitud.
- **Invariante de 100 tokens**: El modelo y persistencia respetan la arquitectura para soportar la emisión fija de 100 tokens por jugador en $t_0$.
- **Observabilidad**: Manejo de logs estructurados y Correlation IDs en middleware HTTP.
