# Quickstart: Consulta de Cotizaciones

## Prerrequisitos

- PostgreSQL disponible y migraciones de `valuation-strategies` aplicadas.
- Al menos un jugador y una o más filas en `player_quotes`.
- JWT válido emitido por `/api/auth/login`.

## Ver historial

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/players/$PLAYER_ID/quotes
```

La respuesta contiene todas las cotizaciones ordenadas por fecha de cálculo
descendente. El primer elemento es la cotización actual.

## Resolver una fecha

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/players/$PLAYER_ID/quotes?date=2026-10-20"
```

La respuesta contiene un único elemento: la última cotización calculada en esa
fecha o antes.

## Verificación local

```bash
npm test -- --run
npm run lint
npm run build
```

Los tests de PostgreSQL se ejecutan con `RUN_DB_INTEGRATION_TESTS=true` y una
base configurada en `DATABASE_URL`.
