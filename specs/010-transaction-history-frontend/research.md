# Research: Historial de operaciones del inversor

## Fuente y contrato de operaciones

**Decision**: Consumir `GET /api/users/:id/transactions` de la feature 006 con `limit=20`, `offset` y Bearer; el ID viene exclusivamente de `AuthContext.user.id`. Leer `items`, `offset`, `limit` y `hasMore`; presentar `quoteValue`, `total`, `unit` y `createdAt` recibidos.

**Rationale**: La ruta y el contrato [transactions.yaml](../006-operation-history/contracts/transactions.yaml) ya existen. `MarketOperationService.getHistory` verifica que `auth.sub` coincida con `:id`; el repositorio consulta los registros históricos en orden descendente. `20` está dentro del rango permitido de 1 a 100 y limita el primer render.

**Alternatives considered**: Calcular desde cartera/cotización actual (incorrecto para historia); crear endpoint nuevo (fuera de alcance); obtener todas las filas al inicio (peor para historias largas).

## Sesión y respuestas tardías

**Decision**: Esperar `isHydrated`, usar `user` y `token` del contexto, limpiar estado al cambiar cualquiera, abortar peticiones y además comprobar una generación de sesión antes de aplicar resultados. Clasificar respuestas por `response.status` en el nuevo servicio; `401` dispara el flujo actual de `logout` y redirección. `403` elimina datos y presenta acceso denegado.

**Rationale**: `AuthContext` persiste credenciales en `localStorage`; `AppShell` ya oculta navegación a usuarios sin sesión. La página de jugadores usa `logout()` y `router.replace('/login')`. Un aborto solo no garantiza que una promesa resuelta antes de procesarse no actualice estado: la generación protege el cambio A→B.

**Alternatives considered**: Guardar datos en estado global (eleva riesgo de fuga entre usuarios); confiar solo en `AbortController` (insuficiente ante respuestas tardías); interpretar un error `401` como historial vacío (falso).

## Paginación mutable

**Decision**: Mantener orden recibido, agregar elementos nuevos por ID, avanzar `offset` por el largo de `response.items` sin deducirlo del largo visible y conservar el offset de una página fallida. No refrescar la primera página durante la visita; al reabrir se inicia en cero.

**Rationale**: El endpoint usa `offset`; si una operación reciente se inserta entre páginas, pueden repetirse IDs en la respuesta posterior. La deduplicación conserva lo visible. Avanzar por el número visible podría pedir una página ya recorrida. `hasMore` es la única señal de continuidad del contrato.

**Alternatives considered**: Ordenar por fecha formateada (pierde desempate del servidor); deducir offset de elementos únicos (repite posiciones); cursor o snapshot (requerirían backend). **Límite**: sin cursor/snapshot, una inserción concurrente puede desplazar la ventana leída; la UI no puede garantizar una fotografía completa durante esa visita. La reapertura recupera el estado actual.

## Nombre de jugador

**Decision**: Consultar `GET /api/players/:id` con Bearer para cada ID distinto que se necesite mostrar y memorizar el resultado dentro de la visita. Mostrar ID legible mientras se resuelve y si hay `404` o error no autorizativo; solo enlazar al perfil cuando la respuesta confirma que existe. Un `401` se trata como expiración de sesión.

**Rationale**: El historial solo contiene `playerId`; la ruta de jugador devuelve `name`. El `getPlayer` cliente actual convierte fallos HTTP en un `Error` con mensaje y pierde el estado, por lo que la nueva integración necesita conservar/clasificar `status` sin cambiar el contrato del backend. La disponibilidad del perfil nunca bloquea la lectura financiera.

**Alternatives considered**: Presentar siempre el ID (no cumple el nombre disponible); enlazar antes de comprobar perfil (enlace roto); agregar join al historial (cambio de backend excluido).

## Formato y accesibilidad

**Decision**: `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', ... })` para el instante recibido, `Intl.NumberFormat('es-AR')` para números; texto de unidad «créditos por token» para `CREDIT_PER_TOKEN`, y «créditos» para total. Lista de filas con etiquetas explícitas, tipo textual, botones nativos, foco visible y anuncios de estado.

**Rationale**: La zona del navegador puede diferir de Buenos Aires. El contrato especifica `unit: CREDIT_PER_TOKEN`; `quoteValue` y `total` ya son históricos. La UI actual usa `PageContainer`, SCSS y controles nativos, que pueden extenderse sin dependencias.

**Alternatives considered**: Hora local del dispositivo (incumple spec); recalcular total (puede modificar valor histórico); codificar solo colores para tipo (inaccesible).
