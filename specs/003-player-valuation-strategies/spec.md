# Especificación: Estrategias de Valuación y Cotización de Jugadores

**Feature Branch**: `valuation-strategies`

**Created**: 2026-10-20

**Status**: Draft — requiere aprobación de decisiones de negocio

**Input**: User description: "Implementar un sistema de estrategias de valuación y cálculo de cotizaciones de jugadores con una estrategia de rendimiento individual y otra de rendimiento individual más contexto persistido del equipo."

## Contexto y límites

Esta feature agrega el cálculo explicable y versionado de cotizaciones sobre los
datos ya persistidos por las integraciones existentes:

- **WhoScored** es la única fuente de estadísticas individuales.
- **football-data.org** es la única fuente de contexto colectivo.
- La segunda estrategia consume la última versión válida persistida de
  `competition_context_updates`, `team_competition_standings` y
  `team_source_links`; no consulta el proveedor durante el cálculo.

El alcance incluye dos estrategias configurables, una versión activa global,
una operación administrativa para seleccionarla, recálculo bajo demanda y un
historial inmutable de cotizaciones. La selección se realiza sobre las dos
estrategias conocidas por la aplicación y persiste su configuración/versionado;
no se agrega un CRUD HTTP genérico. No incluye consulta de cotización a una
fecha, compra/venta de tokens, historial de operaciones, ranking, dashboard ni
procesamiento asíncrono/scheduler.

## User Scenarios & Testing

### User Story 1 - Calcular el valor por rendimiento individual (Priority: P1)

Como operador del marketplace, quiero calcular una cotización a partir
exclusivamente de las estadísticas individuales de WhoScored, para representar
el rendimiento deportivo propio del jugador sin introducir posición, puntos o
resultados del equipo como métricas de rendimiento.

**Why this priority**: Es la valuación mínima y permite comparar jugadores aun
cuando no exista contexto colectivo sincronizado.

**Independent Test**: Dado el mismo jugador y las mismas estadísticas, el
resultado es idéntico aunque se cambien los puntos, la posición en la tabla o
el resultado del equipo; el detalle identifica todas las contribuciones
individuales.

**Acceptance Scenarios**:

1. **Given** un jugador con estadísticas completas de WhoScored y una versión
   activa de la estrategia individual, **When** se calcula su cotización,
   **Then** el resultado contiene `individualScore`, `finalScore`, valor,
   estrategia y versión, y no contiene componente colectivo.
2. **Given** dos entradas iguales de estadísticas individuales para jugadores
   con equipos distintos, **When** se aplica la estrategia individual,
   **Then** sus scores son iguales salvo por una configuración de pesos
   explícitamente dependiente de la posición.
3. **Given** una estadística negativa como faltas o tarjetas, **When** se
   normaliza, **Then** su contribución reduce el score en lugar de aumentarlo.

### User Story 2 - Calcular el valor individual ajustado por contexto del equipo (Priority: P1)

Como operador del marketplace, quiero calcular una cotización híbrida que parta
del rendimiento individual de WhoScored y agregue un ajuste acotado del equipo
tomado de la última sincronización válida de football-data.org.

**Why this priority**: Permite evaluar el contexto competitivo sin reemplazar
el mérito individual ni mezclar fuentes.

**Independent Test**: Con estadísticas individuales constantes, variar solo la
posición/puntos/partidos/diferencia de gol del equipo modifica únicamente
`teamScore` y el ajuste colectivo; el detalle permite sumar por separado la
parte individual y la parte del equipo.

**Acceptance Scenarios**:

1. **Given** un jugador vinculado a un equipo y un contexto colectivo válido,
   **When** se calcula la estrategia híbrida, **Then** el resultado conserva el
   `individualScore`, calcula un `teamScore` separado y combina ambos con un
   peso individual estrictamente mayor que el peso colectivo.
