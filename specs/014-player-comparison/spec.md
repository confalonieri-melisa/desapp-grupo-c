# Feature Specification: Comparador de jugadores

**Feature Branch**: `feature/014-player-comparison`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Agregar una feature frontend llamada Comparador de jugadores para seleccionar hasta tres jugadores, comparar diferencias relevantes y consultar su evolución histórica de cotización, usando únicamente datos disponibles en el repositorio y sin repetir innecesariamente el catálogo, ranking, ficha individual o historial de cotizaciones."

## Contexto y objetivo

La feature agrega una vista de comparación para un usuario autenticado del
marketplace. Su propósito es permitir una lectura rápida de dos o tres
jugadores seleccionados por el usuario antes de abrir sus fichas o tomar una
decisión de inversión. La comparación debe poner los jugadores lado a lado,
hacer visibles las diferencias relevantes y ofrecer una única visualización
compacta de su evolución de cotización cuando haya datos suficientes.

La imagen de referencia se utiliza solo para composición, jerarquía, densidad,
tratamiento visual y comportamiento esperado. No se toman de ella nombres,
valores, colores de equipos, fechas, scores ni ninguna otra cifra.

### Datos verificados en el repositorio

La especificación se limita a los siguientes datos existentes:

- El catálogo de jugadores expone `id`, `name`, `team`, `league`, `position`,
  `statistics`, `currentQuote` y `totalTokens`.
- El perfil expone la misma identidad y contexto, más fechas de alta y
  actualización.
- El historial de cotizaciones expone `playerId`, `quoteValue`, `unit`,
  `calculatedAt`, `strategyCode`, `strategyVersion` y scores persistidos:
  `individualScore`, `teamScore` cuando existe y `finalScore`.
- El ranking expone identidad y contexto, `finalScore`, `quoteValue`, `unit`
  y `calculatedAt`, respetando el orden y los valores recibidos.
- Las estadísticas del jugador son métricas numéricas opcionales: apariciones,
  minutos jugados, rating, goles, asistencias, tiros, entradas,
  intercepciones, faltas y tarjetas.

La comparación presenta únicamente las métricas definidas en la referencia
visual y disponibles a partir de los contratos existentes. La variación desde
la última cotización no es un campo persistido: se calcula en frontend a partir
de los dos registros históricos más recientes, sin crear ni modificar datos del
mercado. No se muestra disponibilidad de tokens calculada para la comparación
ni un score independiente del registro de cotización seleccionado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seleccionar jugadores para comparar (Priority: P1)

Como usuario autenticado, quiero buscar jugadores y seleccionar hasta tres para
armar una comparación sin tener que recorrer repetidamente el catálogo.

**Why this priority**: Sin una selección controlada no existe la tarea central
de la feature.

**Independent Test**: Abrir la vista, buscar jugadores por nombre parcial,
agregar uno, dos y tres jugadores, quitar uno y comprobar que la selección
vigente se refleja siempre sin duplicados.

**Acceptance Scenarios**:

1. **Given** que no hay jugadores seleccionados, **When** el usuario abre el
   comparador, **Then** ve el buscador, el estado inicial vacío y una indicación
   de que debe seleccionar entre dos y tres jugadores para comparar.
2. **Given** un término de búsqueda, **When** el usuario lo escribe y confirma
   la búsqueda, **Then** ve el conjunto de resultados disponible del catálogo,
   hasta 12 jugadores, sin controles de paginación propios del comparador,
   con nombre, equipo, liga, posición y una acción accesible para agregar cada
   jugador.
3. **Given** un jugador ya seleccionado, **When** aparece nuevamente en los
   resultados, **Then** se identifica como seleccionado y no puede agregarse una
   segunda vez.
4. **Given** tres jugadores seleccionados, **When** el usuario busca otro,
   **Then** puede consultar resultados pero la acción de agregar permanece
   deshabilitada o informa que alcanzó el máximo de tres; los resultados de
   búsqueda no se convierten en una segunda selección ni requieren paginación.
