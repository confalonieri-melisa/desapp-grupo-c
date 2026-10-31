# MedioCampo ⚽👑

Marketplace de tokens de jugadores de fútbol, construido con Next.js,
TypeScript, Drizzle ORM y PostgreSQL.

## Requisitos

- Node.js 22.12 o superior
- npm
- PostgreSQL local o mediante Docker

## Configuración de variables de entorno

Crear `.env` en la raíz del proyecto a partir de `.env.example` y completar,
como mínimo, `DATABASE_URL` y `JWT_SECRET`.

## Instalación y base de datos

```bash
npm install
npm run db:up
npm run db:generate
npm run db:migrate
```

## Ingesta de jugadores desde WhoScored

La ingesta todavía no se ejecuta automáticamente al levantar la aplicación. El flujo
ejecuta el scraper Python con Playwright, normaliza los registros mediante el
adapter y hace upsert de los jugadores en PostgreSQL.

Instalar las dependencias del scraper:

```powershell
pip install -r requirements-scraper.txt
```

Los valores predeterminados de `WHOSCORED_PYTHON_PATH`,
`WHOSCORED_SCRIPT_PATH`, `WHOSCORED_URL`, `WHOSCORED_MAX_PAGES`,
`WHOSCORED_LIMIT` y `WHOSCORED_HEADLESS` están definidos en `.env.example`.

Ejecutar la sincronización:

```powershell
npm run db:sync-whoscored
```

Para una prueba pequeña:

```powershell
$env:WHOSCORED_MAX_PAGES="1"
$env:WHOSCORED_LIMIT="10"
npm run db:sync-whoscored
```

La guía técnica del scraper, sus límites y la configuración de pgAdmin está en
[`docs/whoscored-ingestion.md`](./docs/whoscored-ingestion.md).

## Ejecución

```bash
npm run dev
```

La aplicación queda disponible en
[http://localhost:3000](http://localhost:3000).

- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Contrato OpenAPI:
  [`specs/001-player-token-marketplace/contracts/openapi.yaml`](./specs/001-player-token-marketplace/contracts/openapi.yaml)

## Testing automático

```bash
npm run lint
npm test                 # Solo pruebas unitarias
npm run build
npm run test:coverage    # Cobertura unitaria para SonarCloud
```

Las pruebas de integración usan PostgreSQL y una base separada de desarrollo.
En PowerShell, por ejemplo:

```powershell
docker compose exec postgres createdb -U postgres desapp_integration
$env:TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/desapp_integration"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:migrate
npm run test:integration
```

El perfil E2E usa Playwright y otra base exclusiva. La configuración inicia la
aplicación en el puerto 3100. Todavía no hay casos E2E, así que localmente el
comando informa `No tests found`. Empezará a ejecutarlos cuando se agreguen
archivos `tests/e2e/*.spec.ts`.

```powershell
docker compose exec postgres createdb -U postgres desapp_e2e
$env:E2E_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/desapp_e2e"
$env:DATABASE_URL = $env:E2E_DATABASE_URL
npm run db:migrate
npx playwright install chromium
npm run test:e2e
```

En GitHub Actions, unitarios, integración y E2E tienen jobs separados. El job
E2E omite la preparación y ejecución hasta que exista el primer caso.

## Verificación manual con Postman

La colección se encuentra en
[`specs/001-player-token-marketplace/contracts/postman_collection.json`](./specs/001-player-token-marketplace/contracts/postman_collection.json).