2. **Given** dos jugadores con el mismo rendimiento individual en equipos con
   distinto contexto persistido, **When** se calcula la estrategia híbrida,
   **Then** sus `teamScore` pueden diferir y la diferencia final queda limitada
   por el peso colectivo configurado.
3. **Given** que no existe asociación `team_source_links` o no hay una versión
   válida publicada para la temporada vigente del market, **When** se calcula la
   estrategia híbrida, **Then** no se inventa contexto, se aplica la política
   aprobada para datos faltantes y el detalle informa la ausencia.
4. **Given** un snapshot de football-data.org que contenga goleadores,
   asistencias, ratings o eventos, **When** se calcula el contexto, **Then**
   ninguno de esos campos participa del `teamScore`.

### User Story 3 - Administrar estrategias versionadas y trazabilidad (Priority: P1)

Como administrador, quiero activar una versión concreta de una estrategia y
conservar su configuración junto con cada cotización, para reproducir y
explicar cualquier resultado histórico.

**Why this priority**: Sin versionado no es posible auditar una presentación
académica ni distinguir recalculaciones producidas por cambios de fórmula.

**Independent Test**: Crear una nueva versión sin modificar la anterior,
activarla y recalcular; las cotizaciones previas mantienen exactamente la
estrategia, versión, pesos y parámetros utilizados al momento de cálculo.

**Acceptance Scenarios**:

1. **Given** una estrategia con una versión activa, **When** un administrador
   publica una nueva versión, **Then** la versión anterior permanece inmutable y
   solo una versión queda activa para el alcance configurado.
2. **Given** una cotización histórica, **When** se consulta su registro interno
   o se presenta su explicación, **Then** se puede identificar estrategia,
   versión, pesos, límites de normalización, fuentes, scores, valor y fecha.
3. **Given** un recálculo bajo demanda, **When** termina exitosamente, **Then**
   se genera una nueva cotización histórica por jugador y no se sobrescribe la
   cotización anterior.

### User Story 4 - Manejar datos incompletos de forma explícita (Priority: P2)

Como operador, quiero que los datos faltantes no generen scores engañosos ni
fallos silenciosos.

**Independent Test**: Ejecutar cálculos con cada métrica individual ausente,
con todas ausentes, sin equipo asociado y sin contexto vigente, verificando el
estado y el motivo registrado.

**Acceptance Scenarios**:

1. **Given** que falta una métrica individual no obligatoria, **When** se
   calcula, **Then** la métrica no se imputa como cero sin una regla aprobada,
   se excluye de la suma y se renormalizan los pesos disponibles.
2. **Given** que faltan todas las métricas individuales requeridas, **When** se
   solicita una cotización, **Then** el jugador queda sin cotización calculada
   y el recálculo informa un error de datos insuficientes.
3. **Given** que falta el contexto colectivo en la estrategia híbrida, **When**
   se calcula, **Then** se aplica una única política configurable
   (`REJECT` o `INDIVIDUAL_ONLY`) y el resultado deja constancia de ella.

## Edge Cases

- Una métrica tiene un valor `NaN`, infinito, negativo cuando no corresponde o
  una unidad distinta a la esperada: el registro se rechaza para ese cálculo y
  se informa el campo.
- El denominador de una normalización es cero porque todos los jugadores tienen
  el mismo valor: la métrica debe producir un valor neutro definido por la
  versión, no dividir por cero.
- `Position.UNKNOWN` no puede seleccionar pesos específicos; debe usar los pesos
  generales o quedar rechazado según la configuración.
- Un jugador cambia de equipo entre sincronizaciones: el cálculo debe usar la
  asociación correspondiente a la temporada/contexto seleccionados y no la de
  otra temporada.
- Un equipo no aparece en el contexto publicado, la asociación es ambigua o
  hay más de una versión válida candidata: no se asigna contexto por nombre
  aproximado.
- Repetir el mismo recálculo no elimina ni actualiza cotizaciones históricas.
- Cambiar la estrategia activa no recalcula automáticamente cotizaciones.
- Una cotización calculada con estrategia individual no debe almacenar ni
  derivar `teamScore`.
