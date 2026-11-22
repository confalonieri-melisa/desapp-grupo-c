# Data Model: Observabilidad operativa del marketplace

La feature no agrega entidades persistentes ni migraciones. Define sólo
estructuras operativas en memoria y respuestas públicas.

## AuditEvent

Registro estructurado de una solicitud procesada.

| Campo         | Tipo conceptual             | Requerido | Regla                                            |
| ------------- | --------------------------- | --------: | ------------------------------------------------ |
| timestamp     | fecha/hora ISO-8601         |        Sí | Momento de finalización o error de la solicitud. |
| user          | identificador o `anonymous` |        Sí | Se obtiene del contexto autenticado si existe.   |
| method        | texto                       |        Sí | Método HTTP.                                     |
| operation     | texto                       |        Sí | Ruta normalizada, sin valores sensibles.         |
| parameters    | objeto sanitizado           |        Sí | Query, path y body sin secretos.                 |
| status        | número HTTP                 |        Sí | Status de la respuesta.                          |
| durationMs    | número                      |        Sí | Duración no negativa.                            |
| correlationId | texto                       |        Sí | Recibido o generado para la solicitud.           |

## HttpMetricsSnapshot

Agregados volátiles de tráfico.

- Requests totales por método, operación y status.
- Duración total y cantidad de observaciones por método y operación.
- Cantidad de errores `4xx` y `5xx`.

Las etiquetas no incluyen usuario, token, parámetros completos ni identificadores
de alta cardinalidad.

## HealthStatus

Respuesta de disponibilidad:

- `status`: `ok` o `unhealthy`.
- `check`: `live` o `ready`.
- `database`: estado de PostgreSQL sólo cuando corresponda al readiness check.

## AdvancedMetricsSummary

Resumen agregado del dominio:

- Fecha de generación.
- Cantidad de jugadores.
- Estrategia activa y versión, si existe.

Cuando no existe una estrategia activa, el campo se informa como `null`, sin
inventar información.

## Lifecycle

Los agregados operativos se inicializan al iniciar la aplicación y se pierden
al reiniciarla. No modifican ni reemplazan entidades persistentes del dominio.