5. **Given** uno o más jugadores seleccionados, **When** el usuario quita uno,
   **Then** desaparece de la selección, se actualiza el contador y queda libre
   un lugar para seleccionar otro.

---

### User Story 2 - Comparar dos o tres jugadores en una vista (Priority: P1)

Como usuario, quiero ver dos o tres jugadores lado a lado con un conjunto corto
de métricas comparables para identificar diferencias sin abrir tres fichas.

**Why this priority**: Es el valor principal de decisión que distingue la
feature de un catálogo, un ranking o una ficha individual.

**Independent Test**: Seleccionar dos jugadores y luego tres, verificar una
matriz con una sola columna por jugador, comparar valores disponibles y quitar
un jugador para comprobar que la vista se adapta.

**Acceptance Scenarios**:

1. **Given** exactamente dos jugadores seleccionados, **When** la selección se
   confirma, **Then** se muestra una matriz comparativa con una columna por
   jugador y filas comunes de comparación.
2. **Given** exactamente tres jugadores seleccionados, **When** la selección se
   confirma, **Then** se muestra la misma estructura con tres columnas, sin
   repetir al jugador en otra tarjeta o ranking paralelo.
3. **Given** jugadores con datos completos o parciales, **When** se muestra una
   fila, **Then** cada valor conserva su unidad y significado; un dato ausente
   se presenta como “No disponible” y no se reemplaza por cero, promedio o
   valor de otro jugador.
4. **Given** jugadores de distintos equipos, ligas o posiciones, **When** se
   presenta la comparación, **Then** esas diferencias de contexto son visibles
   en el encabezado de cada columna, sin inferir que una liga o posición es
   mejor que otra.
5. **Given** una comparación visible, **When** el usuario quita un jugador
   mediante el ícono `X` de su encabezado, **Then** se actualizan contador,
   columnas, filas y gráfico sin dejar datos del jugador retirado.

---

### User Story 3 - Consultar evolución de cotizaciones (Priority: P1)

Como usuario, quiero consultar en un gráfico compacto la evolución histórica de
las cotizaciones de los jugadores seleccionados para complementar la lectura
de sus valores actuales.

**Why this priority**: La dimensión temporal es la diferencia relevante que no
se obtiene de una matriz de atributos actuales, pero debe reutilizar el
historial existente sin transformarlo en otra ficha.

**Independent Test**: Seleccionar jugadores con historiales de cero, uno y
varios registros, verificar los estados correspondientes y comprobar que cada
serie conserva sus fechas y valores.

**Acceptance Scenarios**:

1. **Given** dos o tres jugadores con al menos dos cotizaciones cada uno,
   **When** carga la comparación, **Then** se muestra un gráfico compacto con
   una serie distinguible por jugador, eje temporal, valores en créditos por
   token y una leyenda accesible con los nombres.
2. **Given** un jugador con una sola cotización, **When** se muestra el gráfico,
   **Then** ese jugador no se presenta como una tendencia; se informa que no
   hay suficientes datos históricos para evolución y se conservan los otros
   jugadores que sí pueden graficarse.
3. **Given** un jugador sin cotizaciones históricas, **When** termina la carga,
   **Then** su serie se marca como sin datos y no se dibuja una línea inventada.
4. **Given** historiales recibidos en orden descendente, **When** se construye
   la evolución, **Then** se representan cronológicamente sin cambiar los
   valores, y el conjunto visible se identifica si se limita la cantidad de
   puntos para mantener el gráfico compacto.
5. **Given** historiales con estrategias o versiones informadas, **When** se
   visualizan sus valores, **Then** el contexto se conserva y no se mezclan
   silenciosamente registros incompatibles como si fueran una misma medición.

6. **Given** un jugador con dos cotizaciones históricas, **When** se muestra la
   matriz, **Then** la fila “Variación desde la última cotización” presenta la
   variación porcentual calculada como `((actual - anterior) / anterior) × 100`,
   usando los dos registros más recientes y conservando el signo.
