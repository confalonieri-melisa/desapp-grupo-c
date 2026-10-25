# Quickstart de validación

Guía de implementación y validación de 008. Referencias: [contrato](contracts/player-quotes-ui.md), [modelo](data-model.md), [spec](spec.md).

## Preparación

### Registro de implementación (2026-10-25)

- Especificación aprobada explícitamente por el usuario en la conversación; no equivale a aprobación de entrega.
- Rama comprobada: `feature/008-player-quotes-frontend`; checkout inicialmente limpio.
- Runtime encontrado: Node 20.17.0, npm 10.8.2. Node está por debajo del requisito >=22.12; se verificará disponibilidad de un runtime compatible antes del build.
- Docker no está disponible en PATH; sí se encontró PostgreSQL 17 local activo en localhost:5432. Se creó exclusivamente para esta validación la base `desapp_008_codex_20261025` y se migró antes de insertar fixtures o ejecutar pruebas. La base de desarrollo indicada por `.env` es distinta y no se modificó.
- Se reutilizan los comandos de automatización siguientes, package.json y .env.example; no se sobrescribe .env ni se usa db:seed.

Desde la raíz, Node >=22.12, npm y Docker/PostgreSQL. Crear .env desde .env.example solo si no existe; configurar DATABASE_URL y JWT_SECRET. Usar base aislada para pruebas de integración.

```powershell
npm ci
npm run db:up
npm run db:migrate
npm run dev
```

No generar migraciones para 008. No depender de db:seed: el archivo al que apunta no existe en este checkout. No hace falta scraping para validar esta UI.

Abrir http://localhost:3000 y autenticar mediante el flujo existente. Para prueba con backend real: cuentas INVESTOR y SUPERUSER, jugador A con tres o más snapshots persistidos antes/durante/después de 2026-10-20, dos instantes el mismo día y dos registros empatados; jugador B sin quotes. Incluir teamScore nulo, ceros reales, JSON anidado/arrays/booleanos/texto largo. Guardar respuestas esperadas. Si faltan datos, preparar fixtures en base de prueba durante implementación tomando como referencia `tests/integration/player-quotes.repository.spec.ts`; no agregar una vía productiva de escritura. Ausencia completa de explicación puede verificarse con respuesta HTTP simulada, pues el esquema normal la contiene.

## Automatización

Después de implementar las rutas de tests propuestas:

```powershell
npm test -- tests/unit/services/client.player-quotes.service.spec.ts tests/unit/features/profile/use-player-quotes.spec.ts tests/unit/features/profile/player-quotes.spec.ts tests/unit/features/profile/use-player-profile.spec.ts tests/unit/services/client.player.service.spec.ts
npm run lint
npm test
npm run build
npm run test:coverage
```

Esperado: pruebas conductuales, lint, build y umbrales vigentes pasan; conservar todos los tests anteriores. No crear pruebas declarativas para inflar cobertura.

Verificación de fecha en zonas opuestas (restaurar TZ original después si existía):

```powershell
$env:TZ = 'Etc/GMT+3'
npm test -- tests/unit/features/profile/player-quotes.spec.ts tests/unit/services/client.player-quotes.service.spec.ts
$env:TZ = 'Pacific/Kiritimati'
npm test -- tests/unit/features/profile/player-quotes.spec.ts tests/unit/services/client.player-quotes.service.spec.ts
Remove-Item Env:TZ
```

Esperado: misma query para 2026-10-20, fin de mes y 2028-02-29; rechazar 2026-02-29, 2026-02-30, formato incorrecto y vacío; permitir futuro.

Regresión PostgreSQL real con DATABASE_URL de prueba y esquema migrado (restaurar variable previa si existía):

```powershell
$env:RUN_DB_INTEGRATION_TESTS = 'true'
npm test -- tests/integration/player-quotes.repository.spec.ts
Remove-Item Env:RUN_DB_INTEGRATION_TESTS
```

Esperado: orden/selección según tests existentes. La prueba `tests/integration/player-quotes.routes.spec.ts` usa dobles; se ejecuta en la suite general como regresión de contrato, sin acreditar integración real.

