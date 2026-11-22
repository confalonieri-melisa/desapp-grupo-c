# Flujo de observabilidad

Este documento explica cómo funciona la observabilidad incorporada al
marketplace, qué responsabilidad tiene cada componente y qué información
devuelve cada endpoint.

El objetivo es poder seguir una request, registrar su resultado y consultar
indicadores operativos sin mezclar esta preocupación con la lógica funcional
del marketplace.

## Por qué no se usa Spring Boot

El proyecto no está construido con Spring Boot. Está implementado con
Next.js, sus route handlers y servicios TypeScript.

Por ese motivo no existen directamente:

- interceptors de Spring;
- Spring Actuator;
- Micrometer;
- endpoints de Actuator ya preparados;
- configuración automática de Prometheus.

La solución equivalente en este proyecto se realiza en el límite de cada
endpoint HTTP. Cada route handler delega la ejecución en `RequestObservation`,
que centraliza la observación común de las requests.

Esto permite cumplir la intención de la consigna —auditoría, métricas,
health checks y endpoints de monitoreo— utilizando los mecanismos propios del
proyecto, sin introducir Spring Boot ni una dependencia externa de métricas.

## Flujo de una request

El flujo general es:

```text
Cliente
  |
  v
Route Handler de Next.js
  |
  v
RequestObservation.observe(...)
  |
  +--> obtiene o genera correlation ID
  +--> obtiene parámetros y usuario
  +--> ejecuta la acción del endpoint
  +--> agrega el correlation ID a la respuesta
  +--> informa auditoría
  +--> actualiza métricas HTTP
  |
  v
Respuesta HTTP
```

Por ejemplo, una route queda conceptualmente así:

```ts
return requestObservation.observe(request, "/api/players", async () => {
  const players = await controller.getPlayers();
  return Response.json(players);
});
```

La route sigue siendo responsable de adaptar HTTP. `RequestObservation` no
contiene reglas de jugadores, compras, valuaciones ni portfolios.

## Responsabilidad de cada componente

### `RequestObservation`

Está en `src/backend/observability/request-observation.ts`.

Es el coordinador de la observación de una request. No es un servicio de
negocio ni una entidad de dominio.

Sus responsabilidades son:

- recibir la request y la acción que debe ejecutar;
- identificar la operación observada;
- obtener el correlation ID enviado por el cliente o generar uno;
- medir el tiempo total de la operación;
- obtener parámetros de query y body;
- identificar al usuario autenticado o utilizar `anonymous`;
- devolver la respuesta con el header `x-correlation-id`;
- informar el resultado a `RequestAudit` y `HttpMetrics`.

La clase se divide internamente en acciones pequeñas para que el flujo
principal sea legible:

- `observe`: coordina todo el ciclo;
- `beginObservation`: inicia la observación y obtiene sus datos iniciales;
- `completeObservation`: calcula la duración y comunica el resultado;
- `requestParameters`: obtiene los parámetros de la request;
- `authenticatedUser`: obtiene el usuario sin exponer el token;
- `withCorrelationId`: agrega el correlation ID a la respuesta.

### `RequestAudit`

Está en `src/backend/observability/request-audit.ts`.

Registra un evento técnico de una request HTTP. Actualmente lo escribe como
JSON estructurado en el log del proceso.

El evento contiene:

```json
{
  "timestamp": "2026-11-22T12:00:00.000Z",
  "user": "user-id",
  "method": "GET",
  "operation": "/api/players",
  "parameters": {
    "path": "/api/players",
    "query": {}
  },
  "status": 200,
  "durationMs": 12.4,
  "correlationId": "..."
}
```

`RequestAudit` no es auditoría de dominio. No registra eventos como una
compra, una venta o una actualización de estrategia. Registra la ejecución
técnica de una request HTTP.

La auditoría de dominio, si se necesitara en el futuro, debería ser una
preocupación separada y vivir cerca de la operación funcional correspondiente.

Antes de emitir el evento se redacciona información sensible, como passwords,
tokens, cookies, authorization headers y api keys.

### `HttpMetrics`

Está en `src/backend/observability/http-metrics.ts`.

Se ocupa únicamente de las métricas HTTP:

- cantidad de requests por método, operación y status;
- duración acumulada y cantidad de observaciones por método y operación;
- cantidad de respuestas agrupadas por rango de error (`4xx`, `5xx`);
- generación del texto compatible con Prometheus.

No conoce jugadores, valuaciones ni recalculaciones.

