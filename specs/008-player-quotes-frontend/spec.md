# Feature Specification: Consulta de Cotizaciones desde el Perfil del Jugador

**Feature Branch**: `feature/008-player-quotes-frontend` (rama prevista para el desarrollo)

**Integration Base Branch**: `main`

**Created**: 2026-10-25

**Status**: Ready for Review

**Input**: User description: "Crear una feature independiente de frontend para que usuarios autenticados consulten desde el perfil existente del jugador su cotización actual, historial, último valor disponible hasta una fecha y explicación persistida, reutilizando el contrato de 004-player-quote-queries sin modificar el backend."

## Alcance MVP

La feature incorpora una sección de cotizaciones en el perfil existente del
jugador, accesible desde el catálogo. Permite conocer su valor en créditos por
token, recorrer todas las cotizaciones recibidas, consultar el último valor
disponible hasta una fecha calendario y revisar sus scores y componentes
persistidos. INVESTOR y SUPERUSER tienen las mismas capacidades de consulta.

La cotización actual es exclusivamente el primer elemento del historial
recibido, sin volver a ordenar ni elegir registros en la interfaz. La consulta
por fecha tiene un resultado separado y nunca sustituye esa cotización actual
ni filtra el historial. Todas las superficies conservan el estilo y la
navegación existentes y son utilizables en escritorio y dispositivos móviles.

### Exclusiones

No incluye recálculo, administración de estrategias, cambios del contrato
backend, nuevas tablas, nuevas entidades persistidas, ranking, compra o venta
de tokens, portfolio, gráficos, paginación, filtros por rango, orden configurable
ni nuevas fuentes de información. No modifica las especificaciones históricas.
Las decisiones de componentes, servicios y organización técnica corresponden
al paso de plan; esta etapa no implementa código.

## User Scenarios & Testing

### User Story 1 - Conocer la cotización actual (Priority: P1)

Como usuario autenticado, quiero ver la cotización más reciente en el perfil
de un jugador al que llego desde el catálogo, para conocer su valor disponible.

**Why this priority**: Es la consulta mínima de valor y el acceso principal a
la nueva sección.

**Independent Test**: Acceder desde el catálogo al perfil de un jugador con
cotizaciones y verificar el primer registro recibido, sin usar la consulta por
fecha, el recorrido del historial ni el detalle de scores.

**Acceptance Scenarios**:

1. **Given** un usuario INVESTOR o SUPERUSER autenticado y un jugador con
   cotizaciones, **When** abre su perfil desde el catálogo, **Then** encuentra
   la sección con el valor del primer registro, unidad en créditos por token,
   fecha y hora de cálculo con zona explícita, estrategia y versión.
2. **Given** un jugador existente sin cotizaciones, **When** termina la carga,
   **Then** se informa que no hay cotización disponible y no se muestra cero
   como sustituto de un valor ausente.
3. **Given** una consulta pendiente, **When** se presenta la sección,
   **Then** muestra un estado de carga distinguible del estado vacío.
4. **Given** un fallo de red o servidor al cargar las cotizaciones, **When**
   el usuario reintenta y la consulta tiene éxito, **Then** desaparece el error
   y se presenta el resultado recibido sin abandonar el perfil.

---

### User Story 2 - Recorrer el historial completo (Priority: P2)

Como usuario autenticado, quiero consultar todas las cotizaciones recibidas
del jugador para comprender la evolución de su valor.

**Why this priority**: Agrega contexto histórico sin introducir otra regla de
selección ni depender de una consulta por fecha.

**Independent Test**: Abrir el historial de un jugador con varios registros y
comparar contenido, cantidad y secuencia con los datos recibidos, sin operar
el selector de fecha ni abrir explicaciones.

**Acceptance Scenarios**:

1. **Given** un historial con varias cotizaciones, **When** se muestra,
   **Then** todas sus entradas son consultables en el orden recibido y cada
   una informa valor, unidad, fecha y hora, estrategia y versión.
