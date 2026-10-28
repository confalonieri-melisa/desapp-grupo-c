# Feature Specification: Visualización del portfolio del inversor

**Feature Branch**: `feature/013-user-portfolio-charts` (prevista)

**Integration Base Branch**: `main`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Crear una página «Mi portfolio» para el inversor autenticado con saldo, resumen de tenencias y gráficos de distribución del valor actual y resultado no realizado por jugador. Usar los datos existentes, distinguir positivos, negativos, cero y datos ausentes, ofrecer lectura accesible en móvil, cubrir carga, vacío, error y sesión vencida, y actualizar después de operar. La evolución histórica queda fuera de esta feature."

**Cambio solicitado durante la implementación**: Quitar la distribución de valor del portfolio. Mostrar la evolución histórica de la cotización del token en el perfil `/players/[id]`, usando las cotizaciones que ese perfil ya consulta. Mantener las barras del resultado no realizado en «Mi portfolio» y añadir acceso al perfil para operar. La evolución histórica del patrimonio total sigue fuera de alcance.

## Clarifications

### Session 2026-10-27

- Q: Si falla la actualización del portfolio después de una compra o venta confirmada, ¿qué debería mostrar «Mi portfolio»? → A: Conservar las cifras anteriores con un aviso visible de desactualización y una acción «Reintentar».
- Q: ¿Dónde debe aparecer la evolución del token? → A: En el perfil `/players/[id]`, no en las posiciones del portfolio. Quitar la distribución de valor agregada, conservar las barras del resultado no realizado incluso cuando todos los valores son cero y enlazar ese resultado con el perfil donde se puede vender.
- Q: ¿En qué sector del perfil debe estar la curva? → A: En la tarjeta donde estaba «Información del jugador», junto a «Rendimiento», con ancho compacto; retirarla del bloque ancho de Cotizaciones.
- Q: ¿Cómo debe presentarse la curva? → A: Línea rosa con puntos en cada cotización y sombreado bajo la curva; variación redondeada a cuatro decimales. Quitar las leyendas visibles de fecha y valor; conservar fechas y valores iniciales y finales en la descripción accesible del gráfico.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consultar mi cartera actual (Priority: P1)

Como inversor autenticado, quiero abrir «Mi portfolio» y ver mi saldo y mis tenencias para conocer el estado actual de mi cartera.

**Why this priority**: Es la base de la página y ofrece valor aunque los gráficos se incorporen después.

**Independent Test**: Iniciar sesión con varias posiciones y comparar el saldo y cada posición visible con el estado actual de la cartera.

**Acceptance Scenarios**:

1. **Given** un inversor con posiciones, **When** abre «Mi portfolio» desde la navegación, **Then** ve solo su saldo disponible y sus jugadores, con cantidad de tokens, precio promedio, cotización, valor actual y resultado no realizado cuando estén disponibles.
2. **Given** posiciones con cotización, **When** se presenta el resumen, **Then** el valor de tenencias suma sus valores actuales, el resultado total suma sus resultados no realizados y el patrimonio estimado suma saldo más valor de tenencias; los importes indican créditos.
3. **Given** una cartera sin posiciones, **When** termina la carga, **Then** se ve el saldo, un mensaje de cartera vacía, valor de tenencias y resultado no realizado de cero, y patrimonio estimado igual al saldo.
4. **Given** un jugador sin nombre disponible, **When** se presenta su posición, **Then** se identifica por su identificador y conserva sus métricas.

---

### User Story 2 - Ver la evolución del token por jugador (Priority: P2)

Como inversor, quiero ver en el perfil de un jugador cómo subió o bajó la cotización de su token.

**Why this priority**: Aporta contexto temporal a la cotización actual de cada posición.

**Independent Test**: Usar historiales de cotizaciones que suben, bajan, permanecen estables, tienen un solo registro y están vacíos; verificar curva, fechas, importes y estados.

**Acceptance Scenarios**:

1. **Given** dos o más cotizaciones de un jugador, **When** abro su perfil, **Then** la tarjeta junto a «Rendimiento» muestra una línea ordenada por fecha con puntos y sombreado, la variación a cuatro decimales en texto y las fechas y valores iniciales y finales en la descripción accesible, sin leyendas visibles de fecha y valor.
2. **Given** un solo registro o ninguno, **When** abro su perfil, **Then** se explica que todavía no hay evolución comparable y no se inventa una curva.
3. **Given** un fallo al consultar cotizaciones, **When** veo su perfil, **Then** el perfil mantiene su estado de error y reintento existente; no presenta una curva inventada.
4. **Given** una o más posiciones sin valor disponible, **When** veo el resumen, **Then** el valor de tenencias y el patrimonio estimado se rotulan «parcial» y se indica cuántas posiciones faltan; si existen posiciones pero ninguna tiene valor disponible, se muestran como «no disponible».

