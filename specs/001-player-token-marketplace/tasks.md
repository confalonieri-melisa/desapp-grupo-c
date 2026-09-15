# Tasks: Entrega 1 - Core CI/CD, Modelo Mínimo, Autenticación y Catálogo de Jugadores

**Feature Branch base**: `main`
**Modelo de ramas**: Una rama `feature/<id>-<nombre>` por incremento productivo, con PR a `main`
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
> 5. **Apertura y Publicación de Pull Requests**: Al completar cada feature (rama), el agente tiene la responsabilidad de abrir y publicar el Pull Request en GitHub hacia la rama `main` con descripción concisa de los cambios. La aprobación y merge corresponden **exclusivamente a los Project Owners** (el agente no puede aprobar ni mergear).
> 6. **Pipeline Desacoplado (Sin seguimiento activo)**: El pipeline de GitHub Actions se dispara de forma automática ante cada PR y push evaluando lint, pruebas con cobertura y Quality Gate de SonarCloud. El agente no debe realizar seguimiento activo ni polling de su ejecución; si surge un error en el pipeline, será informado para su correspondiente solución.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Associated User Story (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths are specified in each task

---

## ═══════════════════════════════════════
## FEATURE A: CI/CD Pipeline y Health Check
### Rama: `feature/001-ci-pipeline-health` → PR a `main`
## ═══════════════════════════════════════

**Objetivo**: Pipeline automatizado operativo y endpoint de salud público.

**Test independiente**:
- Trigger GitHub Actions CI workflow y verificar estado `SUCCESS`.
- `GET /api/health` responde `200 OK` con estado del sistema.

### Phase 1: Setup de Tooling Base (ya completado)

- [x] T001 Initialize project runtime and dev dependencies in [package.json](file:///C:/Users/meluk/UNQ/desapp-grupo-c/package.json) (`drizzle-orm`, `postgres`, `bcryptjs`, `@types/bcryptjs`, `jsonwebtoken`, `@types/jsonwebtoken`, `zod`, `vitest`, `@vitest/coverage-v8`, `swagger-ui-dist`, `yaml`, `dotenv`)
- [x] T002 [P] Configure Vitest runner with TypeScript path aliases and coverage thresholds in [vitest.config.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/vitest.config.ts)
- [x] T003 [P] Configure SonarCloud static analysis properties in [sonar-project.properties](file:///C:/Users/meluk/UNQ/desapp-grupo-c/sonar-project.properties)
- [x] T004 [P] Configure Drizzle ORM Kit settings in [drizzle.config.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/drizzle.config.ts)
- [x] T005 [P] Setup environment variable schema and validator in [src/config/env.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/config/env.ts)

### Phase 2: CI/CD y Health Endpoint

**Goal**: CI/CD en verde y endpoint de salud funcional.

**Independent Test**:
- `GET /api/health` → `200 OK`
- GitHub Actions workflow dispara y pasa en verde.

#### Implementation para Feature A
- [x] T006 [US1] Configure GitHub Actions CI workflow pipeline (lint, TypeScript build, Vitest coverage, SonarCloud scan) in [.github/workflows/ci.yml](file:///C:/Users/meluk/UNQ/desapp-grupo-c/.github/workflows/ci.yml)
- [x] T007 [P] [US1] Create health controller returning system status in [src/controllers/health.controller.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/controllers/health.controller.ts)
- [x] T008 [US1] Implement route handler `GET /api/health` in [src/app/api/health/route.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/app/api/health/route.ts)

**Checkpoint Feature A**: Abrir PR `feature/001-ci-pipeline-health` → `main`.

---

## ═══════════════════════════════════════
## FEATURE B: Modelo de Dominio Rico y Tests Unitarios
### Rama: `feature/002-domain-model` → PR a `main`
## ═══════════════════════════════════════

**Objetivo**: Entidades de dominio puras con invariantes, desacopladas de infraestructura.

**Dependencia**: Feature A mergeada en `main`.

**Test independiente**:
- `npx vitest run tests/unit/models/` → todos los tests pasan.
- Cobertura ≥ 80% en lógica de negocio pura.

#### Tests para Feature B
- [ ] T009 [P] [US2] Unit tests for `User` domain model invariants (email validation, role assignment, 1,000 initial credits) in [tests/unit/models/User.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/unit/models/User.spec.ts)
- [ ] T010 [P] [US2] Unit tests for `Player` domain model invariants (official 5 leagues enforcement, metrics validation) in [tests/unit/models/Player.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/unit/models/Player.spec.ts)
- [ ] T011 [P] [US2] Unit tests for `TokenHolding` domain model invariants (100 token emission at base price 1.00) in [tests/unit/models/TokenHolding.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/unit/models/TokenHolding.spec.ts)

#### Implementation para Feature B
- [ ] T012 [P] [US2] Define domain enums (`League`, `Position`, `UserRole`) in [src/models/enums.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/models/enums.ts)
- [ ] T013 [P] [US2] Implement standard domain error classes (`InvalidLeagueError`, `DomainValidationError`) in [src/models/errors.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/models/errors.ts)
- [ ] T014 [P] [US2] Implement rich `User` domain entity with business methods and balance rules in [src/models/User.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/models/User.ts)
- [ ] T015 [P] [US2] Implement rich `Player` domain entity enforcing the 5 official leagues invariant in [src/models/Player.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/models/Player.ts)
- [ ] T016 [P] [US2] Implement `TokenHolding` domain entity for fixed 100-token tracking in [src/models/TokenHolding.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/models/TokenHolding.ts)

**Checkpoint Feature B**: Abrir PR `feature/002-domain-model` → `main`.

---

## ═══════════════════════════════════════
## FEATURE C: Persistencia con Drizzle ORM y Seeding
### Rama: `feature/003-persistence-drizzle` → PR a `main`
## ═══════════════════════════════════════

**Objetivo**: Esquema relacional, repositorios y dataset inicial de jugadores.

**Dependencia**: Feature B mergeada en `main` (los modelos de dominio deben existir).

**Test independiente**:
- Ejecutar el seeder y verificar 15 jugadores en BD (3 por liga) y superusuario con token holdings.
- `UserRepository.findByEmail()` y `PlayerRepository.findMany()` devuelven resultados correctos.

#### Implementation para Feature C
- [ ] T017 [US2] Implement PostgreSQL database client connection pooling in [src/db/index.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/db/index.ts)
- [ ] T018 [US2] Define Drizzle ORM schema for tables `users`, `players`, `token_holdings`, `quote_history`, and `audit_logs` in [src/db/schema.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/db/schema.ts)
- [ ] T019 [P] [US2] Implement `UserRepository` with Drizzle ORM (`findByEmail`, `findById`, `save`) in [src/repositories/user.repository.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/repositories/user.repository.ts)
- [ ] T020 [P] [US2] Implement `PlayerRepository` with filtering and pagination in [src/repositories/player.repository.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/repositories/player.repository.ts)
- [ ] T021 [US2] Create database seeder with 15 initial players (3 per official league) and superuser token holdings at t₀ in [src/db/seeds/seed.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/db/seeds/seed.ts)

**Checkpoint Feature C**: Abrir PR `feature/003-persistence-drizzle` → `main`.

---

## ═══════════════════════════════════════
## FEATURE D: Autenticación y Control de Acceso (JWT)
### Rama: `feature/004-auth-jwt` → PR a `main`
## ═══════════════════════════════════════

**Objetivo**: Registro de usuarios, login con JWT 24h, y middleware de protección 401.

**Dependencia**: Feature C mergeada en `main` (`UserRepository` debe existir).

**Test independiente**:
- `POST /api/auth/register` crea usuario con contraseña hasheada y 1.000 créditos.
- `POST /api/auth/login` devuelve JWT válido por 24h.
- Petición a endpoint protegido sin token → 401.

#### Tests para Feature D
- [ ] T022 [P] [US3] Unit tests for `AuthService` orchestrator with repository mocks in [tests/unit/services/auth.service.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/unit/services/auth.service.spec.ts)
- [ ] T023 [P] [US3] Unit and integration tests for Bearer JWT middleware authentication and 401 rejection in [tests/unit/middlewares/auth.middleware.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/unit/middlewares/auth.middleware.spec.ts)
- [ ] T024 [P] [US3] Integration tests for `POST /api/auth/register` and `POST /api/auth/login` routes in [tests/integration/auth.routes.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/integration/auth.routes.spec.ts)

#### Implementation para Feature D
- [ ] T025 [P] [US3] Implement password hashing and verification utility using bcrypt in [src/utils/hash.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/utils/hash.ts)
- [ ] T026 [P] [US3] Implement JWT issuance and verification utility with 24-hour expiration in [src/utils/jwt.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/utils/jwt.ts)
- [ ] T027 [P] [US3] Implement structured JSON logging utility with correlation ID support in [src/middlewares/logger.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/middlewares/logger.ts)
- [ ] T028 [US3] Implement `AuthService` orchestrating registration validation, user entity creation, password hashing, and 24h JWT issuance in [src/services/auth.service.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/services/auth.service.ts)
- [ ] T029 [US3] Implement authentication middleware guard (`requireAuth`) validating Bearer JWT header in [src/middlewares/auth.middleware.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/middlewares/auth.middleware.ts)
- [ ] T030 [US3] Implement `AuthController` handling registration and login request validation with Zod in [src/controllers/auth.controller.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/controllers/auth.controller.ts)
- [ ] T031 [P] [US3] Create Next.js route handler for `POST /api/auth/register` in [src/app/api/auth/register/route.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/app/api/auth/register/route.ts)
- [ ] T032 [P] [US3] Create Next.js route handler for `POST /api/auth/login` in [src/app/api/auth/login/route.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/app/api/auth/login/route.ts)

**Checkpoint Feature D**: Abrir PR `feature/004-auth-jwt` → `main`.

---

## ═══════════════════════════════════════
## FEATURE E: Catálogo de Jugadores (Endpoint Protegido)
### Rama: `feature/005-player-catalog` → PR a `main`
## ═══════════════════════════════════════

**Objetivo**: Endpoints protegidos de catálogo con filtros y paginación.

**Dependencia**: Feature D mergeada en `main` (`auth.middleware` y `PlayerRepository` deben existir).

**Test independiente**:
- `GET /api/players` con JWT válido y filtros → lista paginada correcta (200 OK).
- `GET /api/players/:id` con JWT válido → detalle completo del jugador.
- Ambos endpoints sin token → 401 Unauthorized.

#### Tests para Feature E
- [ ] T033 [P] [US4] Unit tests for `PlayerService` orchestrator (filtering, pagination defaults, not found handling) in [tests/unit/services/player.service.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/unit/services/player.service.spec.ts)
- [ ] T034 [P] [US4] Integration tests for `GET /api/players` and `GET /api/players/:id` endpoints in [tests/integration/players.routes.spec.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/tests/integration/players.routes.spec.ts)

#### Implementation para Feature E
- [ ] T035 [US4] Implement `PlayerService` orchestrator coordinating repository search and domain mappings in [src/services/player.service.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/services/player.service.ts)
- [ ] T036 [US4] Implement `PlayerController` handling query validation, pagination parameters, and response formatting in [src/controllers/player.controller.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/controllers/player.controller.ts)
- [ ] T037 [P] [US4] Create protected Next.js route handler for `GET /api/players` in [src/app/api/players/route.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/app/api/players/route.ts)
- [ ] T038 [P] [US4] Create protected Next.js route handler for `GET /api/players/[id]` in [src/app/api/players/[id]/route.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/app/api/players/[id]/route.ts)

**Checkpoint Feature E**: Abrir PR `feature/005-player-catalog` → `main`.

---

## ═══════════════════════════════════════
## FEATURE F: Documentación OpenAPI / Swagger
### Rama: `feature/006-swagger-docs` → PR a `main`
## ═══════════════════════════════════════

**Objetivo**: Swagger UI interactivo con todos los endpoints documentados.

**Dependencia**: Feature E mergeada en `main` (todos los endpoints estables).

**Test independiente**:
- `GET /api/docs` expone Swagger UI con esquema `BearerAuth` y todos los endpoints documentados.

#### Implementation para Feature F
- [ ] T039 [US1] Implement Swagger OpenAPI UI route handler exposing `contracts/openapi.yaml` in [src/app/api/docs/route.ts](file:///C:/Users/meluk/UNQ/desapp-grupo-c/src/app/api/docs/route.ts)
- [ ] T040 Update quickstart execution documentation in [specs/001-player-token-marketplace/quickstart.md](file:///C:/Users/meluk/UNQ/desapp-grupo-c/specs/001-player-token-marketplace/quickstart.md) and project [README.md](file:///C:/Users/meluk/UNQ/desapp-grupo-c/README.md)

**Checkpoint Feature F**: Abrir PR `feature/006-swagger-docs` → `main`.

---

## Dependencies & Execution Order

### Feature Dependencies (orden obligatorio)

```
Feature A (CI/CD + Health)
    └─► Feature B (Domain Model)
            └─► Feature C (Persistence + Drizzle)
                    └─► Feature D (Auth + JWT)
                                └─► Feature E (Player Catalog)
                                            └─► Feature F (Swagger Docs)
```

> [!IMPORTANT]
> **Cada feature DEBE estar mergeada en `main` antes de iniciar la siguiente.**
> El modelo de dominio (Feature B) DEBE existir antes de implementar autenticación (Feature D),
> ya que `AuthService` depende de la entidad `User` con sus invariantes de negocio.

### Rationale del orden

| Feature | Requisito previo | Motivo |
| :--- | :--- | :--- |
| A - CI/CD | Ninguno | Base de infraestructura y calidad |
| B - Domain | A mergeada | El modelo puro no depende de nada; los tests pasan en CI |
| C - Persistence | B mergeada | Los repositorios mapean entidades del modelo |
| D - Auth/JWT | C mergeada | `AuthService` usa `UserRepository` y la entidad `User` |
| E - Catalog | D mergeada | Los endpoints usan `auth.middleware` y `PlayerRepository` |
| F - Swagger | E mergeada | Documenta todos los endpoints ya estables |

### Parallel Execution Opportunities

- Tasks marcadas `[P]` dentro de cada feature pueden ejecutarse concurrentemente sin conflictos de archivos.
- Tests (`tests/unit/`) pueden escribirse antes o junto a la implementación (flujo TDD).
- Controladores y route handlers pueden desarrollarse en paralelo una vez que los servicios están definidos.