2. **Given** dos registros del mismo día con horas diferentes y dos registros
   con igual instante de cálculo, **When** se consulta el historial, **Then**
   se distinguen las horas y las entradas permanecen separadas, conservando
   incluso en el empate la secuencia recibida del backend.
3. **Given** un historial vacío, **When** termina la carga, **Then** se informa
   explícitamente que no existen cotizaciones históricas, sin crear entradas.

---

### User Story 3 - Consultar el valor disponible hasta una fecha (Priority: P2)

Como usuario autenticado, quiero elegir una fecha y consultar el último valor
disponible hasta ese día para conocer la referencia histórica correspondiente.

**Why this priority**: Resuelve una búsqueda puntual que el recorrido manual
del historial no explica por sí solo.

**Independent Test**: Con un jugador conocido y cotizaciones anteriores y
posteriores a una fecha, seleccionar esa fecha y verificar el resultado
puntual, sin necesitar recorrer el historial ni abrir el detalle.

**Acceptance Scenarios**:

1. **Given** cotizaciones antes, durante y después del 2026-10-20, **When** el
   usuario consulta esa fecha, **Then** ve el único registro seleccionado por
   el backend, su valor, unidad, estrategia y versión, la fecha solicitada
   separada de la fecha y hora efectiva y la explicación «último valor
   disponible hasta la fecha seleccionada».
2. **Given** que no hubo cálculo en la fecha elegida pero sí antes, **When**
   consulta, **Then** se muestra el registro anterior devuelto, sin afirmar
   que fue calculado el día solicitado.
3. **Given** una fecha anterior a todas las cotizaciones o un jugador existente
   sin cotizaciones, **When** consulta, **Then** se informa que no hay una
   cotización disponible hasta esa fecha y no se usa un registro posterior.
4. **Given** una fecha futura válida, **When** consulta, **Then** se permite la
   operación y se muestra la última cotización disponible que devuelva el
   backend, o el mensaje específico de ausencia si no existe ninguna.
5. **Given** una fecha inexistente, un formato inválido o el campo vacío,
   **When** intenta consultar, **Then** se indica que debe elegir una fecha
   calendario válida y no se presenta un resultado como correspondiente a ella.
6. **Given** una consulta por fecha con resultado, error o carga pendiente,
   **When** el usuario limpia la consulta, **Then** se vacían fecha y estado
   puntual sin alterar la cotización actual ni el historial; una respuesta
   tardía no vuelve a presentar la consulta limpiada.
7. **Given** que se consulta A y luego B antes de que A termine, **When** llega
   la respuesta de A después de B, **Then** únicamente el estado de B puede
   presentarse como vigente; esto también se cumple para errores tardíos.
8. **Given** una consulta por fecha fallida, **When** se reintenta, **Then** se
   consulta el jugador y la fecha vigentes, manteniendo visibles los datos
   válidos de cotización actual e historial.

---

### User Story 4 - Comprender una cotización (Priority: P3)

Como usuario autenticado, quiero consultar los scores y componentes
persistidos de una cotización para comprender la información de su cálculo.

**Why this priority**: Aporta explicabilidad sobre valores ya consultables sin
introducir cálculos ni condicionar las consultas básicas.

**Independent Test**: Presentar una cotización con explicación y otra sin
score colectivo y verificar sus detalles sin efectuar una consulta por fecha.
El mismo comportamiento se verifica para un resultado puntual.

**Acceptance Scenarios**:

1. **Given** una cotización actual, histórica o resultado por fecha con scores
   y componentes, **When** el usuario consulta su detalle, **Then** puede
   identificar el registro y ver score individual, colectivo cuando exista,
   final y todos los componentes recibidos con sus nombres y valores.
2. **Given** una estrategia individual o una explicación con score colectivo
   ausente, **When** se presenta el detalle, **Then** se indica que ese score
   no está disponible y no se representa como cero ni se deduce su valor.
3. **Given** componentes vacíos o datos de explicación ausentes, **When** se
   consulta el detalle, **Then** se informa la ausencia sin completar datos
   mediante fórmulas, valores predeterminados o información de otra cotización.
