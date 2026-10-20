# Quickstart de validaciÃ³n

## Prerequisites

1. Node.js `>=22.12.0`.
2. Dependencias instaladas con `npm ci`.
3. PostgreSQL disponible para integraciÃ³n.
4. `FOOTBALL_DATA_TOKEN` solo para una ejecuciÃ³n manual real; los tests no
   lo necesitan.

## Local database

```powershell
npm run db:up
npm run db:migrate
```

## Offline validation

Los tests deben usar fixtures locales para `PL`, `BL1`, `PD`, `SA` y `FL1`.
NingÃºn comando de test debe acceder a internet:

```powershell
npm test -- --run
npm run lint
npm run build
```

Para integraciÃ³n con PostgreSQL:

```powershell
$env:RUN_DB_INTEGRATION_TESTS="true"
npm test -- --run tests/integration/competition-context.repository.spec.ts
```

## Manual synchronization

La sincronización operativa puede ejecutarse como script, igual que la de
WhoScored:

```powershell
npm run db:sync-football-data -- --season 2026
```

El script usa `FOOTBALL_DATA_TOKEN` desde `.env`, consulta las cinco
competiciones y persiste los datos en la base local. No requiere enviar la
credencial por HTTP.

También existe el endpoint protegido para una ejecución desde la aplicación.
Con un JWT de superusuario:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/competition-context/updates" `
  -Headers @{ Authorization = "Bearer <superuser-jwt>" } `
  -ContentType "application/json" `
  -Body '{"season":2026}'
```

La operaciÃ³n debe ser la Ãºnica que contacte football-data.org. Ante un error,
la ejecuciÃ³n no se publica y la lectura interna continÃºa usando la Ãºltima
publicaciÃ³n vÃ¡lida.

## Carga de relaciones confirmadas

Las relaciones entre equipos se cargan desde un archivo JSON preparado
manualmente con identificadores ya verificados:

```powershell
npm run db:load-team-links -- .\team-source-links.json
```

El archivo debe contener una lista de objetos con `league`, `season`, los
identificadores y nombres de WhoScored y football-data.org. La operación es
idempotente: repetirla actualiza la relación existente sin duplicarla.
