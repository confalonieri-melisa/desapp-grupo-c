# Quickstart: validar la caché del ranking

Guía para ejecutar después de implementar la feature. El contrato observable está en [contracts/ranking-cache.md](contracts/ranking-cache.md) y el modelo en [data-model.md](data-model.md).

## Prerrequisitos

- Node.js >=22.12 y dependencias del proyecto instaladas.
- PostgreSQL disponible, migraciones actuales aplicadas y variables configuradas según `.env.example`.
- Una base de integración aislada cuyo nombre incluya `test` o `integration` para `TEST_DATABASE_URL`.
- Usuario autenticado, estrategia activa y al menos 1000 jugadores con cotizaciones de esa versión para la medición de SC-001. Para las demás pruebas alcanza un conjunto menor con varias páginas y filtros.
- Aplicación web y, para probar el recálculo programado, `npm run jobs:worker` en terminales separadas que compartan la misma base de datos.

## Comprobaciones automatizadas

Desde la raíz del repositorio:

```powershell
npm test -- tests/unit/services/player-ranking-cache.spec.ts tests/unit/services/player-ranking.service.spec.ts tests/unit/repositories/player-ranking.repository.spec.ts tests/unit/controllers/player-ranking.controller.spec.ts
```

La suite debe cubrir: acierto y falta, clave por criterios y versión, respuesta vacía, límites exactos de tiempo, 101 entradas con descarte de la primera generada aun después de un acierto, errores sin almacenamiento y carrera entre lectura y publicación.

Con `TEST_DATABASE_URL` apuntando a la base aislada:

```powershell
npm run test:integration -- tests/integration/player-ranking.routes.spec.ts tests/integration/player-ranking.repository.spec.ts
```

La integración debe verificar autenticación y códigos actuales, filas y total coherentes, recálculo `COMPLETED` y `PARTIAL` visible en la primera lectura posterior, y publicación del worker en otro proceso sin dependencia de memoria compartida. Ejecutar también `npm run build` con la configuración local válida.

## Comprobación manual de la API

1. Iniciar `npm run dev` y autenticar un usuario para obtener un JWT. Usar un cliente HTTP con `Authorization: Bearer <JWT>`.
2. Consultar dos veces `GET http://localhost:3000/api/players/ranking?league=PREMIER_LEAGUE&page=1&limit=20` antes de 60 segundos. Verificar igualdad de `strategyCode`, `strategyVersion`, `players` y `pagination`; el segundo acceso debe usar el resultado vigente.
3. Cambiar `page`, `limit` o uno de los filtros y verificar el conjunto y los puestos correspondientes. Volver a la combinación original mientras siga vigente.
4. Esperar hasta que la respuesta original cumpla 60 segundos desde su generación. La siguiente consulta debe leer datos persistidos. Repetir tras reiniciar la aplicación web.
5. Como superusuario, ejecutar el recálculo manual existente o dejar que el worker ejecute un turno programado. Si se publica al menos una cotización, consultar inmediatamente el ranking con la misma combinación anterior y contrastar valores, orden y puestos con los datos nuevos.
6. Probar sin JWT, con `page=0`, con un parámetro desconocido y sin estrategia activa: deben permanecer `401`, `400` y `409` según corresponda. Simular una lectura fallida y repetirla después de restablecer la base: el error no debe quedar guardado.

El mismo `x-correlation-id` de observación debe seguir presente en respuestas servidas con y sin resultado vigente. No debe aparecer un campo público que indique el origen de la respuesta.

## Medición de rendimiento (SC-001)

En el mismo entorno y con al menos 1000 jugadores rankeables, medir solo el tiempo de la consulta del ranking para 30 muestras sin entrada vigente y 30 muestras con entrada vigente de la misma combinación. Preparar una instancia de caché nueva para cada muestra fría fuera del tiempo medido; calentar la entrada una vez antes de medir cada muestra vigente. Mantener iguales datos, filtros, página, límite y entorno entre grupos. Registrar las dos medianas y calcular `(mediana_fría - mediana_vigente) / mediana_fría × 100`; debe ser al menos 25%. No contar preparación, reinicios ni creación de datos dentro de las muestras.

## Evidencia esperada

- Respuestas `200` iguales para la misma consulta y estado persistido, con y sin caché.
- Ningún resultado servido tras 60 segundos o tras una publicación confirmada de cotizaciones.
- Capacidad máxima de 100 entradas; la consulta descartada vuelve a la lectura persistida.
- Errores y respuestas incompletas ausentes de la caché.
- Mediana de consultas vigentes al menos 25% menor que la mediana fría en la prueba controlada.

## Validación ejecutada el 2026-11-23

- Base aislada `desapp_integration_018`, creada con las migraciones actuales. Pasaron 35 pruebas unitarias de caché, servicio, repositorio, controlador y esquema; pasaron las pruebas de integración de turnos, ranking y ruta contra PostgreSQL. `npx tsc --noEmit`, ESLint de los archivos modificados y `npm run build` terminaron correctamente.
- `tests/performance/player-ranking-cache.bench.ts`: 1000 jugadores rankeables y 30 muestras por grupo. Mediana fría **8,60 ms**; mediana vigente **1,43 ms**; mejora **83,37 %**. La preparación de datos, el calentamiento de entradas y la creación de instancias quedaron fuera de las muestras.
- En `next start` sobre la base local con una estrategia activa, dos solicitudes HTTP autenticadas iguales respondieron `200` con 20 jugadores y cuerpo idéntico. Una solicitud con parámetro desconocido respondió `400`; sin JWT, `401`. Ambos `200` incluyeron `x-correlation-id`. Tras detener y reiniciar el servidor, la primera solicitud autenticada volvió a responder `200` con 20 jugadores.
- La integración inició un proceso separado que ejecutó `BatchExecutionService.runScheduled` y publicó una cotización. La primera lectura posterior sustituyó un ranking vacío previamente almacenado. Otra prueba mantuvo una publicación abierta antes del commit, consultó durante ese intervalo y comprobó que la primera lectura posterior al commit obtuvo la cotización nueva y que la respuesta antigua no quedó vigente.
- La suite completa `npm test` pasó con 634 pruebas y 26 omitidas (las suites de base se ejecutaron aparte). `npm run test:coverage` también pasó los umbrales globales de 80 %: 89,66 % de sentencias, 85,58 % de ramas, 90,95 % de funciones y 91,45 % de líneas.