4. **Given** un score o componente persistido igual a cero, **When** se
   presenta el detalle, **Then** se conserva ese cero como dato real y se
   distingue de la ausencia.

### Edge Cases

- **Jugador inexistente**: indicar que no se encontró al jugador y ofrecer
  volver al catálogo; no confundirlo con historial vacío ni con ausencia a fecha.
- **Identificador inválido**: informar que el jugador solicitado no es válido
  y permitir volver al catálogo, sin mostrar cotizaciones de otro perfil.
- **Sesión ausente o vencida**: reutilizar la redirección al login existente;
  ante una respuesta de sesión inválida, dejar de mostrar datos protegidos.
- **Cambio de jugador con solicitudes pendientes**: descartar efectos visibles
  de éxitos y errores anteriores, incluido cualquier detalle seleccionado.
- **Cambio de fecha aún sin consultar**: el resultado anterior deja de
  presentarse como vigente para la nueva selección; indicar que debe consultarse.
- **Reintentos superpuestos**: solo el intento vigente puede resolver la
  carga, el error o el resultado de la consulta correspondiente.
- **Zonas horarias**: seleccionar el mismo día desde zonas con desplazamientos
  opuestos conserva exactamente la fecha calendario enviada; los instantes de
  cálculo se muestran en UTC con zona explícita y precisión suficiente para
  distinguir los instantes diferentes recibidos, incluidos segundos o fracciones.
- **Fechas límite**: respetar fin de mes y años bisiestos; no limitar a hoy las
  fechas futuras válidas. La inclusión del día completo la determina el backend.
- **Fallo parcial**: un error de la consulta puntual no oculta el historial ni
  la cotización actual válidos; un error de carga no se presenta como ausencia.
- **Explicación variable**: conservar todos los componentes disponibles,
  incluidos los anidados, sin exigir campos no garantizados por el contrato.
- **Pantalla angosta o valores extensos**: el contenido y las acciones siguen
  siendo accesibles sin truncar información necesaria para interpretar el valor.

## Requirements

### Functional Requirements

- **FR-001**: La sección DEBE estar en el perfil existente del jugador y ser
  accesible mediante la navegación desde el catálogo, preservando su estilo
  visual y el acceso de regreso al catálogo.
- **FR-002**: El sistema DEBE reutilizar la autenticación existente para
  INVESTOR y SUPERUSER; sin sesión válida DEBE aplicar el flujo existente de
  login y dejar de presentar los datos protegidos al detectar su vencimiento.
- **FR-003**: La cotización actual DEBE ser el primer elemento del historial
  recibido. La interfaz NO DEBE reordenar, desempatar, deduplicar ni calcular
  qué registro es el actual.
- **FR-004**: La cotización actual y cada entrada histórica DEBEN informar
  valor en créditos por token, fecha y hora de cálculo con zona explícita,
  estrategia y versión, sin alterar el significado del valor recibido.
- **FR-005**: El historial DEBE hacer consultables todos los registros
  recibidos, conservar su secuencia descendente y distinguir entradas del mismo
  día sin agruparlas ni ocultarlas por coincidencia de fecha u hora.
- **FR-006**: El historial vacío y la ausencia de cotización actual DEBEN tener
  mensajes explícitos; no DEBEN producir un precio cero ni un registro ficticio.
- **FR-007**: El usuario DEBE poder seleccionar una fecha calendario válida,
  incluso futura, y solicitar su consulta puntual. La fecha DEBE conservarse
  como el mismo día calendario independientemente de la zona horaria.
- **FR-008**: Una fecha inválida o vacía DEBE tener una indicación de validación
  asociada al control y no DEBE producir un resultado presentado como válido.
  Un rechazo de fecha por el backend DEBE informarse de igual manera.
- **FR-009**: El resultado por fecha DEBE presentar el registro devuelto, valor,
  unidad, estrategia y versión, diferenciar fecha solicitada de fecha y hora
  efectiva y explicar que es el último valor disponible hasta la fecha elegida.