## Aceptación en navegador

1. INVESTOR: catálogo → perfil A. Comparar con GET sin fecha en DevTools: actual = items[0], todas las filas en orden recibido incluidos empates. Valor/unidad/timestamp UTC preciso/estrategia/versión completos; no usar currentQuote del perfil. Perfil B muestra ausencias específicas sin cero ficticio.
2. Consultar 2026-10-20: comparar con GET con date exacta, distinguir día solicitado e instante efectivo y regla temporal. Probar día sin cálculo, anterior al primero y futuro; solo ausencia puntual reconocida muestra su mensaje específico y el historial no cambia.
3. Fecha vacía/incorrecta y 400 simulado: error asociado sin éxito aparente. Cambiar selección tras éxito retira vigencia. Limpiar durante carga/error/éxito vacía estado puntual, conserva historial y descarta respuestas pendientes.
4. Abrir detalles de actual, filas y puntual: comparar scores y todos los componentes anidados; cero/false reales conservados y null/ausencia distintos. Empates distinguibles por posición; explicaciones no se mezclan.
5. Simular offline/500, recuperar red y reintentar cada consulta. Fallo puntual conserva actual/historial. En tests con promesas controladas, resolver A después de B y generar error/401/finally tardíos; repetir con cambio de jugador/fecha, limpiar y reintentos superpuestos. Ningún resultado obsoleto afecta presentación.
6. UUID inexistente e identificador inválido muestran estado específico y regreso al catálogo. Sin sesión o 401 vigente retira datos y redirige a login. SUPERUSER tiene las mismas consultas.
7. Completar recorrido a 360/1280 px solo con teclado: foco, label, consultar/limpiar/reintentar y detalles accesibles. Verificar anuncios con lector de pantalla y texto largo sin pérdida. Red solo GET, sin polling ni requests de detalle.

La ejecución y evidencia de esta guía se registran a continuación; la aprobación formal de entrega sigue pendiente.

## Resultados de implementación (2026-10-25)

La especificación recibió aprobación explícita del usuario para implementación. La revisión formal de la entrega por la Project Owner sigue pendiente.

| Verificación | Resultado |
|---|---|
| Tests focalizados (`tests/unit/services/client.player-quotes.service.spec.ts`, `client.player.service.spec.ts`, `tests/unit/features/profile/`) | 5 archivos, 85 tests aprobados |
| Fechas en `TZ=Etc/GMT+3` y `TZ=Pacific/Kiritimati` | 2 archivos, 29 tests aprobados en cada zona; TZ restaurada |
| `npm run lint` | Aprobado |
| `npx tsc --noEmit` | Aprobado |
| `npm test` | 48 archivos y 256 tests aprobados; 3 archivos/6 tests omitidos por sus gates existentes |
| `npm run build` | Aprobado. El primer intento falló por descarga de fuentes de Google bloqueada en el sandbox; el reintento con acceso de red compiló y generó 14 páginas |
| `npm run test:coverage` | Aprobado: statements 95.41 %, branches 89.17 %, functions 96.03 %, lines 96.01 % (umbrales: 80 %) |
| PostgreSQL real | Base nueva `desapp_008_codex_20261025`, migraciones aplicadas; `RUN_DB_INTEGRATION_TESTS=true npm test -- tests/integration/player-quotes.repository.spec.ts`: 2 tests aprobados. Variables `DATABASE_URL` y `RUN_DB_INTEGRATION_TESTS` restauradas. La prueba de rutas usa dobles y pasó en la suite general; no se cuenta como integración real. |

El entorno disponible tiene Node 20.17.0 pese al requisito declarado >=22.12.0. Build, lint y tests pasaron con ese runtime; queda por repetirlos en Node compatible en CI. Docker no fue necesario porque PostgreSQL 17 local permitió una base aislada.

### Evidencia de navegador

