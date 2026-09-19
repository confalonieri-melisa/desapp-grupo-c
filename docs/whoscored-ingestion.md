# Ingesta de jugadores desde WhoScored

## Objetivo

La aplicación obtiene información de jugadores desde la página de estadísticas de WhoScored y la persiste en PostgreSQL. La aplicación Node no realiza scraping HTML directamente: ejecuta un proceso Python con Playwright y consume el archivo JSON generado por el proceso.

```text
WhoScored → Playwright/Python → JSON → Node → Adapter → Service → Repository → PostgreSQL
```

## Componentes

### `scripts/whoscored_scraper.py`

Es el scraper browser-based activo. Abre Chrome, navega a la página de estadísticas, selecciona las pestañas `Summary` y `Defensive`, recorre sus páginas y une las métricas por el ID externo del jugador.

Extrae las métricas actualmente necesarias para el catálogo:

- apariciones, minutos, goles y asistencias;
- tiros por partido, tarjetas amarillas y rojas;
- rating;
- tackles, intercepciones y faltas por partido.

También convierte las posiciones y las ligas de WhoScored al enum interno de la aplicación.

El proceso produce un array JSON de filas con `externalId`, `player`, `team`, `league`, `position` y las métricas. No conoce la base de datos ni las clases de dominio. El runner Node valida esas filas antes de entregar registros al adapter.

### `src/adapters/whoscored.scraper.ts`

Ejecuta el proceso Python mediante `child_process`, lee el archivo JSON temporal generado con `--output` y valida sus filas usando `whoScoredPayloadSchema`.

Este límite permite testear Node con un `commandRunner` mockeado sin abrir Chrome ni acceder a internet.

### `src/schemas/whoscored.schema.ts`

Valida el contrato producido por la fuente externa. Rechaza jugadores incompletos y estadísticas inválidas antes de que lleguen al dominio.

### `src/adapters/whoscored.adapter.ts`

Adapta el contrato externo al tipo `ScrapedPlayer` utilizado por la aplicación. Normaliza el ID, los textos y conserva solamente las métricas del contrato interno.

### `src/services/player.service.ts`

Orquesta la sincronización:

1. solicita jugadores al `PlayerDataSource`;
2. crea y valida las entidades `Player`;
3. persiste los jugadores mediante el repository.

### `src/repositories/player.repository.ts`

Realiza los `upsert` contra PostgreSQL. Los jugadores nuevos se insertan y los ya existentes se actualizan usando su identificador externo.

## Ejecución

Instalar la dependencia Python:

```powershell
pip install -r requirements-scraper.txt
```

Configurar, si hace falta:

```env
WHOSCORED_PYTHON_PATH=python
WHOSCORED_SCRIPT_PATH=scripts/whoscored_scraper.py
WHOSCORED_URL=https://www.whoscored.com/Statistics
WHOSCORED_MAX_PAGES=140
WHOSCORED_LIMIT=10
WHOSCORED_HEADLESS=false
```

Aplicar las migraciones y ejecutar la ingesta:

```powershell
npm run db:up
npm run db:migrate
npm run db:sync-whoscored
```

Para una prueba pequeña:

```powershell
$env:WHOSCORED_MAX_PAGES="1"
$env:WHOSCORED_LIMIT="10"
npm run db:sync-whoscored
```

El modo visible (`WHOSCORED_HEADLESS=false`) es el predeterminado porque suele ser menos propenso a bloqueos que el modo headless.

## Alcance y límites

- La ingesta no se ejecuta automáticamente al levantar la aplicación; se ejecuta mediante el script y más adelante podrá ser invocada por un scheduler.
- Si WhoScored bloquea la navegación, la ejecución falla y no se persiste una ingesta incompleta.
- La base conserva la última ingesta exitosa.
- Esta implementación obtiene estadísticas agregadas de la página de estadísticas. Todavía no obtiene eventos detallados de cada partido.

## Relación con el catálogo

Una vez ejecutada exitosamente la ingesta, la información queda persistida en la tabla de jugadores. Los endpoints de catálogo podrán consultar esa tabla a través de `PlayerService` y `PlayerRepository`, sin volver a acceder a WhoScored durante cada request.

La ingesta y los endpoints son responsabilidades separadas:

```text
Ingesta periódica → actualiza PostgreSQL
Endpoint catálogo → consulta PostgreSQL
```