7. **Given** un jugador con menos de dos cotizaciones, **When** se muestra la
   matriz, **Then** la fila de variación indica “No disponible”.

---

### User Story 4 - Entender estados y recuperarse de fallos (Priority: P2)

Como usuario, quiero distinguir selección incompleta, carga, ausencia de datos
 y error para saber qué acción puedo realizar y no confundir un fallo con una
 comparación válida.

**Why this priority**: La vista combina búsquedas y varias consultas; un estado
parcial o tardío puede inducir decisiones equivocadas.

**Independent Test**: Simular carga inicial, búsqueda sin resultados, fallos de
búsqueda, fallo de cotizaciones, sesión vencida y respuestas tardías después de
cambiar la selección.

**Acceptance Scenarios**:

1. **Given** una búsqueda o carga de comparación pendiente, **When** el usuario
   espera resultados, **Then** se anuncia la carga y no se muestra ausencia de
   datos como resultado definitivo.
2. **Given** una búsqueda exitosa sin coincidencias, **When** termina la
   consulta, **Then** se comunica que no hay jugadores para el término y se
   permite modificar o limpiar la búsqueda.
3. **Given** un fallo recuperable, **When** termina la consulta, **Then** se
   muestra un mensaje comprensible y una acción de reintento para el contexto
   vigente.
4. **Given** que falla el historial de un jugador pero existen datos válidos de
   los demás, **When** se muestra la comparación, **Then** la matriz permanece
   disponible y solo la evolución de ese jugador queda en error o sin datos,
   sin inventar una serie.
5. **Given** una sesión ausente o vencida, **When** el usuario abre o consulta
   el comparador, **Then** se retiran los datos protegidos y se aplica el flujo
   de autenticación existente.
6. **Given** una consulta anterior pendiente, **When** cambia el término o la
   selección, **Then** una respuesta tardía no agrega jugadores ni reemplaza
   la comparación vigente.

### Edge Cases

- Se intenta comparar con cero o un jugador: se conserva el estado inicial o
  de selección incompleta; no se muestra una matriz de dos columnas vacía.
- Se intenta superar el máximo de tres: la selección no cambia y el usuario
  recibe una explicación operable.
- Se selecciona un jugador que desaparece del catálogo o no puede cargarse: se
  informa el error de ese jugador, se permite quitarlo y no se muestra otra
  identidad en su lugar.
- Un jugador no tiene alguna estadística o score: se muestra “No disponible”
  en esa celda, conservando ceros válidos como cero.
- Un jugador no tiene cotización actual: la fila correspondiente queda como no
  disponible; no se usa el valor base de `currentQuote` como sustituto de una
  cotización histórica confirmada.
- Los historiales tienen menos de dos registros: no se comunica una tendencia
  ni una variación calculada.
- Las series tienen fechas o cantidades de puntos diferentes: el gráfico no
  rellena fechas faltantes ni alinea valores mediante interpolación.
- Los jugadores tienen unidades o contextos de estrategia incompatibles: se
  conserva la unidad recibida y se muestra el contexto; no se calcula una
  diferencia entre valores que no sean comparables.
- El usuario usa teclado o una pantalla estrecha: los controles siguen siendo
  operables, la matriz puede recorrerse sin perder el encabezado de jugador y
  ningún dato depende exclusivamente del color.

## Requirements *(mandatory)*

### Alcance funcional

La vista debe ser una comparación de selección explícita. No reemplaza el
catálogo, el ranking, el perfil ni el historial detallado. La comparación se
compone de un buscador, una selección persistente mientras la vista permanece
abierta, una matriz de dos o tres columnas y un gráfico compacto de evolución.

### Información útil para comparar

La matriz DEBE mostrar exactamente las siguientes filas, en este orden:

1. Cotización actual.
2. Variación desde la última cotización.
3. Score individual.
4. Score colectivo.
5. Score final.

El encabezado de cada columna DEBE mostrar la identidad mínima necesaria para
reconocer al jugador: imagen disponible o placeholder, nombre, equipo y liga.
La posición no forma parte de la matriz porque no aparece como fila en la
referencia visual.

