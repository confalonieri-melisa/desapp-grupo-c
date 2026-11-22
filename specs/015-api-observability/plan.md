# Implementation Plan: Observabilidad operativa del marketplace

**Branch**: `feature/015-api-observability` | **Date**: 2026-11-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-api-observability/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Agregar observabilidad operativa transversal a las rutas REST existentes: logs
estructurados, correlation IDs, métricas HTTP compatibles con Prometheus,
health checks y un resumen de métricas del dominio. La implementación será
volátil y directa, usando el runtime actual y los servicios existentes; no se
agregarán Redis, cache externa, tablas nuevas ni dependencias de monitoreo.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript sobre Node.js >= 22.12.0

**Primary Dependencies**: Next.js App Router, PostgreSQL/Drizzle existentes,
Vitest y APIs estándar de `Request`/`Response`. No se incorpora una dependencia
nueva para métricas o logging.

**Storage**: Métricas y último estado de recálculo en memoria durante la vida
del proceso. Los datos funcionales consultados por métricas avanzadas continúan
en PostgreSQL mediante los repositorios existentes. No hay migración.

**Testing**: Vitest unitario e integración con PostgreSQL cuando se verifique
readiness o consultas de métricas avanzadas.

**Target Platform**: Servidor Next.js local o desplegado en el entorno actual.

**Project Type**: Aplicación web con API REST y frontend existente.

**Performance Goals**: La observabilidad no debe modificar perceptiblemente el
resultado de las rutas; el registro y actualización de contadores deben ser
operaciones locales y no bloquear la respuesta por persistencia externa.

**Constraints**: Sin Redis, cache externa, tablas nuevas, login técnico,
Prometheus desplegado o logger externo. Los endpoints de observabilidad son
públicos y sólo devuelven datos técnicos o agregados.

**Scale/Scope**: Todas las rutas bajo `src/app/api`, cuatro endpoints de
observabilidad y los tests necesarios para cubrir el contrato. El alcance no
incluye optimizar todavía el ranking ni incorporar cache.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate | Estado | Evidencia |
|---|---|---|
| Specification first | PASS | La especificación y las aclaraciones existen en `spec.md`. |
| Capas | PASS | Las rutas delegan en controllers/services; la observabilidad es un módulo transversal pequeño. |
| Simplicidad/YAGNI | PASS | No se agregan Redis, tablas, proveedores externos ni abstracciones de cache. |
| Tests verificables | PASS | El plan incluye tests unitarios e integración aplicables. |
| API documentada | PASS | Se actualizará el contrato OpenAPI y la guía de validación. |
| GitFlow | PASS | Rama `feature/015-api-observability` creada desde `main`. |

## Project Structure

### Documentation (this feature)

```text
specs/015-api-observability/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/api/
│   ├── health/live/route.ts
│   ├── health/ready/route.ts
│   ├── metrics/route.ts
│   └── metrics/advanced/route.ts
└── backend/
    ├── observability/
    │   ├── request-audit.ts
    │   ├── http-metrics.ts
    │   └── request-observation.ts
    ├── controllers/
    │   └── health.controller.ts, metrics.controller.ts
    └── services/
        └── quote-recalculation.service.ts (actualiza el último resultado)

tests/
├── unit/observability/
└── integration/observability.routes.spec.ts
```

**Structure Decision**: Se reutiliza la aplicación existente. La lógica
transversal queda en `src/backend/observability` y las rutas sólo adaptan
requests/responses. Los controllers existentes siguen siendo el punto de
entrada para health y métricas; no se crean repositorios ni una capa de
persistencia para métricas.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| Ninguna | No se identifican violaciones. | El diseño usa las capas y dependencias ya presentes. |
