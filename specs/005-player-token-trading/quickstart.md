# Quickstart: Compra y Venta de Tokens

## Precondiciones

1. PostgreSQL activo y migraciones aplicadas.
2. Features de valuación y consulta de cotizaciones integradas.
3. Un usuario `SUPERUSER` configurado como pool.
4. Un jugador con cotización inicial `1.00` y 100 tokens en el pool.

## Flujo mínimo

1. Registrar o autenticar un inversor y conservar el JWT.
2. Consultar `GET /api/players/{playerId}/quotes` para verificar la cotización.
3. Comprar con `POST /api/orders/buy`:

```json
{ "playerId": "<player-id>", "quantity": 3 }
```

4. Verificar `201` con saldo y posición posteriores.
5. Consultar `GET /api/portfolio` sin enviar `userId`.
6. Vender con `POST /api/orders/sell` usando el mismo contrato.
7. Verificar que la suma de tokens del pool y los inversores siga siendo 100.
