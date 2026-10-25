# Feature Specification: Ranking de Jugadores por Valuación Activa

**Feature Branch**: `feature/007-player-ranking`

**Integration Base Branch**: `feature/006-operation-history`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Necesitamos implementar un ranking de jugadores basado en la estrategia de valuación activa. Partir de la rama 006-operation-history."

## Alcance MVP

Esta feature agrega una consulta autenticada y de solo lectura para obtener un
ranking de jugadores ordenado por el score de la única versión activa de la
estrategia de valuación.

- La estrategia y versión activa se leen de `valuation_strategy_versions`.
- Cada jugador se representa con su última cotización persistida asociada a
  esa versión activa.
- La consulta no recalcula scores, cotizaciones ni estadísticas y no consume
  proveedores externos.
- La consulta requiere un JWT válido, en consistencia con las consultas
  existentes del catálogo y de cotizaciones.
- Los jugadores sin una cotización persistida para la versión activa quedan
  fuera del ranking; no se inventan valores ni se mezclan cotizaciones de
  versiones anteriores.
- Se admiten filtros de catálogo por liga, equipo y posición, además de
  paginación mediante `page` y `limit`.
- El orden es determinista: `finalScore` descendente, `quoteValue`
  descendente, nombre ascendente e `id` ascendente.

## User Scenarios & Testing

### User Story 1 - Consultar el ranking activo (Priority: P1)

Como usuario del marketplace, quiero consultar los jugadores ordenados por su
performance según la estrategia de valuación activa para comparar sus
cotizaciones de forma consistente.

**Why this priority**: El ranking es la vista comparativa principal del
mercado y debe reflejar exactamente la estrategia que el sistema tiene activa.

**Independent Test**: Con una estrategia activa y cotizaciones persistidas para
varios jugadores, una solicitud a `GET /api/players/ranking` devuelve los
jugadores ordenados por `finalScore`, junto con la estrategia, versión y
cotización utilizada.

**Acceptance Scenarios**:

1. **Given** una versión activa y jugadores con cotizaciones de esa versión,
   **When** se solicita el ranking, **Then** responde `200` con los jugadores
   ordenados de mayor a menor `finalScore`.
2. **Given** un jugador con varias cotizaciones de la versión activa,
   **When** se consulta el ranking, **Then** se utiliza la más reciente por
   `calculatedAt` y, ante empate, por `id` descendente.
3. **Given** cotizaciones históricas de versiones inactivas,
   **When** se consulta el ranking, **Then** ninguna cotización de una versión
   inactiva participa del resultado.
4. **Given** que no existe una cotización de la versión activa para un jugador,
   **When** se consulta el ranking, **Then** ese jugador no aparece y no se le
   asigna una cotización calculada por defecto.
5. **Given** una solicitud sin JWT válido, **When** se consulta el ranking,
   **Then** responde `401 Unauthorized` y no expone resultados.

---

### User Story 2 - Filtrar y paginar el ranking (Priority: P1)

Como usuario, quiero filtrar el ranking por liga, equipo o posición y paginar
los resultados para encontrar jugadores relevantes sin descargar todo el
catálogo.

**Why this priority**: El catálogo cubre las cinco ligas y puede contener más
jugadores de los que una respuesta razonable debe devolver.

**Independent Test**: Con jugadores de distintas ligas, equipos y posiciones,
se ejecutan consultas combinando filtros y páginas y se verifica que el orden
global se mantiene dentro del subconjunto filtrado.

**Acceptance Scenarios**:

1. **Given** jugadores de varias ligas, **When** se envía `league`, **Then** la
   respuesta contiene solo jugadores de esa liga.
2. **Given** equipos con nombres coincidentes parcialmente,
   **When** se envía `team`, **Then** el filtro se aplica sin distinguir
   mayúsculas/minúsculas y quitando espacios externos.
3. **Given** más resultados que el límite solicitado, **When** se solicita una
   página posterior, **Then** devuelve solo el segmento correspondiente y los
   rangos de paginación son consistentes.
4. **Given** parámetros inválidos o fuera de rango, **When** se solicita el
   ranking, **Then** responde `400 Bad Request` sin consultar el repositorio de
   ranking.

---

### User Story 3 - Manejar estados de valuación sin datos ficticios (Priority: P1)

Como consumidor de la API, quiero distinguir un sistema sin estrategia activa
de un ranking vacío para no tomar decisiones con datos incompletos o
inventados.

**Why this priority**: Una cotización solo es interpretable junto con la
estrategia/version que la produjo.

**Independent Test**: Se prueban una base sin estrategia activa, una base con
estrategia activa sin cotizaciones y una base con cotizaciones de otra versión,
verificando códigos y respuestas diferentes.

