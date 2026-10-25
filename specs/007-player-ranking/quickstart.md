# Quickstart: Ranking de Jugadores

## Prerrequisitos

- PostgreSQL disponible y migraciones existentes aplicadas.
- Variables de entorno configuradas según `.env.example`.
- Al menos un usuario para obtener un JWT.
- Una versión de valuación activa y quotes persistidas para esa versión.

## Flujo manual

1. Iniciar la aplicación:

   ```bash
   npm run dev
   ```

2. Registrar o autenticar un usuario y guardar el token JWT.

3. Consultar el ranking completo:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/players/ranking"
   ```

4. Consultar filtros y paginación:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     "http://localhost:3000/api/players/ranking?league=PREMIER_LEAGUE&position=FORWARD&page=1&limit=10"
   ```

5. Confirmar que la respuesta informa `strategyCode` y `strategyVersion`, que
   los resultados están ordenados por `finalScore`, y que cada jugador aparece
   como máximo una vez.

## Verificación de errores

- Sin `Authorization`: `401`.
- `limit=101`, `page=0`, enum inválido o query param desconocido: `400`.
- Sin estrategia activa: `409`.
- Sin quotes de la versión activa: `200` con `players: []` y `totalPages: 0`.

## Tests

```bash
npm test -- tests/unit/schemas/player-ranking.schema.spec.ts tests/unit/services/player-ranking.service.spec.ts
npm test -- tests/integration/player-ranking.routes.spec.ts
RUN_DB_INTEGRATION_TESTS=true npm test -- tests/integration/player-ranking.repository.spec.ts
npm run lint
npm run build
```

La integración requiere PostgreSQL; no debe reemplazarse por mocks cuando se
verifica la consulta de deduplicación, orden y paginación.
