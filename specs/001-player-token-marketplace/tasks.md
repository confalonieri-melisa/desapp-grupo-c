# Tasks: Entrega 1 - Core CI/CD, Modelo Mínimo, Autenticación y Catálogo de Jugadores

**Feature Branch**: `feature/001-player-token-marketplace`  
**Integration Base Branch**: `main`  
**Input**: Design documents from `specs/001-player-token-marketplace/` (`plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/openapi.yaml`, `contracts/postman_collection.json`)  
**Status**: Ready for Implementation  

---

## Protocolo de Ejecución y Pausa por Tarea (Confirmación Obligatoria)

> [!IMPORTANT]
> **Regla de Operación Paso a Paso**:
> 1. El agente debe ejecutar **únicamente una tarea individual a la vez**.
> 2. Al completar cada tarea individual y antes de proceder con el commit o la siguiente tarea, **el agente debe pausar la ejecución y pedir confirmación explícita al usuario**.
> 3. No se continuará con la siguiente tarea ni se realizarán commits adicionales sin la aprobación explícita del usuario en el chat.
> 4. Los commits deben ser granulares y atómicos respetando la convención de GitFlow establecida.
> 5. **Apertura y Publicación de Pull Requests**: Al cerrar una fase o hito, el agente tiene la responsabilidad de abrir y publicar el Pull Request en GitHub hacia la rama `dev` con descripción concisa de los cambios. La aprobación y merge corresponden **exclusivamente a los Project Owners** (el agente no puede aprobar ni mergear).
> 6. **Pipeline Desacoplado (Sin seguimiento activo)**: El pipeline de GitHub Actions se dispara de forma automática ante cada PR y push evaluando lint, pruebas con cobertura y Quality Gate de SonarCloud. El agente no debe realizar seguimiento activo ni polling de su ejecución; si surge un error en el pipeline, será informado para su correspondiente solución.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Associated User Story (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are specified in each task

---

## Phase 1: Setup & Tooling Infrastructure

**Purpose**: Initialize dependencies, project directory structure, test runners and quality tooling.

- [x] T001 Initialize project runtime and dev dependencies in [package.json](file:///C:/Users/meluk/UNQ/desapp-grupo-c/package.json) (`drizzle-orm`, `postgres`, `bcryptjs`, `@types/bcryptjs`, `jsonwebtoken`, `@types/jsonwebtoken`, `zod`, `vitest`, `@vitest/coverage-v8`, `swagger-ui-dist`, `yaml`, `dotenv`)
- [x] T002 [P] Configure Vitest runner with TypeScript path aliases and coverage thresholds in [vitest.config.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/vitest.config.ts)
- [x] T003 [P] Configure SonarCloud static analysis properties in [sonar-project.properties](file:///C:/Users/meluk/UNQ/desapp-grupo-c/sonar-project.properties)
- [x] T004 [P] Configure Drizzle ORM Kit settings in [drizzle.config.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/drizzle.config.ts)
- [x] T005 [P] Setup environment variable schema and validator in [src/config/env.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/config/env.ts)

---

## Phase 2: Foundational (Database Connection & Infrastructure Utilities)

**Purpose**: Core infrastructure that must be ready before any business or domain logic is executed.

- [ ] T006 Implement PostgreSQL database client connection pooling in [src/db/index.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/db/index.ts)
- [ ] T007 [P] Implement password hashing and verification utility using bcrypt in [src/utils/hash.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/utils/hash.ts)
- [ ] T008 [P] Implement JWT issuance and verification utility with 24-hour expiration in [src/utils/jwt.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/utils/jwt.ts)
- [ ] T009 [P] Implement structured JSON logging utility with correlation ID support in [src/middlewares/logger.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/middlewares/logger.ts)
- [ ] T010 Implement standard domain error classes and HTTP error response mapping in [src/models/errors.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/models/errors.ts)

**Checkpoint**: Foundation ready. User story implementations can now proceed.

---

## Phase 3: User Story 1 - CI/CD Pipeline, Health Check & OpenAPI Documentation (Priority: P1) 🎯 MVP

**Goal**: Expose system health endpoint, interactive OpenAPI v3 Swagger UI documentation at `/api/docs`, and configure the GitHub Actions CI pipeline running lint, test coverage, and SonarCloud analysis.

**Independent Test**:
- Trigger GitHub Actions CI workflow and verify status `SUCCESS`.
- Query `GET /api/health` and verify `200 OK` with system status.
- Access `GET /api/docs` and verify the OpenAPI 3.0 interactive Swagger UI with `BearerAuth` security scheme.

### Tests for User Story 1
- [ ] T011 [P] [US1] Unit and integration test for health endpoint in [tests/integration/health.routes.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/integration/health.routes.spec.ts)

### Implementation for User Story 1
- [ ] T012 [P] [US1] Create health controller in [src/controllers/health.controller.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/controllers/health.controller.ts)
- [ ] T013 [US1] Implement route handler `GET /api/health` in [src/app/api/health/route.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/app/api/health/route.ts)
- [ ] T014 [P] [US1] Implement Swagger OpenAPI UI route handler exposing `contracts/openapi.yaml` in [src/app/api/docs/route.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/app/api/docs/route.ts)
- [x] T015 [US1] Configure GitHub Actions CI workflow pipeline (lint, TypeScript build, Vitest coverage, SonarCloud scan) in [.github/workflows/ci.yml](file:///C:/Users/meluk/UNQ/desapp-grupo-c/.github/workflows/ci.yml)

**Checkpoint**: User Story 1 complete. Health, OpenAPI documentation, and automated CI pipeline are operational.

---

## Phase 4: User Story 2 - Rich Domain Model, Invariants & Persistence (Priority: P1)

**Goal**: Implement the rich domain model entities (`User`, `Player`, `TokenHolding`, `QuoteHistory`, `AuditLog`), enforce domain invariants (5 official leagues, 1,000 welcome credits, fixed 100 tokens at $t_0$), configure Drizzle relational tables, and provide a 15-player seeding script.

**Independent Test**:
- Run unit tests in `tests/unit/models/` to verify invariant validations (rejection of unofficial leagues, welcome credit assignment, token base issuance).
- Execute the seeding script and verify database persistence of 15 players across all 5 leagues.

### Tests for User Story 2
- [ ] T016 [P] [US2] Unit tests for `User` domain model invariants (email validation, role assignment, 1,000 initial credits) in [tests/unit/models/User.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/unit/models/User.spec.ts)
- [ ] T017 [P] [US2] Unit tests for `Player` domain model invariants (official 5 leagues enforcement, metrics validation) in [tests/unit/models/Player.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/unit/models/Player.spec.ts)
- [ ] T018 [P] [US2] Unit tests for `TokenHolding` domain model invariants (100 token emission at base price 1.00) in [tests/unit/models/TokenHolding.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/unit/models/TokenHolding.spec.ts)

### Implementation for User Story 2
- [ ] T019 [P] [US2] Define domain enums (`League`, `Position`, `UserRole`) in [src/models/enums.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/models/enums.ts)
- [ ] T020 [P] [US2] Implement rich `User` domain entity with business methods and balance rules in [src/models/User.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/models/User.ts)
- [ ] T021 [P] [US2] Implement rich `Player` domain entity enforcing the 5 official leagues invariant in [src/models/Player.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/models/Player.ts)
- [ ] T022 [P] [US2] Implement `TokenHolding` domain entity for token tracking in [src/models/TokenHolding.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/models/TokenHolding.ts)
- [ ] T023 [US2] Define Drizzle ORM schema for tables `users`, `players`, `token_holdings`, `quote_history`, and `audit_logs` in [src/db/schema.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/db/schema.ts)
- [ ] T024 [P] [US2] Implement `UserRepository` with Drizzle ORM in [src/repositories/user.repository.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/repositories/user.repository.ts)
- [ ] T025 [P] [US2] Implement `PlayerRepository` with filtering and pagination in [src/repositories/player.repository.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/repositories/player.repository.ts)
- [ ] T026 [US2] Create database seeder with 15 initial players (3 per official league) and superuser token holdings in [src/db/seeds/seed.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/db/seeds/seed.ts)

**Checkpoint**: User Story 2 complete. Domain models, invariants, ORM schema, repositories, and dataset seeder are verified.

---

## Phase 5: User Story 3 - User Registration, Authentication & JWT Access Control (Priority: P1)

**Goal**: Implement investor registration with 1,000 welcome credits, login with 24-hour JWT token issuance, and Bearer token authentication middleware rejecting unauthorized requests with 401 Unauthorized.

**Independent Test**:
- Execute `POST /api/auth/register` and verify user creation with hashed password and 1,000 credit balance.
- Execute `POST /api/auth/login` and verify receipt of a valid 24-hour JWT token.
- Query protected endpoints with and without the Bearer token to verify access control (401 on missing/invalid token, 200 on valid token).

### Tests for User Story 3
- [ ] T027 [P] [US3] Unit tests for `AuthService` orchestrator with repository mocks in [tests/unit/services/auth.service.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/unit/services/auth.service.spec.ts)
- [ ] T028 [P] [US3] Integration tests for `POST /api/auth/register` and `POST /api/auth/login` routes in [tests/integration/auth.routes.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/integration/auth.routes.spec.ts)
- [ ] T029 [P] [US3] Unit and integration tests for Bearer JWT middleware authentication and 401 rejection in [tests/unit/middlewares/auth.middleware.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/unit/middlewares/auth.middleware.spec.ts)

### Implementation for User Story 3
- [ ] T030 [US3] Implement `AuthService` orchestrating registration validation, user entity creation, password hashing, and 24h JWT issuance in [src/services/auth.service.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/services/auth.service.ts)
- [ ] T031 [US3] Implement authentication middleware guard (`requireAuth`) validating Bearer JWT header in [src/middlewares/auth.middleware.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/middlewares/auth.middleware.ts)
- [ ] T032 [US3] Implement `AuthController` handling registration and login request validation with Zod in [src/controllers/auth.controller.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/controllers/auth.controller.ts)
- [ ] T033 [P] [US3] Create Next.js route handler for `POST /api/auth/register` in [src/app/api/auth/register/route.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/app/api/auth/register/route.ts)
- [ ] T034 [P] [US3] Create Next.js route handler for `POST /api/auth/login` in [src/app/api/auth/login/route.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/app/api/auth/login/route.ts)

**Checkpoint**: User Story 3 complete. Registration, 1,000 credit welcome grant, login, JWT issuance, and authentication guard are operational.

---

## Phase 6: User Story 4 - Protected Player Catalog & Details Lookup (Priority: P1)

**Goal**: Expose protected endpoints for querying players with combined filtering (`league`, `team`, `position`) and pagination (default 20, max 100), and fetching full player details by ID.

**Independent Test**:
- Call `GET /api/players` with valid JWT and filters (e.g. `league=LA_LIGA&position=FORWARD`) and verify filtered, paginated results with 200 OK.
- Call `GET /api/players/:id` with valid JWT and verify complete player details.
- Attempt calls without token to verify 401 Unauthorized rejection.

### Tests for User Story 4
- [ ] T035 [P] [US4] Unit tests for `PlayerService` orchestrator (filtering, pagination defaults, not found handling) in [tests/unit/services/player.service.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/unit/services/player.service.spec.ts)
- [ ] T036 [P] [US4] Integration tests for `GET /api/players` and `GET /api/players/:id` endpoints in [tests/integration/players.routes.spec.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/tests/integration/players.routes.spec.ts)

### Implementation for User Story 4
- [ ] T037 [US4] Implement `PlayerService` orchestrator coordinating repository search and domain mappings in [src/services/player.service.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/services/player.service.ts)
- [ ] T038 [US4] Implement `PlayerController` handling query validation, pagination parameters, and response formatting in [src/controllers/player.controller.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/controllers/player.controller.ts)
- [ ] T039 [P] [US4] Create protected Next.js route handler for `GET /api/players` in [src/app/api/players/route.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/app/api/players/route.ts)
- [ ] T040 [P] [US4] Create protected Next.js route handler for `GET /api/players/[id]` in [src/app/api/players/[id]/route.ts](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/src/app/api/players/[id]/route.ts)

**Checkpoint**: User Story 4 complete. Full player catalog, filtering, pagination, and detail lookup are verified.

---

## Phase 7: Documentation & GitFlow Pull Request

**Purpose**: Documentation updates and Pull Request preparation for Project Owner review.

- [ ] T044 Update quickstart execution documentation in [specs/001-player-token-marketplace/quickstart.md](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/specs/001-player-token-marketplace/quickstart.md) and project [README.md](file:///C:/Users/Usuario/Desktop/Facu/desapp-grupo-c/README.md)
- [ ] T045 Create Pull Request from `feature/001-player-token-marketplace` into `main` branch with structured summary for Project Owner review and approval

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: No dependencies. Can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion. Blocks all user stories.
- **Phase 3 (User Story 1 - CI/CD & OpenAPI)**: Can start after Phase 2 completion.
- **Phase 4 (User Story 2 - Rich Domain Model & DB)**: Can start after Phase 2 completion.
- **Phase 5 (User Story 3 - Auth & JWT)**: Depends on Phase 4 (User domain model and UserRepository).
- **Phase 6 (User Story 4 - Player Catalog)**: Depends on Phase 4 (Player domain model and PlayerRepository) and Phase 5 (Auth middleware).
- **Phase 7 (Documentation & PR)**: Depends on all User Stories being implemented and tested.

### Parallel Execution Opportunities
- Tasks marked `[P]` within each phase can be executed concurrently without file conflicts.
- Unit tests (`tests/unit/`) can be written before or alongside domain and service implementations (TDD workflow).
- Controllers and Next.js route handlers can be developed in parallel once services are specified.
