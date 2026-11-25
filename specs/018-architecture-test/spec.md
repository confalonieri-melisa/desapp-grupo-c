# Feature Specification: Test de arquitectura por capas

**Feature Branch**: `018-architecture-test`

**Created**: 2026-11-25

**Status**: Draft

**Input**: Agregar una prueba simple que controle que se respete la separación básica entre las capas del backend.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Controlar la separación entre capas (Priority: P1)

Agregar una prueba automatizada que controle las dependencias básicas entre controladores, servicios y repositorios.

**Why this priority**: Es la regla mínima necesaria para comprobar que se mantiene la arquitectura en capas.

**Independent Test**: La prueba se ejecuta junto con la suite existente. Debe pasar con el código actual y fallar si se rompe alguna de las tres reglas de dependencias definidas.

**Acceptance Scenarios**:

1. **Given** los controladores usan servicios y los servicios usan repositorios, **When** se ejecuta la prueba, **Then** la prueba pasa.
2. **Given** un controlador accede directamente a un repositorio o a la base de datos, **When** se ejecuta la prueba, **Then** la prueba falla e indica la dependencia inválida.

## Edge Cases

- Los archivos que no pertenezcan a la capa de controladores no deben evaluarse como controladores.
- La prueba no debe necesitar una base de datos, servicios externos ni datos de prueba.
- Las dependencias permitidas entre controladores y servicios, y entre servicios y repositorios, no deben marcarse como inválidas.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST verificar que los controladores puedan depender de servicios.
- **FR-002**: El sistema MUST verificar que los servicios puedan depender de repositorios.
- **FR-003**: El sistema MUST verificar que los controladores no dependan directamente de repositorios ni de la base de datos.
- **FR-004**: La prueba MUST fallar con un mensaje que permita identificar la dependencia arquitectónica inválida.
- **FR-005**: La prueba MUST ejecutarse como parte de la suite existente sin requerir infraestructura externa.
- **FR-006**: La prueba MUST limitarse a estas reglas, sin agregar validaciones innecesarias.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: La suite automatizada detecta el 100% de las dependencias prohibidas definidas en esta especificación.
- **SC-002**: La prueba pasa con el estado actual del proyecto.
- **SC-003**: La prueba puede ejecutarse sin levantar la aplicación, conectarse a la base de datos ni acceder a servicios externos.
- **SC-004**: Una modificación que agregue una dependencia prohibida provoca un fallo reproducible de la suite.

## Assumptions

- La arquitectura objetivo mantiene controladores, servicios y persistencia como responsabilidades separadas.
- El alcance mínimo se limita a detectar dependencias de controladores hacia persistencia o base de datos.
- Las demás reglas arquitectónicas podrán agregarse en otra feature si se vuelven necesarias.
- La suite de pruebas existente es el mecanismo oficial para ejecutar esta verificación.
