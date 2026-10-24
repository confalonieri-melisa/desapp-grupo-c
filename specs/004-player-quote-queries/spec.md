# Feature Specification: Consulta de Cotizaciones Actuales e Históricas

**Feature Branch**: `feature/004-player-quote-queries`

**Created**: 2026-10-23

**Status**: Ready for Review

**Input**: User description: "Permitir la consulta de cotizaciones actuales e históricas de un jugador, solicitar la cotización correspondiente a una fecha determinada, informar valor, fecha de cálculo, estrategia, versión y componentes de score, reutilizando las cotizaciones persistidas por `valuation-strategies` sin recalcular precios durante una consulta."

## Alcance MVP

Esta feature agrega una única consulta de lectura sobre las cotizaciones ya
persistidas por `003-player-valuation-strategies`. Reutiliza el endpoint
existente `GET /players/:id/quotes`.

- Sin `date`, devuelve el historial completo ordenado desde la cotización más
  reciente; el primer elemento representa la cotización actual.
- Con `date=YYYY-MM-DD`, devuelve únicamente la última cotización disponible
  calculada en esa fecha o antes.
- No agrega paginación, filtros de rango, orden configurable, nuevas tablas,
  recálculo, nuevas estrategias ni un endpoint singular adicional.

La consulta solo lee `player_quotes` y la explicación persistida. No ejecuta
estrategias, no llama fuentes externas y no crea ni modifica cotizaciones.

La fecha solicitada es una fecha calendario válida con formato `YYYY-MM-DD`.
La cotización seleccionada es la de mayor `calculatedAt` cuya fecha de cálculo
sea anterior o igual a la fecha solicitada. Si hay empate, se selecciona el
registro con `id` mayor.

## User Scenarios & Testing

### User Story 1 - Consultar cotización actual e historial (Priority: P1)

Como usuario autenticado del marketplace, quiero consultar las cotizaciones de
un jugador para conocer su valor actual y su evolución histórica.

**Independent Test**: Con un jugador y varias cotizaciones persistidas,
solicitar `GET /players/{playerId}/quotes` devuelve un `200` con el historial
completo ordenado por fecha descendente; el primer elemento es la cotización
actual.

**Acceptance Scenarios**:

1. **Given** un jugador existente con cotizaciones, **When** un usuario
   autenticado solicita `GET /players/{playerId}/quotes`, **Then** responde
   `200` con todas las cotizaciones ordenadas por `calculatedAt DESC` y `id
   DESC` como desempate.
2. **Given** un jugador existente sin cotizaciones, **When** se solicita su
   historial, **Then** responde `200` con `items: []`.
3. **Given** un identificador de jugador inexistente, **When** se solicita su
   historial, **Then** responde `404` con un mensaje descriptivo.

---

### User Story 2 - Consultar una cotización a una fecha (Priority: P1)

Como usuario autenticado, quiero consultar la cotización de un jugador a una
fecha determinada para conocer el último valor disponible hasta ese momento.

**Independent Test**: Con cotizaciones calculadas en fechas distintas,
solicitar `GET /players/{playerId}/quotes?date=2026-10-20` devuelve solamente
la última cotización calculada el 20 de octubre o antes.

**Acceptance Scenarios**:

1. **Given** cotizaciones antes, durante y después de `2026-10-20`, **When**
   se solicita `date=2026-10-20`, **Then** se devuelve la de mayor
   `calculatedAt` cuya fecha sea menor o igual a `2026-10-20`.
2. **Given** una fecha anterior a la primera cotización del jugador, **When** se
   solicita esa fecha, **Then** responde `404` con un mensaje descriptivo y no
   utiliza una cotización posterior.
3. **Given** una fecha futura válida, **When** se solicita, **Then** devuelve la
   cotización más reciente disponible.
4. **Given** una fecha inexistente o con formato distinto de `YYYY-MM-DD`,
   **When** llega la solicitud, **Then** responde `400` con un mensaje
   descriptivo.

### Edge Cases

- Dos cotizaciones con la misma fecha de cálculo se resuelven por `id` mayor.
- Una fecha igual a la de la primera cotización la incluye.
- Una fecha anterior a todas las cotizaciones no hace fallback a una fecha
  posterior.
- La ausencia de historial completo se representa con `200` y lista vacía;
  la ausencia de resultado para una consulta por fecha se representa con
  `404` con un mensaje descriptivo.
- Un `playerId` con formato inválido responde `400`; un UUID válido que no
  existe responde `404`.

## API Contract

Todas las rutas se publican bajo el prefijo `/api`.

### `GET /players/{playerId}/quotes`

Consulta el historial completo o una cotización histórica puntual.

Parámetros:

- `playerId` (path, requerido): UUID válido.
- `date` (query, opcional): fecha calendario válida en formato `YYYY-MM-DD`.