- **FR-010**: La ausencia de resultado puntual DEBE tener un mensaje específico
  referido a la fecha consultada y distinguirse de jugador inexistente,
  historial vacío y fallo de consulta.
- **FR-011**: Consultar, cambiar o limpiar una fecha NO DEBE modificar la
  cotización actual ni filtrar o sustituir el historial. Limpiar DEBE retirar
  fecha, resultado, error y carga puntual, sin que respuestas pendientes los
  restablezcan.
- **FR-012**: El detalle DEBE estar disponible para la cotización actual, las
  entradas históricas y el resultado puntual, conservando su asociación con
  el registro elegido y mostrando scores individual, colectivo disponible y
  final junto con todos los componentes persistidos recibidos.
- **FR-013**: Los datos ausentes, incluido el score colectivo, DEBEN
  identificarse como no disponibles; los ceros reales DEBEN preservarse.
  No se DEBEN inventar valores, recalcular scores, completar fórmulas ni
  combinar explicaciones de diferentes cotizaciones.
- **FR-014**: Cada consulta DEBE distinguir carga, éxito con datos, ausencia
  válida y error; los fallos de red o servidor DEBEN ofrecer reintento sin
  abandonar el perfil y sin convertir el fallo en un estado vacío.
- **FR-015**: Solo las respuestas del jugador, fecha e intento vigentes DEBEN
  afectar la presentación. Cambiar de jugador DEBE retirar los datos y detalles
  del anterior; cambiar de fecha DEBE retirar la vigencia del resultado previo.
- **FR-016**: Un fallo de consulta puntual NO DEBE ocultar resultados válidos
  del historial o de la cotización actual. El reintento DEBE aplicar al jugador
  y criterio vigentes.
- **FR-017**: Un jugador inexistente o identificador inválido DEBE tener un
  mensaje específico y una acción de regreso al catálogo, sin datos residuales.
- **FR-018**: La interfaz DEBE permitir completar todas las consultas, abrir
  detalles, limpiar y reintentar mediante teclado, con controles etiquetados,
  foco visible, orden de navegación coherente y estados de carga, error y
  resultado perceptibles mediante tecnologías de asistencia.
- **FR-019**: Toda la información y las acciones DEBEN ser accesibles en
  escritorio y móvil, verificando anchos de 1280 y 360 píxeles sin solapamientos
  ni pérdida de contenido o controles.
- **FR-020**: Las consultas DEBEN reutilizar exclusivamente el contrato de
  lectura de 004 descrito en la sección de integración, sin modificarlo ni
  introducir operaciones de escritura o recálculo.

### Key Entities

- **Player**: Jugador existente cuyo perfil y cotizaciones se consultan;
  conserva el mismo identificador usado por el catálogo.
- **PlayerQuote**: Cotización persistida e inmutable existente, con valor,
  unidad, instante de cálculo, estrategia, versión y scores. «Actual» y
  «resultado por fecha» son selecciones de estos registros, no entidades nuevas.
- **QuoteExplanation**: Explicación persistida de la cotización, expuesta como
  componentes disponibles y scores asociados; no se crea una explicación nueva.

La fecha seleccionada y los estados de consulta son información de interacción,
no nuevos conceptos de dominio ni registros persistidos.

## Success Criteria

### Measurable Outcomes

- **SC-001**: En el 100% de los escenarios con historial, la cotización actual
  coincide con su primer registro y todas las entradas recibidas son
  consultables en su orden original, con los cinco datos requeridos: valor,
  unidad, fecha/hora, estrategia y versión.
- **SC-002**: En el 100% de los escenarios de fecha exacta, sin cálculo ese día,
  anterior al primer cálculo y futura, se muestra el resultado o ausencia
  correspondiente; las dos fechas y la regla temporal son identificables.
- **SC-003**: Elegir la misma fecha en UTC−03 y UTC+14 conserva el día en el
  100% de los casos de prueba, incluidos fin de mes y 29 de febrero válido.
