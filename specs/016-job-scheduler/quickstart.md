# Quickstart: validar scheduler básico

Requiere Node >=22.12, PostgreSQL, migraciones aplicadas y las dependencias Python de `requirements-scraper.txt`. Usar una base de prueba separada para simular fallos.

```powershell
npm install
npm run db:migrate
npm run jobs:worker
```

En otra terminal iniciar `npm run dev` con el mismo `DATABASE_URL`. Ajustar `BATCH_SYNC_WEEKDAY`/`BATCH_SYNC_TIME` y `BATCH_RECALC_WEEKDAY`/`BATCH_RECALC_TIME` a los próximos horarios locales y reiniciar el worker. Sin enviar requests web, comprobar un turno por proceso:

```sql
SELECT process, origin, scheduled_local, scheduled_for, status,
       processed_count, succeeded_count, rejected_count, reason_code
FROM batch_turns ORDER BY scheduled_for DESC;
```

Sin lote activo, ejecutar `npm run db:sync-whoscored` y `POST /api/quotes/recalculate` con un superusuario y cuerpo `{}`. Ambos conservan sus flujos; el endpoint mantiene el header de correlación. Durante otro lote, CLI termina con `BATCH_CONFLICT` y la API responde `409`.

En pruebas de integración, simular proveedor caído dos veces, respuesta vacía y lote inválido. La sincronización debe fallar sin modificar jugadores; el recálculo debe poder usar los jugadores locales previamente guardados. Simular un error de escritura durante una transacción y comprobar que no deja efectos parciales. Detener un worker en `RUNNING` y reiniciarlo: el turno queda `FAILED`/`INTERRUPTED`, sin reproducción automática; un `PENDING` ya materializado sí se ejecuta.

Validar con `npm run lint`, `npm test`, `npm run test:integration` usando `TEST_DATABASE_URL` de una base de prueba, y `npm run build`.

## Verificación de esta implementación

El 2026-11-22 se verificó con Node 22.16.0: TypeScript sin errores, ESLint sin errores, 544 pruebas unitarias aprobadas y build de Next.js aprobado. Las pruebas de integración específicas de esta feature pasaron en una base PostgreSQL temporal aislada: 3 archivos y 13 pruebas. La suite de integración completa del proyecto y el escenario manual con el scraper real no se ejecutaron en esta revisión.