**Acceptance Scenarios**:

1. **Given** que no hay una estrategia activa, **When** se solicita el ranking,
   **Then** responde `409 Conflict` y no devuelve resultados parciales.
2. **Given** una estrategia activa pero ningún jugador con cotización de esa
   versión, **When** se solicita el ranking, **Then** responde `200` con
   `items: []` y paginación válida.
3. **Given** que la estrategia activa cambia después de cotizaciones
   anteriores, **When** se solicita el ranking, **Then** el resultado usa solo
   la nueva versión activa y excluye cotizaciones de la versión anterior.

## Edge Cases

- Los empates completos se resuelven con `name ASC` y luego `id ASC`, de modo
  que dos solicitudes con el mismo estado producen el mismo orden.
- Si existen varias cotizaciones de un jugador para la misma versión, solo se
  incluye la más reciente; no se duplica el jugador.
- Los scores deben permanecer en `[0, 1]` y las cotizaciones en `[1, 100]`, tal
  como exige el modelo de valuación existente.
- `page` por debajo de `1`, `limit` por debajo de `1` o por encima de `100`, y
  filtros de liga/posición no reconocidos deben responder `400`.
- Un equipo vacío después de normalizar espacios debe responder `400`; un
  equipo válido sin coincidencias responde `200` con una colección vacía.
- La consulta no debe fallar si un jugador del catálogo no tiene cotización;
  simplemente se omite del ranking.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE exponer `GET /api/players/ranking` como consulta
  de ranking de jugadores.
- **FR-002**: El endpoint DEBE leer una única versión activa global de
  `valuation_strategy_versions` al comenzar la consulta y DEBE incluir su
  `strategyCode` y `strategyVersion` en la respuesta.
- **FR-003**: Cada jugador del ranking DEBE utilizar la última cotización
  persistida cuyo `strategyVersionId` corresponda a la versión activa capturada.
- **FR-004**: El sistema NO DEBE recalcular scores, cotizaciones o estadísticas
  durante la consulta del ranking.
- **FR-005**: El sistema NO DEBE usar cotizaciones de versiones inactivas ni
  asignar cotizaciones por defecto a jugadores sin datos de la versión activa.
- **FR-006**: La respuesta DEBE incluir, como mínimo, `rank`, `player` con
  `id`, `name`, `team`, `league` y `position`, `finalScore`, `quoteValue`,
  `unit` y `calculatedAt`. No DEBE incluir `individualScore`, `teamScore` ni
  la explicación detallada de la valuación en este MVP.
- **FR-007**: El resultado DEBE ordenarse por `finalScore DESC`,
  `quoteValue DESC`, `player.name ASC` y `player.id ASC`.
- **FR-008**: El campo `rank` DEBE ser global respecto del conjunto filtrado y
  paginado, comenzando en `1` para el primer resultado.
- **FR-009**: El endpoint DEBE aceptar `league`, `team`, `position`, `page` y
  `limit`. `page` DEBE ser `1` por defecto; `limit` DEBE ser `20` por defecto y
  no DEBE superar `100`.
- **FR-010**: El filtro `team` DEBE normalizar espacios externos y aplicar una
  coincidencia parcial sin distinguir mayúsculas/minúsculas, consistente con
  el catálogo existente.
- **FR-011**: La respuesta `200` DEBE incluir `items`, `strategyCode`,
  `strategyVersion` y `pagination` con `total`, `page`, `limit` y `totalPages`.
- **FR-011a**: Cuando `total` sea `0`, `totalPages` DEBE ser `0`; cuando
  `total` sea mayor que `0`, DEBE calcularse como `ceil(total / limit)`.
- **FR-012**: El sistema DEBE responder `200` con `items: []` cuando no haya
  jugadores rankeables para los filtros solicitados.
- **FR-013**: El sistema DEBE responder `409 Conflict` cuando no exista una
  estrategia activa.
- **FR-014**: El sistema DEBE responder `400 Bad Request` ante parámetros
  inválidos o desconocidos, sin ejecutar una consulta de ranking con esos
  valores.
- **FR-015**: La consulta DEBE requerir un JWT válido mediante
  `Authorization: Bearer <JWT>` y DEBE ser estrictamente de solo lectura.
- **FR-016**: La consulta NO DEBE modificar jugadores, cotizaciones,
  estrategias, estadísticas ni registros de auditoría.
- **FR-017**: El contrato del endpoint, sus parámetros, respuesta y errores
  DEBE documentarse en OpenAPI/Swagger.

### Contrato de API

#### `GET /api/players/ranking?league=PREMIER_LEAGUE&team=Arsenal&position=FORWARD&page=1&limit=20`