- **SC-004**: En el 100% de los detalles verificados se conservan scores y
  componentes disponibles; ningún dato ausente se muestra como cero ni se
  agrega un valor calculado en la interfaz.
- **SC-005**: Todos los escenarios de carga, vacío, fecha inválida, ausencia
  puntual, jugador inexistente, sesión ausente o vencida y fallo de red o
  servidor presentan su estado correspondiente; los fallos recuperables pueden
  resolverse mediante reintento sin salir del perfil.
- **SC-006**: En todas las secuencias verificadas de cambio de jugador, cambio
  de fecha, limpieza y reintento con respuestas fuera de orden, ningún éxito o
  error anterior reemplaza el estado vigente.
- **SC-007**: El recorrido catálogo → perfil → consulta actual, historial,
  consulta por fecha, detalle, limpieza y reintento puede completarse con
  teclado y en anchos de 360 y 1280 píxeles sin acciones inaccesibles ni pérdida
  de información. INVESTOR y SUPERUSER obtienen el mismo acceso de consulta.

## Assumptions

- Rige la [constitución 1.2.0](../../.specify/memory/constitution.md): alcance
  acotado, especificación previa, preservación del dominio y desarrollo
  incremental. La revisión de requisitos no equivale a aprobación de entrega.
- El identificador 008 se determina revisando las carpetas existentes 001–004,
  las ramas locales y las ramas remotas anunciadas por `origin` el 2026-10-25:
  005 corresponde a catálogo/trading en ramas existentes, 006 a historial de
  operaciones y 007 a ranking. Se elige el siguiente al mayor identificador
  ocupado para evitar reutilizar números de features aún sin carpeta local.
- Se depende del catálogo, del perfil y del flujo de autenticación existentes;
  la sesión ausente o vencida redirige al login, como ya hace el perfil.
- Para este MVP, los instantes de cálculo se muestran en UTC con indicación
  explícita de zona. La fecha solicitada se trata como fecha calendario,
  separada del instante de cálculo. No se incorpora configuración de zona.
- Los componentes pueden variar según estrategia y versión: se presentan los
  que lleguen con sus nombres y valores, preservando la estructura necesaria
  para interpretarlos, sin exigir un nuevo esquema de explicación.
- No se requiere actualización en tiempo real, persistir la fecha entre
  visitas ni restaurar una consulta después del login. Al cambiar de jugador
  se inicia su consulta sin fecha ni detalle del perfil anterior.

### Dependencias y restricciones de integración

El contrato normativo es
[004-player-quote-queries/spec.md](../004-player-quote-queries/spec.md).
Los siguientes puntos documentan restricciones ya solicitadas, sin decidir
componentes, servicios, librerías ni organización técnica:

- `GET /api/players/{playerId}/quotes` devuelve `{ items: [...] }` con todo el
  historial; `items[0]` es la cotización actual. El orden lo define el backend
  por `calculatedAt DESC` e `id DESC` como desempate. No se presupone que `id`
  esté expuesto para resolver empates en la interfaz.
- `GET /api/players/{playerId}/quotes?date=YYYY-MM-DD` devuelve el mismo
  envoltorio con un registro, el último disponible hasta el día solicitado.
  El frontend conserva el criterio y utiliza la selección del backend.
- Cada registro incluye `quoteValue`, `unit`, `calculatedAt`, `strategyCode`,
  `strategyVersion` y `score` con `individualScore`, `teamScore` cuando
  corresponde, `finalScore` y `components` persistidos. La unidad
  `CREDIT_PER_TOKEN` se presenta como créditos por token.
- Historial vacío: `200` con `items: []`. Consulta puntual sin resultado:
  `404` descriptivo. Jugador inexistente: `404` descriptivo. Se utiliza el
  contexto del perfil y la información de error existente para diferenciarlos;
  no se exige agregar códigos o campos nuevos al backend.
- Identificador o fecha inválidos: `400`. Sesión ausente o JWT inválido:
  `401`. Se reutilizan los mecanismos existentes de autenticación y los roles
  INVESTOR y SUPERUSER sin permisos administrativos adicionales.
