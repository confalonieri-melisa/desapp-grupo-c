# Quickstart: Ofertas P2P a Precio Fijo

## Prerrequisitos

- Ejecutar la aplicación desde `main` o la rama de la feature con PostgreSQL configurado.
- Tener dos usuarios inversores autenticados: vendedor y comprador.
- Tener un jugador existente y una tenencia suficiente del vendedor.
- Aplicar las migraciones de la base de datos.

## Flujo principal

1. Autenticar al vendedor y guardar su token.
2. Crear una oferta con `playerId`, `quantity` y `unitPrice` según [contracts/p2p.yaml](contracts/p2p.yaml).
3. Consultar las ofertas abiertas y verificar que la oferta aparece con estado `OPEN`.
4. Autenticar al comprador y consultar las ofertas del jugador.
5. Aceptar la oferta completa enviando un `Idempotency-Key` nuevo.
6. Verificar que la respuesta muestra únicamente el saldo y la tenencia posteriores del comprador.
7. Consultar el portfolio de ambos usuarios y verificar que los tokens pasaron del vendedor al comprador y los créditos recorrieron el camino inverso.
8. Consultar el historial de ambos usuarios: debe aparecer el mismo `operationId`, como `BUY` para el comprador y `SELL` para el vendedor.

## Escenarios negativos

- Intentar aceptar sin saldo suficiente.
- Intentar aceptar después de que el vendedor haya vendido los tokens.
- Intentar aceptar la misma oferta con dos compradores.
- Intentar aceptar la propia oferta.
- Reutilizar una clave de idempotencia con otra oferta.
- Cancelar una oferta de otro vendedor.

En cada caso verificar que no hay cambios parciales en saldo, tenencias, oferta, operación ni auditoría.

## Reintento idempotente

Repetir exactamente la aceptación exitosa con el mismo `Idempotency-Key`. Debe devolverse el mismo recibo y el portfolio debe mostrar una sola transferencia.

## Regresión central

Ejecutar los escenarios existentes de compra y venta contra el pool central, portfolio e historial. Deben conservar sus respuestas y reglas actuales.

## Verificación automatizada esperada

```text
npm test -- tests/unit/models/p2p-offer.spec.ts tests/unit/models/p2p-trade.spec.ts
npm test -- tests/integration/p2p-offers.repository.spec.ts tests/integration/p2p-offers.routes.spec.ts
npm test -- tests/e2e/p2p-trading-journey.spec.ts
```
