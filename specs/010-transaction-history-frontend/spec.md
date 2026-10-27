# Feature Specification: Historial de operaciones del inversor

**Feature Branch**: `feature/010-transaction-history-frontend`

**Integration Base Branch**: `main`
**Stacked On**: `feature/009-player-token-trading-frontend` (que incluye `feature/008-player-quotes-frontend`)

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Especificar una feature de frontend para que un inversor autenticado consulte su historial propio de compras y ventas de tokens de jugadores, usando el historial de la feature 006 integrado en main."

## Clarifications

### Session 2026-10-26

- Q: ¿Cómo debe identificarse al jugador en cada operación si el historial solo devuelve su `playerId`? → A: Mostrar el nombre si está disponible; si no, mostrar el identificador.
- Q: Si se registra una operación nueva mientras el inversor pulsa «Ver más operaciones», ¿cuándo debe aparecer esa operación nueva? → A: Conservar la lista visible; mostrar operaciones nuevas al volver a abrirla.
- Q: ¿En qué zona horaria debe mostrarse la fecha y hora de cada operación? → A: Siempre hora de Buenos Aires, indicada en la vista.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar las operaciones propias (Priority: P1)

Como inversor autenticado, quiero encontrar mi historial desde la navegación principal y revisar mis compras y ventas para recordar cuándo operé y con qué valores.

**Why this priority**: Es el valor central de la feature y permite consultar hechos financieros anteriores sin depender de la tenencia o cotización actual.

**Independent Test**: Iniciar sesión como un inversor con compras y ventas registradas, abrir el historial desde la navegación principal y comparar cada dato visible con los valores históricos de la operación.

**Acceptance Scenarios**:

1. **Given** un inversor autenticado con al menos una compra y una venta, **When** abre «Mi historial» desde la navegación principal, **Then** ve exclusivamente sus operaciones, con las más recientes primero y cada una identificada como «Compra» o «Venta» mediante texto además de cualquier señal visual.
2. **Given** una operación del historial, **When** se presenta, **Then** se muestran jugador, fecha y hora, cantidad de tokens, cotización aplicada con unidad e importe total, usando los datos guardados de esa operación.
3. **Given** una operación cuya cotización o tenencia actual cambió, **When** se vuelve a abrir el historial, **Then** la cotización aplicada y el importe total visibles conservan los valores originales.
4. **Given** una operación asociada a un jugador cuyo perfil sigue disponible, **When** se presenta y el inversor activa el acceso al jugador, **Then** ve su nombre y puede abrir su perfil. Si el jugador no puede resolverse, la operación sigue siendo legible con su identificador y no ofrece un enlace roto.
5. **Given** un inversor autenticado sin operaciones, **When** termina la consulta inicial, **Then** ve un mensaje claro de historial vacío en lugar de una lista vacía o una carga indefinida.
6. **Given** una operación registrada cerca del cambio de día en otra zona horaria, **When** se presenta, **Then** su fecha y hora corresponden al mismo instante en hora de Buenos Aires y la vista indica esa zona horaria.

---

### User Story 2 - Ver más operaciones (Priority: P2)

Como inversor con muchas operaciones, quiero cargar las anteriores mediante una acción clara para recorrer todo mi historial sin perder lo que ya vi.

**Why this priority**: El historial puede superar la primera página y debe conservar el orden y la continuidad de lectura.

**Independent Test**: Preparar un historial con más operaciones que las incluidas en la primera página, activar «Ver más operaciones» y comprobar continuidad, orden y fin del listado.

**Acceptance Scenarios**:

1. **Given** que existen más operaciones que las mostradas, **When** se carga la primera página, **Then** aparece la acción «Ver más operaciones».
2. **Given** una primera página visible, **When** se activa «Ver más operaciones» y la consulta tiene éxito, **Then** se agregan las operaciones siguientes sin reemplazar las anteriores, sin duplicados y manteniendo el orden de más reciente a más antigua.
3. **Given** que ya se mostró la última página, **When** termina esa carga, **Then** deja de ofrecerse «Ver más operaciones» y el inversor puede reconocer que llegó al final.
4. **Given** una carga adicional en curso, **When** el inversor intenta activar de nuevo la acción, **Then** se informa el progreso y no se inicia una carga duplicada.
5. **Given** una operación nueva registrada después de abrir el historial, **When** el inversor carga otra página, **Then** las operaciones ya visibles permanecen estables y sin duplicados; la operación nueva aparece al volver a abrir el historial.

---

### User Story 3 - Recuperarse de errores y proteger la sesión (Priority: P2)

Como inversor, quiero entender cuándo el historial no pudo cargarse y poder reintentar, sin que se muestren mis operaciones después de vencer o cambiar la sesión.