La fila “Cotización actual” DEBE usar el primer elemento del historial de
cotizaciones confirmado para el jugador, que representa la cotización más
reciente. La fila “Variación desde la última cotización” DEBE calcularse en
frontend con los dos registros más recientes:

`((cotización actual - cotización anterior) / cotización anterior) × 100`.

La variación DEBE conservar su signo, mostrar porcentaje y señalar “No
disponible” cuando no existan al menos dos registros. No se debe calcular una
variación sobre datos faltantes ni sobre valores inventados.

La evolución histórica se presenta únicamente en el gráfico compacto y utiliza
los puntos existentes, sin convertir el historial en filas adicionales.

La interfaz DEBE indicar la fecha de cálculo y la estrategia/versión cuando
sean necesarias para interpretar una cotización o score. Si dos datos no
pertenecen al mismo contexto de cálculo, no se debe sugerir que son una
comparación directa sin explicitar la diferencia.

### Información excluida por redundancia

La matriz NO DEBE repetir:

- filtros, paginación, puesto u orden global del ranking;
- posición, estadísticas deportivas, fechas de alta o actualización del perfil;
- explicación completa de componentes del score, fórmulas, pesos o JSON de una
  cotización;
- fechas de alta y actualización del perfil, salvo que una decisión posterior
  las justifique como dato comparativo;
- historial completo fila por fila, consulta por fecha o detalle expandido de
  cada cotización;
- acciones de compra/venta, saldo, portfolio, transacciones o tenencias;
- filtros de catálogo por liga, equipo o posición dentro de la comparación;
- métricas distintas de las cinco filas definidas para esta comparación;
- una segunda ficha individual o una segunda lista de ranking.

### Functional Requirements

- **FR-001**: El usuario autenticado DEBE poder acceder a una vista identificada
  como “Comparador de jugadores” desde la navegación principal, sin alterar el
  acceso existente al catálogo, ranking, perfil, historial o portfolio.
- **FR-002**: La vista DEBE ofrecer un buscador de jugadores por nombre parcial,
  con confirmación, limpieza, resultados legibles y estados de carga, vacío y
  error. DEBE mostrar hasta 12 resultados del conjunto inicial recibido y NO
  DEBE incorporar paginación propia en esta feature.
- **FR-003**: Cada resultado de búsqueda DEBE mostrar únicamente la identidad y
  contexto necesarios para reconocer al jugador: nombre, equipo, liga y
  posición; DEBE ofrecer agregarlo o informar que ya está seleccionado.
- **FR-004**: El usuario DEBE poder seleccionar como máximo tres jugadores y la
  interfaz DEBE impedir duplicados.
- **FR-005**: El usuario DEBE poder quitar cualquier jugador seleccionado
  mediante un ícono `X` visible en su encabezado. La acción DEBE ser inmediata,
  sin confirmación, y la vista DEBE eliminar sus datos, serie, leyenda y
  acciones sin dejar residuos.
- **FR-006**: La vista DEBE diferenciar estado inicial sin jugadores, estado con
  un jugador y vista de comparación con exactamente dos o tres jugadores.
- **FR-007**: Con dos o tres jugadores, la matriz DEBE tener una sola columna por
  jugador, un encabezado estable por columna y exactamente estas filas, en este
  orden: cotización actual, variación desde la última cotización, score
  individual, score colectivo y score final. Cada jugador DEBE aparecer una
  sola vez en la comparación.
- **FR-008**: La matriz DEBE usar solo datos disponibles en los contratos y la
  implementación existentes. NO DEBE inventar, recalcular, normalizar ni
  sustituir valores ausentes con ceros, promedios o datos de otro jugador.
- **FR-009**: La fila de cotización actual DEBE mostrar el primer registro del
  historial recibido como valor más reciente, con la unidad “créditos por token”.
  Las filas de score DEBEN mostrar los valores persistidos del mismo registro y
  distinguir score individual, score colectivo ausente y score final.
