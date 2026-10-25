# Research: Historial de Operaciones Financieras

## Hallazgos del relevamiento

- `market_operations` ya existe en `src/backend/db/schema.ts` y contiene los
  snapshots históricos necesarios: tipo, inversor, jugador, cotización usada,
  cantidad, total, unidad, correlation ID y fecha.
- El índice existente `idx_market_operations_investor_date` cubre el filtro por
  inversor y el orden temporal principal.
- `MarketRepository` ya encapsula la persistencia de operaciones de trading;
  agregar la lectura allí evita crear un repositorio duplicado para la misma
  tabla.
- Las routes existentes usan App Router, `requireAuth`, parámetros dinámicos
  como `params: Promise<{ id: string }>` y `toHttpResponse`.
- `/api/docs` carga el contrato global desde
  `specs/001-player-token-marketplace/contracts/openapi.yaml`; ese archivo debe
  actualizarse además del contrato específico de la feature.

## Decisiones técnicas

1. **Ruta canónica**: `GET /api/users/{id}/transactions`, alineada con
   `docs/project-context.md`.
2. **Identidad**: `id` debe coincidir con `auth.sub`; la comparación ocurre
   antes de consultar el repositorio.
3. **Fuente de verdad**: solo `market_operations`. No se consulta portfolio,
   holdings, auditoría ni cotización actual.
4. **Paginación**: `limit` default 50, máximo 100, y `offset` default 0. El
   repositorio solicita una fila adicional para calcular `hasMore` sin hacer un
   `COUNT(*)`.
5. **Respuesta**: solo columnas persistidas de la operación; no se agregan
   joins con jugadores o cotizaciones.
6. **Números**: los campos `numeric` se mapean a números JSON, manteniendo la
   precisión en PostgreSQL y sin recalcular importes.
7. **Nulos**: `correlationId` siempre forma parte del DTO y se serializa como
   `null` cuando la columna es nula.
8. **Roles**: el endpoint se consume en el contexto de usuarios inversores; no
   se agrega una rama especial para `SUPERUSER` ni un permiso administrativo.

## Decisiones descartadas

- Reconstruir el historial agrupando compras/ventas desde `token_holdings`.
- Usar `financial_audit_records` como fuente del listado.
- Crear una tabla o entidad `transaction_history`.
- Un endpoint sin `:id` distinto al contrato del contexto del proyecto.
- Joins para enriquecer el jugador en esta feature.
- Cursor pagination, filtros, exportaciones o conteo total.
- Cambios de esquema o migraciones.