**Why this priority**: Los movimientos financieros son privados y un fallo temporal no debe impedir consultar el historial cuando se restablece el servicio.

**Independent Test**: Simular un fallo inicial, otro en una página posterior, una sesión vencida y el cambio entre dos usuarios; verificar mensajes, reintentos y ausencia de datos ajenos.

**Acceptance Scenarios**:

1. **Given** una consulta inicial pendiente, **When** se abre el historial, **Then** se anuncia la carga y todavía no se presenta el estado vacío.
2. **Given** un fallo de la consulta inicial, **When** termina la solicitud, **Then** se muestra un error comprensible y una acción «Reintentar» que vuelve a consultar el historial propio.
3. **Given** operaciones ya visibles y un fallo al solicitar más, **When** termina la solicitud, **Then** las operaciones previas permanecen visibles y se ofrece reintentar la misma página sin duplicarlas.
4. **Given** una sesión ausente o vencida, **When** se intenta abrir o continuar la consulta, **Then** se retiran los datos protegidos y se sigue el flujo de inicio de sesión existente; no se muestra el historial como vacío.
5. **Given** una sesión del inversor A y operaciones de A y B, **When** A consulta el historial o intenta alterar la ruta visible, **Then** la interfaz solo solicita el historial de A y nunca presenta operaciones de B.
6. **Given** una consulta de A pendiente, **When** se cierra su sesión o se inicia una sesión de B antes de recibir la respuesta, **Then** la respuesta tardía de A no aparece en la vista de B.

### Edge Cases

- Una operación puede contener un `playerId` sin un perfil resoluble; se muestra una referencia identificable al jugador y se omite el acceso al perfil, sin ocultar la operación.
- Dos operaciones pueden compartir fecha y hora visibles; se conserva el orden estable entregado por el historial existente.
- Si una página posterior falla, el reintento conserva el mismo punto de continuación y los elementos ya mostrados.
- Si se registran operaciones nuevas durante la paginación, no se insertan por delante de las ya visibles en esa visita; se muestran al volver a abrir el historial.
- Si la sesión vence durante la carga inicial o adicional, se retiran los datos del historial y se aplica el flujo de autenticación existente.
- La ausencia de operaciones se comunica solo cuando una primera consulta exitosa devuelve cero elementos; un error o una carga pendiente tienen estados propios.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La navegación principal DEBE ofrecer a los inversores autenticados un acceso claramente rotulado «Mi historial» a una vista de sus operaciones, siguiendo las convenciones de navegación existentes.
- **FR-002**: La vista DEBE ser de solo lectura y mostrar únicamente compras y ventas completadas del inversor autenticado; NO DEBE ofrecer editar, borrar ni iniciar operaciones.
- **FR-003**: La consulta DEBE usar el historial existente de la feature 006, `GET /api/users/:id/transactions`, con el identificador derivado exclusivamente de la sesión autenticada. La interfaz NO DEBE aceptar un identificador de usuario en controles, parámetros de la vista ni estado reutilizable para elegir un historial ajeno.
- **FR-004**: Las operaciones DEBEN presentarse en el orden recibido, de más reciente a más antigua. Cada operación DEBE mostrar tipo («Compra» o «Venta»), jugador, fecha y hora, cantidad de tokens, cotización aplicada, unidad e importe total.
- **FR-005**: Compra y venta DEBEN distinguirse mediante texto visible además de cualquier color, icono o estilo; la información DEBE ser comprensible sin percepción del color.
- **FR-006**: La cotización aplicada y el importe total DEBEN provenir de los valores históricos de cada operación; NO DEBEN recalcularse ni sustituirse por cotizaciones o saldos actuales. La presentación numérica DEBE seguir las convenciones de formato existentes y conservar el significado de la unidad recibida. La fecha y hora DEBEN representar el instante histórico en hora de Buenos Aires e indicar esa zona horaria.
- **FR-007**: La referencia al jugador DEBE mostrar su nombre y permitir abrir su perfil cuando este pueda obtenerse mediante los recursos existentes. Si no puede resolverse, DEBE mostrarse su identificador legible sin un enlace que lleve a un perfil inexistente.
- **FR-008**: La vista DEBE permitir agregar páginas posteriores mediante una acción «Ver más operaciones» mientras el historial indique que existen más resultados. DEBE conservar lo ya mostrado, evitar duplicados y dejar de ofrecer la acción al alcanzar el final. Las operaciones nuevas registradas durante la visita DEBEN aparecer al volver a abrir el historial, sin desplazar elementos ya visibles durante la paginación.
- **FR-009**: La vista DEBE distinguir carga inicial, carga adicional, historial vacío y contenido cargado. Las acciones de carga adicional DEBEN indicar progreso y evitar solicitudes repetidas de la misma página mientras estén pendientes.
- **FR-010**: Un fallo de consulta DEBE mostrar un error recuperable y permitir reintentar. Si el fallo ocurre en una página posterior, DEBEN mantenerse los datos ya mostrados y reintentarse únicamente la página que falló.
- **FR-011**: Ante ausencia o vencimiento de sesión, la vista DEBE retirar operaciones protegidas y aplicar el flujo de autenticación existente. Una respuesta tardía de una sesión anterior NO DEBE incorporarse al historial de la sesión vigente.
- **FR-012**: El historial DEBE ser utilizable por teclado y tecnología asistiva: acceso y acciones con nombre comprensible, foco visible, orden de lectura lógico y estados de carga y error perceptibles. Su contenido DEBE seguir siendo legible en los tamaños de pantalla admitidos por la aplicación.
- **FR-013**: El historial DEBE limitarse a presentación y consulta de operaciones existentes. Quedan excluidos filtros avanzados, exportación, edición, cálculos de PnL y cambios al backend.
- **FR-014**: La vista DEBE presentar un resumen de cantidad de operaciones, compras y ventas ya cargadas; búsqueda por jugador y filtros básicos por tipo y mes operan solo sobre esa lista. La interfaz DEBE indicar ese alcance y conservar la acción de cargar más aunque el filtro actual no encuentre resultados. Las imágenes de jugadores resueltos DEBEN usar el mapper existente.

