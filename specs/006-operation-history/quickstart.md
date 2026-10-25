# Quickstart: Historial de Operaciones Financieras

## Prerrequisitos

- PostgreSQL disponible y migraciones aplicadas.
- La feature `005-player-token-trading` integrada.
- Un usuario inversor autenticado con JWT.
- Al menos una operación completada persistida para ese usuario.

## Consultar la primera página

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/users/$USER_ID/transactions"
```

El endpoint devuelve hasta 50 operaciones ordenadas por `createdAt`
descendente y `id` descendente.

## Consultar una página acotada

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/users/$USER_ID/transactions?limit=10&offset=10"
```

`hasMore` indica si existe otra página. No se realiza un conteo total.

## Verificar aislamiento

```bash
curl -i -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/users/$OTHER_USER_ID/transactions"
```

La respuesta esperada es `403` y el repositorio no debe consultar operaciones
del usuario indicado.

## Verificación local

```bash
npm test -- --run
npm run lint
npm run build
```

Los tests de PostgreSQL se ejecutan con `RUN_DB_INTEGRATION_TESTS=true` y una
`DATABASE_URL` configurada.