- **FR-010**: La fila de variación DEBE mostrar el porcentaje calculado a partir
  de las dos cotizaciones más recientes, conservando signo y precisión de
  presentación definida para la interfaz. Con menos de dos registros DEBE
  mostrar “No disponible”.
- **FR-011**: La comparación DEBE mostrar un gráfico compacto de evolución con
  una serie identificable por jugador, fechas cronológicas, valores de
  cotización y una leyenda o descripción accesible.
- **FR-012**: Una serie DEBE considerarse suficiente para tendencia solo cuando
  tenga al menos dos cotizaciones existentes. Con cero o una cotización, la
  interfaz DEBE mostrar ausencia de evolución y no dibujar una tendencia.
- **FR-013**: El gráfico DEBE conservar los valores y fechas recibidos; NO DEBE
  interpolar puntos, crear fechas, combinar estrategias sin contexto ni
  convertir créditos por token a otra unidad. La variación de la matriz es la
  única métrica derivada permitida y no modifica el gráfico ni el historial.
- **FR-014**: Si falla el historial de un jugador, la interfaz DEBE mantener
  disponibles los datos válidos de la matriz y representar el fallo en la
  superficie de evolución de ese jugador, con reintento aplicable.
- **FR-015**: La interfaz DEBE distinguir carga, búsqueda sin resultados,
  ausencia de cotizaciones, error recuperable, sesión no válida y selección
  incompleta; ningún error DEBE presentarse como ausencia definitiva.
- **FR-016**: Cambiar búsqueda, agregar, quitar o reemplazar jugadores DEBE
  invalidar la vigencia de respuestas anteriores; una respuesta tardía NO DEBE
  alterar la selección actual ni mostrar datos de otra sesión.
- **FR-017**: El comparador DEBE reutilizar las consultas de lectura existentes
  para catálogo, perfiles y cotizaciones, sin introducir operaciones de compra,
  venta, modificación de cotizaciones o cálculo de valuación.
- **FR-018**: La vista DEBE conservar la autenticación existente. Ante una
  respuesta no autorizada DEBE retirar datos protegidos y continuar el flujo
  vigente de inicio de sesión.
- **FR-019**: Todos los controles, encabezados, celdas, leyendas y estados DEBEN
  ser operables y comprensibles con teclado y tecnologías asistivas, tener foco
  visible, anunciar cambios relevantes y no depender solo del color.
- **FR-020**: La composición DEBE conservar la jerarquía visual de la referencia
  —título, buscador, selección, matriz y gráfico— y seguir siendo legible en
  escritorio y pantallas estrechas, sin exigir que la matriz se convierta en
  tres fichas independientes.

### Key Entities *(include if feature involves data)*

- **Jugador seleccionable**: Jugador existente identificado por `id`, con
  nombre, equipo, liga, posición y estadísticas opcionales provenientes del
  catálogo/perfil.
- **Selección de comparación**: Conjunto ordenado de uno a tres jugadores sin
  duplicados, con acciones de agregar y quitar.
- **Métrica comparativa**: Fila común cuyo valor proviene del contrato
  existente, conserva unidad/semántica y puede estar no disponible para un
  jugador.
- **Cotización comparable**: Valor persistido con unidad, fecha de cálculo,
  estrategia, versión y scores asociados cuando existan.
- **Serie de evolución**: Secuencia de cotizaciones de un jugador usada solo
  para graficar puntos existentes en orden cronológico; no es una nueva
  cotización ni una proyección.
- **Estado de comparación**: Estado observable de selección, búsqueda,
  carga, contenido, ausencia de datos, error o sesión no válida.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100% de las pruebas con dos o tres jugadores, cada jugador
  aparece exactamente una vez en la matriz y todas sus celdas coinciden con los
  datos disponibles en la consulta de origen.
- **SC-002**: En el 100% de las pruebas de selección, el usuario puede pasar de
  cero a dos, de dos a tres y de tres a dos jugadores sin duplicar ni perder
  accidentalmente otro jugador.