### Key Entities *(include if feature involves data)*

- **Inversor autenticado**: Persona cuya identidad de sesión determina el único historial accesible.
- **Operación histórica**: Compra o venta completada, identificada de forma única y asociada a un jugador; conserva tipo, cantidad, cotización aplicada, total, unidad y momento de ejecución.
- **Página de historial**: Conjunto ordenado de operaciones con información de posición y continuidad para mostrar más resultados.
- **Jugador referenciado**: Jugador asociado a una operación; su perfil puede estar disponible o no al momento de consultar el historial.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de los escenarios de aceptación con compras y ventas, cada operación visible identifica los siete datos solicitados: tipo, jugador, fecha, hora, cantidad, cotización aplicada e importe total, con unidad donde corresponde y fecha y hora de Buenos Aires indicadas.
- **SC-002**: En el 100% de los escenarios con cambio posterior de cotización o tenencia, los importes y cotizaciones mostrados coinciden con los valores históricos de la operación.
- **SC-003**: En el 100% de los escenarios con varias páginas, «Ver más operaciones» permite llegar hasta la última sin perder ni duplicar operaciones y deja de aparecer al final.
- **SC-004**: En el 100% de los escenarios de historial vacío, error inicial, error de página posterior y sesión vencida, la vista muestra el estado correspondiente y ofrece la recuperación aplicable.
- **SC-005**: En el 100% de las pruebas con dos usuarios y cambio de sesión, ninguna operación de un usuario aparece en la vista del otro, incluso si una consulta anterior termina tarde.
- **SC-006**: Una persona autenticada puede llegar al historial propio desde la navegación principal en una sola acción y completar la revisión de una operación o la carga de otra página solo con teclado.

## Assumptions

- `main` es la base de integración final. Incluye el backend de la feature 006 y la autenticación. Esta rama está apilada sobre la feature 009 de compraventa frontend, que a su vez incluye la 008 de cotizaciones; el historial reutiliza su navegación y perfil sin cambiar las reglas de trading.
- El contrato existente `GET /api/users/:id/transactions` devuelve `items`, `limit`, `offset` y `hasMore`; cada elemento incluye `id`, `type`, `playerId`, `quantity`, `quoteId`, `quoteValue`, `total`, `unit`, `createdAt` y `correlationId`. `type` distingue `BUY` y `SELL`; la consulta existente entrega las operaciones más recientes primero.
- La paginación existente utiliza `limit` y `offset`, y `hasMore` señala si puede pedirse otra página. El tamaño de página es una decisión de presentación dentro del rango que admite el contrato; no se agrega paginación al backend.
- Si se registran operaciones mientras una visita está en curso, el historial existente puede cambiar entre páginas. La vista conserva lo ya presentado y evita duplicados visibles; al reabrir el historial consulta de nuevo desde el inicio para incluir las operaciones nuevas.
- El contrato histórico solo aporta `playerId`, no el nombre del jugador. La vista obtiene el nombre mediante recursos de jugadores existentes cuando están disponibles; si no puede resolverlos, muestra el identificador. La disponibilidad del perfil determina si se ofrece el enlace.
- La autenticación existente aporta la identidad del usuario y ya define cómo volver al inicio de sesión. El backend conserva la autorización final y rechaza la consulta de otro usuario; esta feature no modifica permisos.
- La fecha y hora se muestran en la zona horaria de Buenos Aires, identificada en la vista, sin alterar el instante almacenado. La unidad de cotización recibida representa créditos por token.