- Un recálculo parcialmente fallido debe dejar visibles los errores por jugador
  y no marcar como completa una ejecución que no cumplió su política de éxito.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE implementar como mínimo las estrategias
  `INDIVIDUAL_PERFORMANCE` y `INDIVIDUAL_PLUS_TEAM_CONTEXT`.
- **FR-002**: La estrategia individual DEBE leer estadísticas individuales
  únicamente del registro persistido de WhoScored y NO DEBE leer posición,
  puntos, partidos jugados, diferencia de gol ni resultados del equipo como
  métricas de score. La posición solo puede seleccionar pesos diferenciados.
- **FR-003**: La estrategia híbrida DEBE reutilizar el cálculo individual de
  WhoScored y agregar un `teamScore` calculado únicamente con la última versión
  válida persistida de football-data.org.
- **FR-004**: El `teamScore` DEBE limitarse a los campos colectivos permitidos:
  posición del equipo, puntos, partidos jugados y diferencia de gol cuando la
  versión de la estrategia la habilite. La primera versión DEBE incluir los
  cuatro campos. No puede usar goleadores, asistencias, ratings, alineaciones,
  fixtures, eventos ni estadísticas individuales.
- **FR-005**: Cada métrica DEBE declarar en la configuración si es positiva o
  negativa, su función de normalización, límites/referencia, peso general y
  pesos opcionales por posición. Cuando la posición sea `UNKNOWN` o no exista
  un override para esa posición, DEBE utilizarse el peso general.
- **FR-006**: La normalización DEBE producir valores en `[0, 1]`, ser
  determinista para el mismo dataset/configuración y evitar división por cero.
  La primera versión DEBE usar el percentil 5 como `lower` y el percentil 95
  como `upper`, calculados por liga-temporada-posición, y aplicar clipping al
  rango `[0, 1]`. La fórmula es:
  `positive = clamp((x - lower)/(upper - lower), 0, 1)` y
  `negative = 1 - clamp((x - lower)/(upper - lower), 0, 1)`.
  Los valores de `lower` y `upper` DEBEN formar parte de la versión; no se
  permiten límites implícitos no trazables. Los valores por debajo de P5 se
  tratan como `0` y los superiores a P95 como `1`.
- **FR-007**: La especificación de cada versión DEBE indicar la población de
  referencia para `lower`/`upper` y la política ante métricas faltantes. La
  primera versión DEBE usar percentiles por combinación
  liga-temporada-posición, con la población y sus límites congelados dentro de
  la versión para conservar la reproducibilidad histórica.
- **FR-008**: El score individual DEBE ser una media ponderada de métricas
  normalizadas disponibles, excluyendo métricas faltantes y renormalizando los
  pesos disponibles, con pesos no negativos y suma efectiva mayor que cero:
  `individualScore = Σ(weight_i * normalized_i) / Σ(weight_i)`.
  Si no queda ninguna métrica válida, la cotización DEBE rechazarse por datos
  insuficientes.
- **FR-009**: El score colectivo DEBE ser una media ponderada de sus métricas
  normalizadas, con la misma trazabilidad de pesos y límites:
  `teamScore = Σ(teamWeight_i * teamNormalized_i) / Σ(teamWeight_i)`.
- **FR-010**: La estrategia híbrida DEBE combinar ambos scores con:
  `finalScore = individualShare * individualScore + teamShare * teamScore`,
  donde ambas participaciones suman `1` e `individualShare > teamShare`. La
  primera versión DEBE usar `individualShare = 0.75` y
  `teamShare = 0.25`; estos valores forman parte de la configuración
  inmutable de la versión.