- **SC-003**: En el 100% de las pruebas con datos ausentes, la interfaz muestra
  “No disponible”, “Sin datos” o el estado equivalente correspondiente y nunca
  presenta un cero o una tendencia inventada.
- **SC-004**: En el 100% de los historiales con al menos dos registros, el
  gráfico conserva el orden temporal, valores, unidad y pertenencia de cada
  serie; con menos registros no afirma evolución.
- **SC-005**: Al menos el 90% de usuarios de prueba puede encontrar y seleccionar
  dos jugadores y reconocer la diferencia principal entre ellos sin abrir una
  ficha individual adicional.
- **SC-006**: La vista inicial, una comparación de dos jugadores y una de tres
  jugadores alcanzan contenido utilizable en un tiempo percibido de hasta tres
  segundos luego de que las consultas disponibles responden; durante la espera
  se muestra carga explícita.
- **SC-007**: En el 100% de los escenarios de error, vacío, sesión vencida y
  respuesta tardía, la interfaz evita mostrar datos obsoletos como si fueran la
  comparación vigente y ofrece la recuperación que corresponda.
- **SC-008**: En una revisión de teclado y lector de pantalla, el 100% de los
  controles de búsqueda, selección, eliminación, reintento y lectura de estados
  tiene nombre accesible, foco visible y orden operable.

## Assumptions

- El comparador es una funcionalidad de lectura para usuarios autenticados y
  reutiliza el flujo de sesión vigente.
- La selección se conserva mientras el usuario permanece en la vista; no se
  persiste entre sesiones ni se agrega una lista histórica de comparaciones en
  esta entrega.
- La búsqueda utiliza el alcance actual de búsqueda por nombre del catálogo y
  no agrega una búsqueda separada al ranking. El comparador muestra hasta 12
  resultados del conjunto inicial y no ofrece paginación propia.
- El catálogo y las cotizaciones existentes son la autoridad de datos; si un
  dato difiere entre superficies, la futura implementación debe documentar la
  fuente elegida y no combinar silenciosamente registros incompatibles.
- La cotización actual de la matriz se obtiene del primer elemento del
  historial de cotizaciones, que representa el registro más reciente; no se
  utiliza el `currentQuote` del catálogo como sustituto.
- La variación se calcula solo para presentación a partir de las dos
  cotizaciones más recientes y se muestra como porcentaje con signo. No se
  persiste ni se envía al backend.
- El historial completo de un jugador llega ordenado desde la cotización más
  reciente; para graficarlo se lo presenta cronológicamente sin modificar sus
  valores.
- El gráfico puede limitar visualmente la cantidad de puntos para conservar su
  carácter compacto, siempre que se informe el recorte y no se altere el
  significado de los datos.
- La imagen del jugador puede ser el recurso disponible o el placeholder
  estable ya usado por el frontend; la ausencia de una imagen no bloquea la
  comparación.
- La adaptación a pantallas pequeñas puede permitir desplazamiento horizontal
  de la matriz, pero debe mantener nombres y encabezados identificables.

## Out of Scope

- Implementar endpoints nuevos, modificar contratos existentes o cambiar el
  modelo de datos.
- Calcular tendencias futuras, recomendaciones de inversión, mejor jugador o
  diferencias adicionales distintas de la variación porcentual definida para
  la matriz.
- Crear un score comparativo, recalcular score individual/colectivo/final,
  activar estrategias o comparar versiones históricas de valuación.
- Replicar el ranking, sus puestos, filtros, paginación u ordenamiento.
- Replicar una ficha individual, explicación completa del score, historial fila
  por fila o consulta de cotización por fecha.
- Comprar, vender, modificar tenencias, mostrar saldo, portfolio o historial de
  operaciones.
- Persistir comparaciones, compartirlas, exportarlas o agregar favoritos.
- Comparar más de tres jugadores, equipos entre sí o datos externos a los
  contratos verificados.
- Proveer datos de la imagen de referencia o usar sus valores como fixtures de
  negocio.
