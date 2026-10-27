# Quickstart: validar trading desde el perfil

Guía de validación para la implementación de [spec.md](spec.md). El [contrato UI](contracts/player-trading-ui.md) detalla solicitudes, respuestas y errores; [data-model.md](data-model.md) define estados y valores ausentes.

## Aprobación y preparación de implementación

La Project Owner confirmó explícitamente el 2026-10-25 que revisó y aprobó la especificación 009 para comenzar la implementación. Se comprobó antes de cambiar código de aplicación, conforme al principio II de la constitución. La checklist `checklists/requirements.md` tiene 16/16 criterios marcados.

Para repetir los escenarios, utilizar una base de desarrollo aislada y las rutas existentes. Preparar un usuario INVESTOR con saldo suficiente y una posición en el jugador cotizado, otro INVESTOR sin posiciones y un SUPERUSER. Disponer de un jugador con cotización actual y otro sin cotización. Conservar sus identificadores y credenciales solo en el entorno local. La misma sesión permite abrir `/players/{id}` para un jugador con posición y otro sin posición; `GET /api/portfolio` debe conservar posiciones de otros jugadores para comprobar que el perfil solo muestra la correspondiente.

En DevTools, filtrar la pestaña Network por `/api/players/{id}/quotes`, `/api/portfolio` y `/api/orders/`. Usar interceptación local de respuestas para probar `GET` demorado, `items: []`, `401`, `409`, `5xx`, JSON ilegible y fallo de red, y `POST` con `201`, rechazo o respuesta incierta. Contar solicitudes y comprobar el cuerpo `{playerId, quantity}` del POST. No modificar `.env` ni datos productivos; usar los comandos y rutas indicados abajo sobre la base local de prueba.

## Preparación

1. Usar Node.js >=22.12.0 y una instalación local de PostgreSQL configurada según el README y `.env.example` del repositorio. Preparar una base local de prueba con las migraciones vigentes y datos conocidos: un INVESTOR con créditos, un SUPERUSER, un jugador con cotización y tokens en el pool, y otro jugador sin cotización. Conservar credenciales solo en el entorno local.
2. Desde la raíz del repositorio:

   ```powershell
   npm install
   npm run db:migrate
   npx tsx scripts/backfill-initial-pool-tokens.ts
   npm run dev
   ```

   Si el diagnóstico indica jugadores cotizados sin tenencia inicial en el pool, ejecutar `npx tsx scripts/backfill-initial-pool-tokens.ts --apply` sobre la base local elegida. El script usa el mismo pool central que las órdenes, crea solo posiciones faltantes y admite repetición sin duplicarlas.

3. Iniciar sesión como INVESTOR y abrir `/players/{id}` para un jugador con cotización. Verificar que el perfil carga antes de operar. Para rechazos y estados de red, usar datos de prueba controlados o interceptar respuestas en herramientas del navegador; no ejecutar órdenes repetidas en datos productivos.

## Recorridos de aceptación

