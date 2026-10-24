# Research: Contexto Colectivo de Equipos

## Findings

1. El proyecto ya usa adapters para fuentes externas y `PlayerSyncService` para
   persistir jugadores. La integración nueva debe ser paralela y no extender
   `PlayerDataSource`, porque ese contrato representa estadísticas individuales.
2. `players` identifica registros mediante `(source, external_id)` y conserva
   estadísticas en JSONB. El contexto colectivo requiere tablas separadas para
   evitar mezclar responsabilidades y permitir snapshots históricos.
3. La autenticación JWT existente incluye `role`, pero `requireAuth` solo valida
   identidad. La sincronización necesita un guard específico para
   `SUPERUSER`.
4. La documentación OpenAPI está almacenada en
   `specs/001-player-token-marketplace/contracts/openapi.yaml` y es servida por
   `/api/docs`; el contrato nuevo debe actualizar esa fuente.
5. La configuración se valida centralmente en `src/backend/config/env.ts`.
   La API key, base URL, timeout y retry deben agregarse allí, sin tests
   triviales de configuración.
6. Los tests existentes usan Vitest, mocks de dependencias para unit tests y
   PostgreSQL real opcional para integración. El adapter debe permitir inyectar
   el cliente HTTP para mantener las pruebas offline.

## Decisions

- Mantener `PlayerDataSource` exclusivamente para WhoScored.
- Usar solo el endpoint `standings` de football-data.org.
- Persistir snapshots, standings, ejecuciones y publicación actual en tablas
  dedicadas.
- Publicar solo una ejecución completa de las cinco ligas.
- Modelar la consulta futura como repositorio interno; no crear un endpoint
  público de lectura en esta feature.
- No agregar dependencias npm.

## Open Risks

- El contrato exacto de la respuesta puede variar por temporada o plan del
  proveedor; se mitigará con schema estricto y fixtures representativos.
- La relación de aliases necesita una política posterior para cambios de nombre
  de clubes.
- La retención/limpieza de snapshots aún no está definida y no debe resolverse
  silenciosamente en la implementación.