---

### User Story 3 - Comparar resultados no realizados (Priority: P2)

Como inversor, quiero distinguir las posiciones con resultado positivo, negativo y nulo para entender cómo se comparan sus cotizaciones actuales con mis precios de compra.

**Why this priority**: Muestra una dimensión diferente del valor actual y evita confundirla con ganancias de ventas completadas.

**Independent Test**: Usar posiciones con resultados positivo, negativo, cero y ausente; verificar signo, importe, etiquetas y total.

**Acceptance Scenarios**:

1. **Given** resultados positivos y negativos, **When** veo el gráfico, **Then** aparecen a lados opuestos de cero y puedo leer jugador, signo e importe sin depender del color.
2. **Given** un resultado cero, **When** veo el gráfico, **Then** se indica «0 créditos» y no se interpreta como ausente.
3. **Given** un resultado no calculable, **When** veo el gráfico, **Then** se identifica como «sin cotización» y se excluye del total.
4. **Given** resultados ausentes en una cartera con posiciones, **When** veo el total, **Then** se rotula «parcial» con cantidad excluida, o «no disponible» si ninguno puede calcularse.
5. **Given** cualquier posición de la comparación, **When** quiero consultar o vender ese jugador, **Then** puedo abrir su perfil desde la misma fila; una ganancia muestra una acción explícita de acceso para vender.
6. **Given** solo resultados cero, **When** veo la comparación, **Then** se conservan el eje cero y las barras de longitud cero junto a importes y accesos legibles.

---

### User Story 4 - Consultar datos vigentes y protegidos (Priority: P2)

Como inversor, quiero que mi página se actualice después de operar y que mis datos desaparezcan al vencer o cambiar la sesión.

**Why this priority**: Evita usar cifras anteriores y protege información financiera personal.

**Independent Test**: Simular carga, fallo recuperable, compra o venta confirmada, vencimiento de sesión y cambio de usuario con consultas pendientes.

**Acceptance Scenarios**:

1. **Given** una consulta pendiente, **When** abro la página, **Then** veo un estado de carga distinto de cartera vacía y no veo datos de una sesión previa.
2. **Given** un fallo de consulta, **When** pulso «Reintentar» y la consulta se recupera, **Then** veo los datos vigentes sin salir de la página.
3. **Given** la página abierta y una compra o venta confirmada, **When** se actualiza la cartera, **Then** saldo, posiciones, totales y comparación de resultados reflejan juntos el nuevo estado; mientras tanto se advierte que las cifras previas están pendientes de actualización.
4. **Given** una compra o venta confirmada y un fallo al actualizar la cartera, **When** termina la consulta, **Then** las cifras anteriores permanecen visibles con aviso de desactualización y una acción «Reintentar»; no se presentan como vigentes.
5. **Given** una sesión vencida o cerrada, **When** se intenta consultar la página, **Then** se retiran los datos y se sigue el flujo existente de inicio de sesión.
6. **Given** una consulta del inversor A pendiente, **When** inicia sesión B, **Then** una respuesta tardía de A no se muestra a B.

### Edge Cases