- **FR-011**: La transformación de score a cotización DEBE estar definida en la
  versión utilizada y ser reproducible. La primera versión DEBE usar:
  `quoteValue = 1 + 99 * finalScore`, en créditos por token, con límite mínimo
  de `1`, máximo de `100` y redondeo a dos decimales. La política de
  cotización inicial `t0 = 1 crédito` DEBE conservarse como registro base
  separado, sin reinterpretar una cotización histórica.
- **FR-012**: El sistema DEBE permitir configurar y versionar pesos generales,
  pesos por posición, métricas positivas/negativas, límites de normalización,
  participación individual/colectiva, fórmula de cotización y política de
  faltantes. Una versión publicada es inmutable.
- **FR-013**: El sistema DEBE permitir seleccionar una única estrategia y
  versión activa global para nuevos recálculos, mediante una operación
  administrativa auditable sobre las dos estrategias conocidas. Activar una
  versión no modifica cotizaciones existentes.
- **FR-014**: El sistema DEBE ofrecer un recálculo bajo demanda para todos los
  jugadores elegibles del market vigente, usando una única versión activa
  capturada al inicio de la ejecución y la temporada vigente configurada por la
  aplicación.
- **FR-015**: Cada cotización DEBE persistir como mínimo jugador, estrategia,
  versión, score individual, score colectivo cuando corresponda, score final,
  valor calculado, moneda/unidad de valor y fecha de cálculo.
- **FR-016**: Cada cotización DEBE conservar una explicación reproducible que
  incluya pesos efectivos, métricas normalizadas, contribuciones por métrica,
  límites utilizados, fuente de cada dato, identificador de la versión de
  contexto colectivo cuando corresponda y política de faltantes aplicada.
- **FR-017**: La estrategia híbrida DEBE rechazar o degradar según una política
  explícita cuando falte contexto. La primera versión DEBE aplicar
  `INDIVIDUAL_ONLY`: calcular el valor usando el score individual, dejar
  `teamScore` ausente e informar la degradación en la explicación. No puede
  consultar football-data.org en tiempo de cálculo ni sustituir el contexto
  faltante por datos de WhoScored o por una temporada distinta.
- **FR-018**: El sistema DEBE generar historial append-only. Un recálculo
  posterior, una nueva versión o un cambio de contexto genera nuevos registros
  y no actualiza registros históricos.
- **FR-019**: El recálculo DEBE informar estado por ejecución y por jugador,
  incluyendo cantidad calculada, cantidad rechazada y motivos. Los errores no
  deben transformarse en cotizaciones con valores por defecto silenciosos. La
  primera versión DEBE publicar las cotizaciones válidas aunque fallen algunos
  jugadores, marcar la ejecución como `PARTIAL` y conservar el detalle de cada
  error por jugador.
- **FR-020**: Las entradas de administración DEBEN validar pesos, sumas,
  límites, métricas permitidas, posiciones, fórmula y política de faltantes
  antes de publicar una versión.
- **FR-021**: La implementación DEBE probar que las estrategias son distintas:
  con iguales datos individuales y distinto contexto, la estrategia individual
  mantiene el score y la híbrida puede cambiarlo; con igual contexto y distinto
  rendimiento, ambas reflejan el cambio individual.
- **FR-022**: Quedan fuera de esta feature la consulta histórica por fecha,
  rankings, operaciones de tokens, portfolio, dashboard, scheduler,
  procesamiento asíncrono y cualquier nueva fuente de datos.

### Key Entities

- **ValuationStrategyVersion**: Versión inmutable de fórmula y configuración:
  métricas, polaridad, pesos, pesos por posición, límites, población de
  referencia, shares, conversión monetaria, redondeo y política de faltantes.
- **PlayerQuote**: Registro histórico inmutable de la cotización y sus scores.
- **QuoteExplanation**: Detalle reproducible de contribuciones, datos fuente,
  normalizaciones, contexto utilizado y decisiones de faltantes.

## Fórmulas y configuración propuesta para validar

La siguiente configuración es una **propuesta de análisis**, no una decisión
definitiva hasta completar `research`, `clarify` y `plan`:

| Área | Propuesta a evaluar | Motivo |
|---|---|---|
| Métricas individuales | `appearances`, `minutesPlayed`, `rating`, `goals`, `assists`, `shotsPerGame`, `tacklesPerGame`, `interceptionsPerGame`, `foulsPerGame`, `yellowCards`, `redCards` | Coincide con el contrato actual de WhoScored y evita inventar métricas no persistidas. |
| Positivas | Apariciones, minutos, rating, goles, asistencias, tiros, tackles e intercepciones | Representan participación o acciones deportivas favorables según el contexto de posición. |
| Negativas | Faltas, amarillas y rojas | Penalizan indisciplina; la penalización exacta requiere calibración. |
| Contexto | Posición, puntos, partidos jugados y diferencia de gol | Coincide con el contexto persistido aprobado para la primera versión y evita estadísticas individuales duplicadas. |
| Normalización | Percentiles versionados por liga-temporada-posición, con población y límites congelados en cada versión | Reduce la distorsión entre posiciones y temporadas y fue aprobado para la primera versión. |
| Mezcla híbrida | `individualShare = 0.75` y `teamShare = 0.25` | Garantiza que el equipo sea un ajuste y no reemplace al jugador; fue aprobado para la primera versión. |
| Cotización | `1 + 99 * score`, rango de 1 a 100 créditos y 2 decimales | Es explicable y conserva el valor base de 1 crédito en `t0`; fue aprobado para la primera versión. |

## Decisions Resolved

Las siguientes decisiones de negocio fueron aprobadas para la primera versión:

1. **Atomicidad del recálculo**: la primera versión utiliza
   publicación parcial: los resultados válidos se conservan, la ejecución se
   marca `PARTIAL` y los fallos se registran por jugador.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Para un fixture determinista, el 100% de los cálculos reproduce
  los mismos scores y valor cuando se reutilizan la misma versión y fuentes.
- **SC-002**: La estrategia individual no cambia al alterar exclusivamente
  posición en tabla, puntos, partidos jugados o diferencia de gol del equipo.
- **SC-003**: La estrategia híbrida conserva un `individualScore` idéntico al
  de la estrategia individual y explica por separado el `teamScore` y su
  contribución.
- **SC-004**: El peso efectivo del rendimiento individual es estrictamente
  mayor que el colectivo en toda versión híbrida publicable.
- **SC-005**: El 100% de las cotizaciones históricas contiene estrategia,
  versión, score individual, score final, valor y fecha; las híbridas contienen
  además score colectivo y versión de contexto cuando se utilizó.
- **SC-006**: Cambiar o activar una versión nueva no altera ningún registro
  histórico existente.
- **SC-007**: Los tests cubren métricas positivas y negativas, posiciones,
  valores límite, métrica ausente, contexto ausente, asociación ambigua,
  idempotencia del recálculo y separación de fuentes.
- **SC-008**: Ningún cálculo realiza una solicitud de red a WhoScored o
  football-data.org; ambos resultados provienen de datos persistidos.

## Assumptions

- La integración WhoScored continuará almacenando como mínimo las métricas
  declaradas en `SCRAPED_PLAYER_STATISTICS`.
- El dataset de `players` corresponde a la única temporada vigente del market;
  esa temporada se configura en la aplicación y debe coincidir con el contexto
  publicado de football-data.org.
- La feature de contexto colectivo conservará una única actualización válida
  consultable para la temporada vigente configurada y sus asociaciones de
  equipos.
- Los identificadores de jugador y equipo persistidos son suficientes para
  vincular las fuentes; un nombre ambiguo no se resuelve por aproximación.
- La administración de estrategias y el recálculo estarán protegidos por el
  mecanismo de autorización existente, con permisos administrativos para
  publicar versiones, activar estrategias y solicitar recálculos.
- Las fórmulas se ejecutarán con aritmética determinista y precisión explícita;
  no se usará redondeo intermedio que impida reproducir la explicación.