Respuesta `200` sin `date`:

```json
{
  "items": [
    {
      "playerId": "uuid",
      "quoteValue": 82.5,
      "unit": "CREDIT_PER_TOKEN",
      "calculatedAt": "2026-10-20T18:30:00.000Z",
      "strategyCode": "INDIVIDUAL_PLUS_TEAM_CONTEXT",
      "strategyVersion": "v1.0.0",
      "score": {
        "individualScore": 0.81,
        "teamScore": 0.74,
        "finalScore": 0.823,
        "components": {}
      }
    }
  ]
}
```

Respuesta `200` con `date`: mismo formato, con un único elemento en `items`.

La respuesta debe informar `quoteValue`, unidad, `calculatedAt`, estrategia,
versión y los scores persistidos: `individualScore`, `teamScore` cuando
corresponda y `finalScore`. `score.components` debe exponer los componentes
de score ya guardados en la explicación de `player_quotes`, sin recalcularlos.
No se requiere crear una representación nueva de la explicación para este MVP.

Respuestas de error:

- `400` si el UUID o la fecha son inválidos.
- `401` si falta un JWT Bearer válido.
- `404` si el jugador no existe o no hay una cotización anterior o igual a la
  fecha solicitada.

## Requirements

### Functional Requirements

- **FR-001**: El sistema DEBE exponer `GET /api/players/{playerId}/quotes`.
- **FR-002**: Sin `date`, el endpoint DEBE devolver todas las cotizaciones
  persistidas del jugador; la primera DEBE ser la cotización actual.
- **FR-003**: Con `date`, el endpoint DEBE devolver únicamente la cotización
  más reciente cuya fecha de cálculo sea anterior o igual a la fecha solicitada.
- **FR-004**: El historial DEBE ordenarse por `calculatedAt DESC` y, ante
  empate, por `id DESC`.
- **FR-005**: El parámetro `date` DEBE validarse como fecha calendario real con
  formato estricto `YYYY-MM-DD`.
- **FR-006**: Las consultas DEBEN leer exclusivamente `player_quotes` y los
  datos persistidos asociados. NO DEBEN recalcular valores, ejecutar estrategias,
  llamar APIs externas, insertar registros ni actualizar registros históricos.
- **FR-007**: Cada cotización devuelta DEBE informar valor, unidad, fecha de
  cálculo, código de estrategia, versión, `individualScore`, `teamScore` si
  corresponde, `finalScore` y sus componentes persistidos.
- **FR-008**: Un jugador inexistente DEBE responder `404`; un historial vacío
  DEBE responder `200` con `items: []`; una consulta por fecha sin resultado
  DEBE responder `404`.
- **FR-009**: Las rutas DEBEN requerir un JWT Bearer válido. Los usuarios
  autenticados con rol `INVESTOR` o `SUPERUSER` pueden consultar cualquier
  jugador. No se requiere permiso administrativo.
- **FR-010**: El contrato DEBE documentarse en OpenAPI y cubrir las respuestas
  exitosas y los errores definidos.

### Key Entities

- **PlayerQuote**: Registro histórico append-only persistido por la feature de
  estrategias, con valor, fecha, estrategia, versión, scores y explicación.
- **Cotización del jugador**: Registro existente seleccionado por jugador y,
  opcionalmente, por fecha. El parámetro `date` es solo un criterio temporal;
  no representa una nueva entidad ni una nueva cotización.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100% de las consultas con `date` devuelve la cotización más
  reciente anterior o igual a la fecha solicitada y nunca una posterior.
- **SC-002**: El historial devuelve todos sus registros en orden estable y el
  primer registro corresponde a la cotización actual.
- **SC-003**: El 100% de las respuestas exitosas informa valor, fecha,
  estrategia, versión y scores persistidos.
- **SC-004**: Los tests cubren jugador inexistente, historial vacío, ausencia
  de cotización para una fecha, fecha inválida, fecha futura, desempate,
  autenticación y permisos.
- **SC-005**: Los tests demuestran que una consulta no ejecuta el motor de
  valuación ni modifica `player_quotes`.

## Assumptions

- `player_quotes` y su explicación son persistidas e inmutables por
  `003-player-valuation-strategies`; esta feature no cambia su esquema.
- `calculatedAt` permite comparar fechas de cálculo y `id` permite resolver
  empates de manera determinista.
- Se reutiliza el middleware JWT y los roles de autenticación existentes.
- La caché general del sistema, si ya existe, puede optimizar la lectura, pero
  esta feature no incorpora una solución de caché nueva.
- Paginación, filtros de rango, orden configurable, recálculo, scheduler,
  rankings, operaciones de tokens, portfolio y nuevas estrategias están fuera
  del MVP.