Cuando se consulta `/api/metrics`, `MetricsController` solicita a
`HttpMetrics` la representación Prometheus.

### `MetricsController`

Está en `src/backend/controllers/metrics.controller.ts`.

Coordina las consultas de métricas que llegan por HTTP:

- obtiene la salida Prometheus de `HttpMetrics`;
- consulta los repositorios existentes para obtener cantidad de jugadores y
  estrategia activa;

No registra métricas por sí mismo ni accede directamente a la base de datos.

## Respuestas de los endpoints

### `GET /api/health`

Es el endpoint de compatibilidad general.

Respuesta exitosa:

```http
200 OK
```

```json
{
  "status": "ok"
}
```

### `GET /api/health/live`

Indica que el proceso de la aplicación está activo. No consulta la base de
datos.

Respuesta:

```http
200 OK
```

```json
{
  "status": "ok",
  "check": "live"
}
```

### `GET /api/health/ready`

Indica si la aplicación está lista para atender requests que dependen de la
base de datos. El repository realiza una consulta mínima `select 1`.

Cuando la base está disponible:

```http
200 OK
```

```json
{
  "status": "ok",
  "check": "ready",
  "database": "ok"
}
```

Cuando la base no está disponible:

```http
503 Service Unavailable
```

```json
{
  "status": "unhealthy",
  "check": "ready",
  "database": "unhealthy"
}
```

La diferencia entre ambos checks permite distinguir proceso activo de
aplicación preparada. La base caída no vuelve necesariamente unhealthy al
liveness.

### `GET /api/metrics`

Devuelve texto en formato de exposición compatible con Prometheus.

Headers principales:

```http
200 OK
Content-Type: text/plain; version=0.0.4; charset=utf-8
```

Ejemplo de respuesta:

```text
# HELP http_requests_total Total HTTP requests.
# TYPE http_requests_total counter
http_requests_total{method="GET",operation="/api/players",status="200"} 3
# HELP http_request_duration_ms_sum Total observed request duration in milliseconds.
# TYPE http_request_duration_ms_sum counter
http_request_duration_ms_sum{method="GET",operation="/api/players"} 28.4
# HELP http_errors_total Total HTTP errors by status class.
# TYPE http_errors_total counter
http_errors_total{status_class="4xx"} 1
```

El endpoint no se contabiliza a sí mismo para evitar que su consulta altere la
métrica que está mostrando.

### `GET /api/metrics/advanced`

Devuelve un resumen JSON agregado del estado operativo del marketplace.

Ejemplo con una estrategia activa:

```http
200 OK
```

```json
{
  "generatedAt": "2026-11-22T12:00:00.000Z",
  "players": 120,
  "strategy": {
    "code": "INDIVIDUAL_PERFORMANCE",
    "version": "1"
  }
}
```

Si no existe una estrategia activa, `strategy` es `null`.

Este endpoint no devuelve jugadores individuales, portfolios, saldos,
credenciales ni datos personales.

## Estado actual y evolución hacia Redis

El contrato de los endpoints no depende de la forma en que se almacenan las
métricas.

En el MVP, los componentes de métricas mantienen temporalmente sus datos
durante la ejecución actual del proceso. Esto permite cumplir la funcionalidad
sin agregar Redis antes de que forme parte del contexto del proyecto.

Esta es una característica del estado actual, no una decisión definitiva de
arquitectura. Cuando se incorpore Redis, se podrá reemplazar el almacenamiento
interno de `HttpMetrics` sin modificar:

- las rutas HTTP;
- `RequestObservation`;
- `RequestAudit`;
- la respuesta de `/api/metrics`;
- la respuesta de `/api/metrics/advanced`.

Redis permitiría conservar métricas entre reinicios y compartirlas entre
varias instancias de la aplicación. También permitiría agregar métricas de
cache, como hits, misses e invalidaciones.

## Por qué esta separación es suficiente para el MVP

La separación actual evita que un único objeto haga todo:

```text
RequestObservation
  ├── RequestAudit       -> registra requests HTTP
  └── HttpMetrics        -> acumula y expone métricas HTTP

MetricsController
  ├── HttpMetrics
  ├── PlayerRepository
  └── ValuationRepository
```

No se agregan interfaces, adaptadores ni una infraestructura de cache antes
de necesitarla. La lógica funcional permanece en sus servicios y repositorios,
mientras que la observabilidad sólo coordina información técnica y agregada.