Header requerido:

```http
Authorization: Bearer <JWT>
```

Respuesta `200`:

```json
{
  "strategyCode": "INDIVIDUAL_PERFORMANCE",
  "strategyVersion": "1.0.0",
  "items": [
    {
      "rank": 1,
      "player": {
        "id": "uuid",
        "name": "Player One",
        "team": "Arsenal",
        "league": "PREMIER_LEAGUE",
        "position": "FORWARD"
      },
      "finalScore": 0.87,
      "quoteValue": 87.13,
      "unit": "CREDIT_PER_TOKEN",
      "calculatedAt": "2026-10-24T15:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

Errores esperados:

- `400 Bad Request`: filtros, `page`, `limit` inválidos o parámetros no
  contemplados.
- `401 Unauthorized`: JWT ausente, inválido o expirado.
- `409 Conflict`: no existe estrategia activa.
- `500 Internal Server Error`: error inesperado sin exponer SQL, credenciales
  ni detalles de persistencia.

## Key Entities

- **ActiveValuationVersion**: versión global de estrategia marcada como activa;
  define qué cotizaciones pueden participar del ranking.
- **PlayerRankingEntry**: proyección de lectura que combina la identidad
  pública del jugador con su última cotización de la versión activa.
- **PlayerQuoteSnapshot**: cotización histórica persistida, incluyendo score,
  valor, unidad, fecha, estrategia y versión de cálculo.
- **RankingPagination**: metadatos de página y cantidad total del conjunto
  filtrado.

## Persistencia y consistencia

- La consulta debe reutilizar las tablas `players`, `player_quotes` y
  `valuation_strategy_versions` existentes y sus repositorios/capas de
  servicio.
- La asociación con la estrategia activa debe resolverse por
  `strategy_version_id`, no solo por el código textual de la estrategia.
- Para obtener una sola cotización por jugador, se debe seleccionar la más
  reciente por `calculated_at DESC, id DESC` antes de aplicar el orden y la
  paginación del ranking.
- El orden del ranking y el cálculo de `total` deben aplicarse sobre el
  conjunto ya filtrado y deduplicado.
- El endpoint debe leer una única estrategia/versión activa antes de consultar
  el ranking y filtrar toda la consulta por el `strategyVersionId` capturado;
  no debe mezclar versiones si la configuración cambia mientras se atiende la
  solicitud. No se requiere una transacción con aislamiento especial para este
  MVP.
- No se requiere una tabla nueva ni una migración para esta feature, salvo que
  la implementación descubra una carencia concreta del esquema vigente.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de los elementos de una respuesta pertenece a la versión
  activa informada en los metadatos de esa misma respuesta.
- **SC-002**: El 100% de los jugadores aparece como máximo una vez y respeta el
  orden determinista definido para empates.
- **SC-003**: El 100% de las consultas no modifica datos persistidos ni ejecuta
  cálculos de valuación o llamadas externas.
- **SC-004**: El 100% de las consultas sin estrategia activa responde `409` y no
  devuelve un ranking parcial.
- **SC-005**: El 100% de los casos sin cotizaciones compatibles responde `200`
  con una colección vacía y metadatos de paginación válidos.
- **SC-006**: Los tests cubren ordenamiento, desempates, deduplicación,
  selección de versión activa, exclusión de jugadores sin cotización, filtros,
  paginación, respuesta vacía, parámetros inválidos y ausencia de estrategia.

## Assumptions

- La feature `003-player-valuation-strategies` mantiene como máximo una
  estrategia activa global y persiste `strategyCode`, `version` y
  `strategyVersionId` en cada cotización.
- La feature `004-player-quote-queries` ya estableció el orden histórico
  `calculatedAt DESC, id DESC` para seleccionar la cotización más reciente.
- Los valores de `league` y `position` válidos son los enums existentes del
  catálogo y no se agregan nuevas ligas ni posiciones en esta feature.
- La UI del ranking queda fuera del alcance; esta entrega define el contrato
  backend autenticado consumible por frontend.

## Out of Scope

- Activar, editar, versionar o eliminar estrategias de valuación.
- Recalcular cotizaciones o crear nuevas cotizaciones al consultar el ranking.
- Comparar rankings históricos o seleccionar manualmente una estrategia desde
  la consulta.
- Agregar filtros por score, cotización, fecha, nacionalidad o estadísticas
  individuales.
- Calcular PnL, portfolio, disponibilidad de tokens u órdenes de mercado.
- Crear tablas, índices o migraciones sin una necesidad demostrada por el
  esquema actual.
- Construir la pantalla frontend del ranking.
