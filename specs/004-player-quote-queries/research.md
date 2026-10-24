# Research: Consulta de Cotizaciones

## Contexto existente

- `player_quotes` ya persiste jugador, versión de estrategia, scores, valor,
  unidad, fecha de cálculo, contexto opcional y explicación JSONB.
- `valuation_strategy_versions` ya persiste `strategyCode` y `version`; la
  respuesta de consulta debe obtener ambos mediante una lectura relacionada,
  no inferirlos de la estrategia activa.
- `idx_player_quotes_player_date` ya indexa `(player_id, calculated_at)`, que
  cubre la selección por jugador y fecha para este MVP.
- Las rutas existentes siguen `route -> controller -> service -> repository`,
  usan `requireAuth`, schemas Zod y `toHttpResponse`.
- `QuoteRecalculationService` es la única pieza autorizada a calcular y
  persistir quotes; la nueva consulta no debe depender de ella ni de
  `ValuationEngine`.

## Decisiones técnicas

1. **Un único endpoint**: se agrega la variante de lectura debajo de la ruta
   existente `/api/players/{id}/quotes`. Sin `date` se listan todas las filas;
   con `date` se limita el resultado a una fila.
2. **Fecha**: el request acepta una fecha calendario real `YYYY-MM-DD`. El
   servicio construye el inicio del día siguiente en UTC y busca
   `calculated_at < nextDayStart`, ordenando de forma descendente y limitando a
   una fila. Esto implementa anterior o igual sin depender de la zona horaria
   del cliente.
3. **Jugador inexistente**: se valida existencia con `PlayerRepository` antes
   de consultar quotes para distinguir un jugador inexistente de un historial
   vacío.
4. **Historial vacío**: devuelve `200` con `items: []`. Una consulta con
   `date` sin candidato devuelve `404`.
5. **Orden**: la consulta histórica usa `calculatedAt DESC, id DESC`. No hay
   paginación ni orden configurable en el MVP.
6. **Respuesta**: se exponen columnas persistidas y una proyección directa de
   `QuoteExplanation` para los componentes individuales/colectivos. No se
   recalculan ni normalizan componentes durante la lectura.
7. **Autorización**: se reutiliza `requireAuth`; `INVESTOR` y `SUPERUSER`
   pueden leer. No se usa `requireSuperuser`.
8. **Persistencia**: no se agrega migración. El esquema y el índice existentes
   ya cubren la consulta; el desempate por `id` se resuelve en el ORDER BY.

## Decisiones descartadas por alcance

- Endpoint `/quote` separado.
- Paginación y filtros `from`/`to`.
- Nuevas tablas, snapshots o estados de ejecución.
- Recalcular o consultar proveedores externos en tiempo de lectura.
- Cambios en frontend; la feature entrega primero el contrato backend.

## Riesgo de compatibilidad detectado

El valor persistido por el esquema actual para la unidad es `CREDIT_PER_TOKEN`.
El contrato debe documentar exactamente ese valor, salvo que una especificación
posterior apruebe una migración o una transformación explícita.
