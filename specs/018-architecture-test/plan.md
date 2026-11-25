# Implementation Plan: Test de arquitectura por capas

**Branch**: `018-architecture-test` | **Date**: 2026-11-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-architecture-test/spec.md`

## Summary

Agregar un test estático que revise las dependencias entre `controllers`, `services`, `repositories` y `models`. El test debe impedir que un controller importe directamente un repository o la base de datos, y que un model dependa de capas de aplicación o infraestructura. Antes de incorporarlo, se corregirán las dependencias directas existentes en `MetricsController` y `CompetitionContextController`, sin agregar excepciones al test.

## Technical Context

**Language/Version**: TypeScript, Node.js >= 22.12.0

**Primary Dependencies**: Vitest 5, Node.js `fs` y `path` para inspeccionar archivos fuente

**Storage**: N/A; el test no se conecta a PostgreSQL

**Testing**: Vitest, dentro de `tests/unit`

**Target Platform**: Node.js en desarrollo y CI

**Project Type**: Aplicación web Next.js con backend en TypeScript

**Performance Goals**: El test debe completar sin iniciar la aplicación ni servicios externos.

**Constraints**: No agregar dependencias nuevas ni modificar la configuración global de Vitest si el archivo puede ubicarse bajo `tests/unit`.

**Scale/Scope**: Solo archivos TypeScript de `src/backend/controllers`, `src/backend/services`, `src/backend/repositories` y `src/backend/models`.

## Constitution Check

Pass.

- Se respeta la arquitectura en capas definida por la Constitución (Principio III).
- Se agrega una prueba automatizada para una regla estructural verificable (Principio V).
- No se agregan abstracciones ni dependencias innecesarias (Principio VIII y YAGNI).
- La prueba no requiere base de datos ni servicios externos.

## Project Structure

### Documentation

```text
specs/018-architecture-test/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md                 # Se generará en la fase de tasks
```

### Source Code

```text
src/backend/
├── controllers/
├── services/
└── repositories/

tests/unit/architecture/
└── dependencies.spec.ts
```

**Structure Decision**: El test se ubica en `tests/unit/architecture/dependencies.spec.ts`, que ya está incluido por la configuración actual de Vitest. Verificará que los controllers no apunten a `repositories` ni a `db`, que los models no apunten a capas de aplicación o infraestructura, que los controllers usen services y que los services puedan usar repositories. `MetricsService` concentrará la consulta de métricas; el wiring de `CompetitionContextService` y sus dependencias se realizará fuera del controller, desde la composición de la ruta o un factory. Así el test no necesita excepciones.

## Complexity Tracking

No hay violaciones de la Constitución ni complejidad adicional que justificar.

## Post-Design Constitution Check

Pass. El diseño mantiene las capas existentes, usa Vitest sin nuevas dependencias, no requiere infraestructura externa y se limita a la regla solicitada.
