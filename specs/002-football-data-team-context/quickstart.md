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

## Asociación automática de equipos

Durante una ejecución válida, el servicio toma automáticamente los equipos
existentes en `players.team`, resuelve las diferencias de nombres conocidas
entre WhoScored y football-data.org por competición y persiste los vínculos en
`team_source_links`. No es necesario crear un JSON ni cargar un equipo por
vez. La operación es idempotente: repetir la sincronización actualiza los
vínculos sin duplicarlos.

El script `db:load-team-links` queda disponible únicamente para corregir una
excepción de proveedor que no pueda resolverse de forma determinista; no forma
parte del flujo normal.
