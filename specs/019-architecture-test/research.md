# Research: Test de arquitectura por capas

## Decisión: test estático con Vitest

Se usará un test de Vitest que lea los archivos TypeScript de `src/backend/controllers` y revise sus imports.

### Motivo

- Vitest ya es el framework de pruebas del proyecto.
- `tests/unit/**/*.spec.ts` ya está incluido en la configuración actual.
- No hace falta iniciar la aplicación, conectarse a PostgreSQL ni incorporar una dependencia nueva.
- El test puede mostrar el archivo y la dependencia que incumplen la regla.

### Alternativas consideradas

- **Agregar una herramienta externa de análisis de dependencias**: se descarta porque agrega complejidad para validar solo una regla.
- **Probar la arquitectura mediante tests de integración**: se descarta porque la regla se puede verificar leyendo imports, sin ejecutar servicios ni acceder a la base de datos.

## Hallazgo del estado actual

La revisión del código encontró dos controllers que deben corregirse para que la regla sea válida:

- `src/backend/controllers/metrics.controller.ts` importa `PlayerRepository` y `ValuationRepository` directamente.
- `src/backend/controllers/competition-context.controller.ts` importa `CompetitionContextRepository` directamente para construir el servicio.

Estos casos no son excepciones válidas a la regla:

- `MetricsController` contiene lógica de consulta que corresponde a un service. Se moverá a `MetricsService`, que podrá usar los repositories.
- `CompetitionContextController` solo necesita delegar en `CompetitionContextService`. La creación del service con `FootballDataAdapter` y `CompetitionContextRepository` se moverá a la composición de la ruta o a un factory fuera de `controllers`.

Los demás controllers revisados usan servicios para la operación principal.
