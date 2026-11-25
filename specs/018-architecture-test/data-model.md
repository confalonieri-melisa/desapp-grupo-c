# Data Model: Test de arquitectura por capas

Esta feature no agrega entidades, tablas ni cambios de datos.

## Elementos revisados

| Elemento | Ubicación | Regla |
| --- | --- | --- |
| Controller | `src/backend/controllers` | Puede importar servicios; no puede importar repositories ni `db`. |
| Service | `src/backend/services` | Puede importar repositories. |
| Repository | `src/backend/repositories` | Encapsula el acceso a persistencia. |
| Model | `src/backend/models` | No puede importar controllers, services, repositories, `db` ni adapters. |

## Ajustes necesarios

- `MetricsService` concentrará la consulta de métricas que hoy está en `MetricsController`.
- `CompetitionContextService` seguirá recibiendo su adapter y repository mediante composición externa; el controller solo recibirá el service.

El test trabaja sobre los imports de estos archivos; no crea ni modifica datos.
