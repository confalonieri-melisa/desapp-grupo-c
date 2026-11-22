# Quickstart: Observabilidad operativa del marketplace

## Prerrequisitos

- Node.js 22.12 o superior.
- Dependencias instaladas con `npm install`.
- PostgreSQL disponible para validar readiness y métricas avanzadas.
- Variables de entorno existentes del proyecto configuradas.

## Ejecutar la aplicación

```powershell
npm run dev
```

## Validar health checks

```powershell
Invoke-WebRequest http://localhost:3000/api/health/live
Invoke-WebRequest http://localhost:3000/api/health/ready
```

Esperado: liveness responde `200`; readiness responde `200` con PostgreSQL
disponible y `503` si la dependencia no está disponible.

## Validar métricas HTTP

Ejecutar una o más requests de la API y luego:

```powershell
(Invoke-WebRequest http://localhost:3000/api/metrics).Content
```

Esperado: texto compatible con Prometheus que contiene requests, duración y
errores agrupados por método, operación y status.

## Validar métricas avanzadas

```powershell
(Invoke-WebRequest http://localhost:3000/api/metrics/advanced).Content
```

Esperado: JSON con cantidad de jugadores, estrategia activa y último resultado
de recálculo disponible. Si algún dato no existe, se informa como ausencia o
cero según el contrato.

## Validar auditoría y correlation ID

Ejecutar una request con un header `x-correlation-id`, revisar la salida JSON
del proceso y comprobar que el mismo valor aparece en la respuesta y en el
evento de auditoría. Repetir con una operación que devuelva `4xx` para verificar
que conserva status y duración.

## Tests

```powershell
npm test
npm run test:integration
```

Los tests de observabilidad deben cubrir sanitización de secretos, requests
autenticadas y anónimas, errores, métricas, health checks y datos ausentes del
resumen avanzado.