| Escenario | Acción | Resultado esperado |
|---|---|---|
| Consulta | Abrir perfil con posición y consultar la respuesta de portfolio. | Cotización en créditos/token, saldo, cantidad, promedio, valor actual y PnL del jugador abierto; ninguna otra posición. `0`, negativo y `null` se distinguen. |
| Portfolio vacío | Abrir con `items=[]`. | Mensaje de portfolio vacío, saldo visible, cero tokens y sin promedio/valor/PnL ficticios. |
| Sin posición del jugador | Usar portfolio con otras posiciones. | Cero tokens del jugador, sin mostrar los otros items; no se etiqueta todo el portfolio como vacío. |
| Carga y fallo de GET | Demorar y luego fallar `GET /api/portfolio`. | Carga diferenciada; después error y reintento, manteniendo la cotización válida. |
| Falta de cotización | Abrir jugador sin cotización. | Mensaje explícito; saldo/posición disponibles; órdenes indisponibles. |
| Entrada y confirmación | Probar vacío, 0, negativo, decimal, texto, exponente, fuera de rango, mayor al saldo/tenencia; luego entero válido. | Error ligado al campo y cero POST en entradas inválidas. Confirmación válida muestra jugador, tipo, cantidad, cotización y total orientativo; cancelar conserva cantidad y no envía POST. |
| Compra | Confirmar una compra válida y observar red. | Un POST `/api/orders/buy` con solo `playerId` y `quantity`; progreso, un solo envío con doble activación, comprobante con precio/total del 201 y GET portfolio posterior. |
| Venta parcial y total | Vender cantidad válida y luego toda la tenencia. | Un POST `/api/orders/sell` por confirmación; nuevo GET actualiza posición. Venta total muestra cero y elimina métricas de posición ausente. |
| Rechazo | Provocar 409 por saldo y por tenencia; comprobar también conflicto desconocido. | Mensaje correcto o genérico según respuesta; ningún éxito ficticio; cantidad preservada y posibilidad de actualizar datos. |
| Orden incierta | Cortar la respuesta de POST o devolver 5xx. | Estado indeterminado, sin afirmar ejecución; acción de consultar portfolio y sin POST automático. |
| Éxito, GET fallido | Devolver 201 y fallar el GET posterior. | Comprobante conservado; cifras previas no figuran como actuales; acción de reintento de GET. |
| Sesión y rol | Expirar JWT; iniciar como SUPERUSER. | 401 usa logout y retira datos; SUPERUSER puede consultar datos autorizados y carece de controles para operar. |
| Respuestas tardías | Demorar GET/POST, cambiar jugador y sesión antes de responder. | Ningún dato anterior reemplaza el perfil actual; comprobante de POST confirmado, si se presenta en la misma sesión, identifica al jugador original; sesión nueva no ve datos de la anterior. |

## Verificación automatizada y visual

Tras implementar, ejecutar desde la raíz:

```powershell
npm test -- tests/unit/services/client.player-trading.service.spec.ts tests/unit/features/profile/use-player-trading.spec.ts tests/unit/features/profile/player-trading.spec.ts
npm run lint
npm run build
```

## Resultados de verificación automatizada (2026-10-25)

- Pruebas focalizadas de cliente, hook, utilidades y regresión de cotizaciones después de las correcciones finales: 154 aprobadas en 4 archivos.
- Suite completa `npm test` después de la reparación del pool: 412 aprobadas y 9 omitidas en 65 archivos (61 aprobados, 4 omitidos).
- `npm run lint`: aprobado sin errores.
- `npm run build`: compilación de producción y TypeScript aprobados; la ruta `/players/[id]` se generó correctamente.
- Vitest mostró ocasionalmente `spawn EPERM` al arrancar dentro del sandbox de herramientas; ejecutar nuevamente fuera de ese aislamiento permitió completar las pruebas. No hubo fallas de aserciones.

Comprobar en navegador los recorridos anteriores a 360 y 1280 px. Completar compra, venta, cancelación, rechazo y reintento solo con teclado; revisar foco inicial y retorno del diálogo, Escape, mensajes anunciados y ausencia de desplazamiento horizontal. La finalización de la feature requiere también revisión y aprobación formal de Project Owner conforme a la constitución.

## Aceptación manual a cargo de la Project Owner

La Project Owner indicó que realizará personalmente las pruebas de navegador y que el agente no debe levantar servidores. No se ejecutó la aceptación manual ni se atribuyen resultados visuales a la verificación automatizada. T032 queda pendiente.

Al probar con los datos locales preparados arriba:

1. Abrir el perfil de un jugador cotizado como INVESTOR y mirar Network. Por carga confirmada debe haber un GET de historial `/api/players/{id}/quotes` y uno de `/api/portfolio`; los paneles deben mostrar carga por separado. Comprobar saldo, posición exacta del jugador y valores `0`, negativos y `null`.
2. Repetir con `items=[]`, solo posiciones de otros jugadores, jugador sin cotización, portfolio que falla y 401. Verificar vacío frente a ausencia, reintento sin perder cotización y redirección/ocultación de datos ante sesión vencida.
3. Con teclado, ingresar cantidad inválida, comprar y cancelar con botón y Escape. Verificar error asociado al campo, foco inicial dentro del diálogo y retorno al control; cancelar debe producir cero POST.
4. Confirmar compra y venta parcial/total con doble activación de la confirmación. Cada confirmación debe producir un solo POST con `{playerId, quantity}` y un GET portfolio después de 201; durante ese GET no deben figurar cifras previas como actuales. Comprobar comprobante con precio/total del servidor y foco en resultado.
5. Simular 409 conocidos y desconocidos, fallo de red/5xx del POST y 201 seguido de GET fallido. Verificar mensaje y recuperación, cantidad conservada, estado incierto sin POST automático, y comprobante conservado tras GET fallido.
6. Demorar GET/POST y cambiar de jugador o sesión. Una orden de A que termina en B debe nombrar A y refrescar el portfolio vigente de B; una sesión nueva no debe mostrar datos anteriores. Como SUPERUSER deben verse solo las consultas, sin controles de compra/venta.
7. Repetir los controles y diálogos a 360 y 1280 px, solo con teclado. Comprobar foco visible, anuncios, ausencia de recorte horizontal y que ninguna acción quede fuera de pantalla.

## Trazabilidad y estado de cierre

| Requisitos | Evidencia automatizada o de código | Pendiente manual |
|---|---|---|
| FR-001–005, FR-008, FR-013; SC-001 | Pruebas de página, cliente GET, selección, hook de portfolio y cotizaciones; sección integrada. | Datos reales/visuales, vacío y cotización ausente. |
| FR-006–007, FR-009–016; SC-002–005 | Pruebas de validación, cliente POST y hook BUY/SELL, rechazo, incertidumbre, GET posterior y bloqueo doble. | Diálogo, teclado, red y contadores de solicitudes en navegador. |
| FR-017–018 | Pruebas de aislamiento por sesión, jugador y solicitudes tardías; logout por 401. | Navegación y sesión vencida en navegador. |
| FR-019–020; SC-006 | Etiquetas, `aria-*`, `<dialog>`, estados anunciados, foco y CSS implementados; build aprobado. | Foco/teclado/lectores de pantalla y anchos 360/1280. |
| FR-021–022; SC-007 | Cambios limitados a frontend; rol INVESTOR controla las acciones en el componente y página. | Verificar SUPERUSER e INVESTOR en navegador. |

La aprobación formal de la **especificación** fue confirmada antes de implementar. La revisión y aprobación formal de la **entrega** del principio IX todavía dependen de la aceptación de la Project Owner. No hay incidencias automatizadas abiertas; la aceptación manual es la limitación restante.

## Reparación de la base local `desapp_db2` (2026-10-25)

Ante una compra que mostró resultado incierto, se comprobó que esta base tenía cuatro migraciones aplicadas, carecía de `market_operations` y `financial_audit_records`, y los 194 jugadores cotizados carecían de tenencia inicial del pool. Con autorización de la Project Owner se aplicó la migración existente `0004` y se crearon 194 posiciones iniciales de 100 tokens en el pool canónico. La verificación posterior mostró cinco migraciones, ambas tablas presentes, cero jugadores cotizados sin posición del pool y cero operaciones registradas. No se levantó ningún servidor. Además, el repositorio ahora selecciona de forma determinista el mismo pool al inicializar y al operar, y responde 409 si faltase su posición en vez de producir un error interno.

La Project Owner volvió a probar y confirmó que la compra funciona. La consulta posterior a `desapp_db2` mostró una operación y un registro de auditoría, con 10 tokens transferidos desde el pool. Esta comprobación cubre la compra realizada; los demás recorridos de T032 siguen pendientes de aceptación manual.
