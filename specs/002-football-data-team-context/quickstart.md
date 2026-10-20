# Quickstart de validación

## Prerequisites

1. Node.js `>=22.12.0`.
2. Dependencias instaladas con `npm ci`.
3. PostgreSQL disponible para integración.
4. `FOOTBALL_DATA_API_TOKEN` solo para una ejecución manual real; los tests no
   lo necesitan.

## Local database

```powershell
npm run db:up
npm run db:migrate
```

## Offline validation

Los tests deben usar fixtures locales para `PL`, `BL1`, `PD`, `SA` y `FL1`.
Ningún comando de test debe acceder a internet:

```powershell
npm test -- --run
npm run lint
npm run build
```

Para integración con PostgreSQL:

```powershell
$env:RUN_DB_INTEGRATION_TESTS="true"
npm test -- --run tests/integration/competition-context.repository.spec.ts
```

## Manual synchronization

Con un JWT de superusuario:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/competition-context/updates" `
  -Headers @{ Authorization = "Bearer <superuser-jwt>" } `
  -ContentType "application/json" `
  -Body '{"season":2026}'
```

La operación debe ser la única que contacte football-data.org. Ante un error,
la ejecución no se publica y la lectura interna continúa usando la última
publicación válida.