Se usó Chrome 155 headless contra `next start` y la base aislada, con dos cuentas de prueba: INVESTOR y SUPERUSER. `acceptance-fixtures.sql` documenta jugadores A/B y tres cotizaciones de A, incluidos dos instantes empatados, score colectivo nulo, cero real y JSON anidado. Se capturaron vistas de ambos roles a 360 y 1280 px para revisión local; las imágenes son artefactos de evidencia y no se versionan. Se comprobó `document.documentElement.scrollWidth <= innerWidth` a 360 y 1280 px. Se abrieron detalles nativos y se comprobaron componentes anidados, cero, false y ausencia. Los textos y el orden visible coinciden con los tres registros del GET de A; B mostró ambos mensajes de ausencia.

| Criterio | Evidencia observada |
|---|---|
| SC-001 | A: cotización actual de 50 créditos por token = primer item; 3 filas en orden, dos empatadas separadas, segundo valor 10 y tercero 30. B: ausencia actual e histórica. |
| SC-002 | Consulta 2026-10-20 devolvió registro del backend con fecha solicitada separada de 2026-10-20 10:02:03.123 UTC. Consulta 2026-10-18 informó ausencia; 2028-02-29 futura fue aceptada. |
| SC-003 | Tests focalizados en UTC−03 y UTC+14 aprobaron fechas exactas, calendario real y string enviado sin conversión. |
| SC-004 | Detalles de actual y filas expusieron score colectivo no disponible, score individual cero, false, null, arrays y objetos. Proyección y asociación de resultado puntual cubiertas por tests. |
| SC-005 | En Chrome: fecha vacía mostró error asociado (`aria-invalid=true`) sin GET; desconexión de la consulta puntual preservó historial y el reintento recuperó; bloqueo de GET historial mostró error/reintento; jugador inválido y no encontrado mostraron retorno al catálogo; token vencido redirigió a login y ocultó perfil. |
| SC-006 | Pruebas con promesas controladas cubrieron cambios de jugador/token/fecha, limpieza y reintentos, incluidos éxito/error/401 tardíos. Chrome confirmó limpieza y sustitución de la fecha. |
| SC-007 | Ambos roles mostraron las mismas lecturas. Capturas de 360/1280 px sin desborde. Con eventos de teclado reales en Chrome, Tab recorrió el input de fecha hasta Consultar y Limpiar; Enter limpió, conservando el foco. El árbol de accesibilidad expuso label y acciones. |

La traza de red del build de producción mostró **un GET de historial por carga válida del perfil**, un GET por consulta o reintento puntual y uno adicional por reintento explícito del historial. Los detalles y la limpieza no hicieron solicitudes; todas las solicitudes a `/api/` fueron GET. En `next dev`, React Strict Mode emitió dos GET iniciales por su montaje de comprobación; la verificación de conteo se hizo sobre el build de producción.

**Pendiente de aceptación humana:** escuchar los anuncios con un lector de pantalla real y confirmar la experiencia subjetiva del foco y contenido largo. Las inspecciones del árbol de accesibilidad y el teclado automatizado no sustituyen esa revisión. La aprobación formal de la Project Owner para la entrega sigue pendiente. No se publicaron cambios.

El usuario confirmó en la conversación que pudo ver las cotizaciones de su base local y dio por verificada esa comprobación visual. La verificación con lector de pantalla y la aprobación formal de entrega no se infieren de esa confirmación.

### Datos locales para visualización (seguimiento del usuario, 2026-10-25)

El usuario confirmó que quería generar cotizaciones en su base local porque ningún perfil mostraba una. La base configurada por `.env` (`localhost:5432/desapp_db2`) tenía 194 jugadores, cero cotizaciones y cero versiones de estrategia. Se creó una versión activa `1.0.0` de `INDIVIDUAL_PERFORMANCE` con la configuración del servicio existente y se ejecutó `QuoteRecalculationService`: `COMPLETED`, 194 calculadas, 0 rechazadas. La comprobación posterior encontró 194 cotizaciones para 194 jugadores y una versión activa. Una lectura autenticada de la API en la app local devolvió una cotización de Florian Thauvin (40.17 créditos por token). Estos son datos calculados en la base local, distintos de los fixtures de aceptación aislados; por ahora cada jugador tiene un único registro histórico con fecha de cálculo 2026-10-25.
