# Research: Ranking de jugadores en el frontend

## Contrato existente

**Decision**: Usar `GET /api/players/ranking` con Bearer, filtros `league`, `team`, `position`, `page` y `limit=20`; leer `players`, `strategyCode`, `strategyVersion` y `pagination` sin ordenar ni recalcular.

**Rationale**: El contrato [ranking.yaml](../007-player-ranking/contracts/ranking.yaml) y la ruta actual ya entregan los datos necesarios. El servicio backend asigna `rank` global desde página y límite; su orden es la autoridad. No hacen falta consultas adicionales a perfiles.

**Alternatives considered**: Reusar el catálogo y ordenar `currentQuote` en cliente (no reproduce estrategia, score ni puestos); crear API nueva (fuera de alcance); descargar todas las páginas (innecesario).

## Filtros y URL

**Decision**: Mantener filtros y página en query de `/ranking`, normalizar valores inválidos al leer, omitir parámetros no admitidos al consultar y enviar el texto de equipo al confirmar su entrada. Reiniciar a página 1 al cambiar filtros y conservarlos al paginar.

**Rationale**: La página de jugadores ya utiliza parámetros de URL para filtros y paginación. El backend admite coincidencia parcial de equipo, pero el selector de equipos del catálogo se construye a partir de la página visible y puede impedir elegir uno ausente. Un campo de texto independiente respeta el contrato y evita consultas por cada tecla.

**Alternatives considered**: Selector de equipos de la página actual (incompleto); filtros solo en estado local (se pierden al recargar); buscar por tecla (solicitudes innecesarias).

## Sesión y respuestas tardías

**Decision**: Esperar hidratación de `AuthContext`, solicitar con el token vigente, limpiar al cambiar sesión, abortar solicitudes anteriores y verificar una clave de sesión y selección antes de aplicar resultados. `401` dispara cierre de sesión y redirección.

**Rationale**: La autenticación vive en el cliente y la página del historial ya protege respuestas anteriores con una clave de sesión. `AbortController` reduce trabajo, pero una comprobación adicional evita que un resultado ya resuelto pinte datos de otra consulta o usuario.

**Alternatives considered**: Estado global de ranking (aumenta riesgo de datos obsoletos); confiar solo en aborto (ventana de carrera); mostrar datos previos durante carga de filtros nuevos (puede inducir a error).

## Errores, vacío y página obsoleta

**Decision**: Mapear `200` vacío a un estado sin jugadores, `409` a falta de estrategia activa y `401` al flujo de sesión. El resto de fallos presenta reintento de la selección actual. Si la página solicitada supera el total vigente, normalizar a la última página válida una sola vez; con total cero, normalizar a 1.

**Rationale**: El contrato distingue estos casos y `totalPages=0` es válido cuando no hay jugadores. La URL puede quedar obsoleta si cambia la estrategia o el conjunto rankeable. Una corrección acotada permite continuar sin fabricar filas ni entrar en un ciclo de navegación.

**Alternatives considered**: Tratar `409` como vacío (oculta el problema); dejar una página inexistente sin salida (mala navegación); reintentar automáticamente fallos indefinidamente (riesgo de bucle).

## Presentación y verificación

**Decision**: Presentar escala 0–1 del `finalScore`, valor con unidad, instante en UTC explícito y estrategia/versión de la misma respuesta. Reusar etiquetas, `PageContainer`, SCSS y controles nativos; probar comportamiento observable con Vitest y validar teclado/móvil manualmente.

**Rationale**: El contrato define `finalScore` entre 0 y 1 y `unit` de cotización. El perfil de jugador ya presenta sus cotizaciones en UTC mediante `Intl`, y el proyecto dispone de etiquetas de ligas. No se requiere una biblioteca visual o de datos nueva. Las pruebas útiles verifican transporte, transiciones y concurrencia, no archivos declarativos.

**Alternatives considered**: Convertir score a porcentaje (introduce otra representación no pedida); representar puesto solo con color; pruebas triviales de estilos o configuración.