- Hay una sola posición, muchas posiciones o ninguna; ninguna se oculta silenciosamente.
- El saldo puede ser cero aunque existan posiciones y puede ser positivo con cartera vacía.
- Cotización, valor y resultado ausentes no se sustituyen por cero.
- Si todas las posiciones existentes carecen de cotización, no se dibuja una escala engañosa ni se informa un total conocido de cero.
- Un jugador sin nombre resoluble conserva su posición e identificador.
- Una respuesta antigua no reemplaza datos de una actualización o sesión más reciente.
- Un fallo en la primera carga no muestra cifras; un fallo al actualizar conserva solo las cifras anteriores de la misma sesión, señaladas como desactualizadas.
- En móvil, nombres e importes siguen legibles sin exigir interacción precisa con las barras.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La navegación principal DEBE ofrecer «Mi portfolio» a los inversores autenticados.
- **FR-002**: La página DEBE mostrar solo el portfolio del inversor de la sesión actual y NO DEBE permitir elegir otro usuario.
- **FR-003**: La página DEBE mostrar saldo y cada posición con jugador, cantidad, precio promedio, cotización, valor actual y resultado no realizado cuando existan, con unidades y números comprensibles.
- **FR-004**: Si falta el nombre del jugador, la posición DEBE identificarse por su identificador y conservar sus métricas.
- **FR-005**: El resumen DEBE incluir saldo, valor de tenencias, resultado no realizado total y patrimonio estimado. Los dos agregados de posiciones DEBEN sumar solo datos disponibles; el patrimonio estimado DEBE sumar saldo más valor de tenencias cuando ese valor esté disponible. Si la cartera está vacía, valor de tenencias y resultado no realizado DEBEN ser cero y patrimonio estimado DEBE igualar el saldo.
- **FR-006**: Si faltan datos de posiciones existentes, los totales afectados DEBEN rotularse «parcial» e indicar la cantidad excluida. Si ninguna posición existente tiene el dato requerido, el total afectado DEBE indicarse «no disponible», nunca cero; el saldo conserva su propio valor.
- **FR-007**: El perfil `/players/[id]` DEBE mostrar la evolución de la cotización del token en la tarjeta compacta junto a «Rendimiento», usando el historial que ya consulta. La línea se ordena cronológicamente, marca cada cotización con un punto y lleva sombreado bajo la curva. La variación se muestra en texto con cuatro decimales; las fechas y valores iniciales y finales se incluyen en la descripción accesible del gráfico, sin leyendas visibles. Con menos de dos registros no DEBE dibujar una tendencia inventada; se conserva el error y reintento de cotizaciones existente.
- **FR-008**: El gráfico de resultado no realizado DEBE ubicar positivos y negativos respecto de cero e indicar jugador, signo e importe en texto. DEBE distinguir cero de dato ausente.
- **FR-009**: La evolución por jugador y la comparación de resultados DEBEN poder comprenderse mediante texto, teclado y tecnología asistiva, sin depender solo de color o interacción con las marcas, y ser legibles en escritorio y móvil.
- **FR-014**: La comparación de resultados DEBE enlazar cada jugador con su perfil. Si hay una ganancia, DEBE ofrecer una acción explícita para acceder al perfil y vender; si todos los resultados son cero, DEBE conservar el eje y los carriles de barras con importes textuales.
- **FR-010**: La página DEBE distinguir carga inicial, cartera vacía, contenido, actualización en curso, error recuperable y sesión ausente o vencida. Un fallo inicial DEBE mostrar error sin cifras. Un fallo al actualizar DEBE conservar las cifras anteriores de la misma sesión con aviso visible de desactualización. Ambos errores DEBEN permitir reintentar.
- **FR-011**: Al abrir la página y tras una compra o venta confirmada mientras permanezca abierta, la vista DEBE actualizar coherentemente saldo, posiciones, resumen y comparación de resultados con el estado vigente. Durante la actualización DEBE señalar que las cifras anteriores pueden estar desactualizadas. El perfil mantiene su consulta de cotizaciones independiente.
- **FR-012**: Al cerrar, vencer o cambiar la sesión, la página DEBE retirar datos protegidos e ignorar respuestas pendientes de otra sesión.
- **FR-013**: La página DEBE ser de solo lectura. Quedan fuera las operaciones desde esta vista, la evolución histórica del patrimonio, las ganancias realizadas, las recomendaciones y la exportación.

### Key Entities *(include if feature involves data)*

- **Portfolio del inversor**: estado actual de la cartera de la persona autenticada, con saldo y posiciones.
- **Posición**: tokens poseídos de un jugador, precio promedio de compra, cotización actual y, si están disponibles, valor y resultado no realizado.
- **Jugador**: identidad asociada a una posición, expresada por nombre o identificador.
- **Resumen de cartera**: agregados actuales con estado completo, parcial o no disponible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una evaluación con cinco inversores de prueba, los cinco encuentran «Mi portfolio» e identifican su saldo y la posición de mayor valor en menos de 60 segundos.
- **SC-002**: En carteras de prueba con valores positivos, negativos, cero y ausentes, el 100 % de las posiciones se identifica correctamente por jugador y estado tanto visualmente como mediante texto.
- **SC-003**: En carteras con cotizaciones ausentes, el 100 % de los totales afectados se rotula parcial o no disponible según corresponda, sin presentar valores ausentes como cero.
- **SC-004**: En pruebas de compra, venta y cambio de sesión, el 100 % de las vistas finales refleja la cartera confirmada de la sesión vigente, sin mostrar datos de otra persona.
- **SC-005**: En una pantalla de 320 píxeles de ancho, todos los nombres, importes, fechas, accesos y estados de la evolución y de los resultados pueden leerse sin pérdida de contenido ni interacción con el cursor.

## Assumptions

- El público de esta página es el rol inversor; el comportamiento del administrador fuera de las vistas existentes queda fuera de alcance.
- Se reutilizan la autenticación, el portfolio, los datos de jugadores y la notificación de actualización de cartera existentes.
- El resultado no realizado conserva el significado del portfolio existente; las ventas completadas no forman parte de él.
- «Patrimonio estimado» es saldo más valor actual de tenencias; no representa ganancia ni rendimiento.
- La evolución de cada token utiliza el historial de cotizaciones existente. La evolución temporal del patrimonio total requiere datos históricos adicionales y corresponde a otra feature.
