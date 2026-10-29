# Tasks: Ranking de jugadores en el frontend

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [ranking-ui.md](./contracts/ranking-ui.md) y [quickstart.md](./quickstart.md).

**Organization**: Tareas agrupadas por historia para entregar primero la consulta, luego los filtros y finalmente la recuperación de errores. Los tests dirigidos verifican comportamiento requerido por la constitución; no se agregan tests para archivos declarativos.

## Phase 1: Setup

**Purpose**: Aislar la feature antes de modificar código.

- [X] T001 Crear la rama `feature/012-player-ranking-frontend` desde la actual `feature/011-player-name-search` y conservar `specs/012-player-ranking-frontend/` en el workspace; comprobar la branch antes de continuar, sin reescribir historia ni cambiar `main`.

---

## Phase 2: Foundational

**Purpose**: Definir el contrato compartido de lectura sin modificar la API 007.

- [X] T002 Definir en `src/frontend/features/ranking/ranking.ts` los tipos de respuesta, selección y paginación usados por las tres historias: `rank` entero positivo recibido; `finalScore` 0–1 sin conversión; `league` y `position` solo enums existentes; `page` >=1; `limit` fijo 20; `totalPages` >=0 y 0 cuando `total=0`; incluir estrategia, versión, cotización, unidad e instante ISO, sin lógica de reordenamiento ni persistencia.

**Checkpoint**: El cliente y la vista pueden compartir un tipo exacto del contrato 007.

---

## Phase 3: User Story 1 - Consultar el ranking activo (Priority: P1) 🎯 MVP

**Goal**: Un usuario autenticado entra a `/ranking` desde la navegación y ve la lista, puestos globales y contexto de estrategia de una respuesta vigente.

**Independent Test**: Con varias entradas de la API 007, confirmar orden y `rank` exactos, datos de cada jugador, fecha/hora UTC, cotización con unidad, versión activa y enlace a `/players/:id`.

### Tests for User Story 1

- [X] T003 [P] [US1] Crear pruebas de `GET /api/players/ranking` con Bearer, `limit=20` y preservación de `players`, `rank`, `strategyCode`, `strategyVersion` y `pagination` en `tests/unit/services/client/player-ranking.service.spec.ts`; usar una respuesta con empate para detectar reordenamiento local.
- [X] T004 [P] [US1] Crear pruebas de la página autenticada que verifiquen acceso desde navegación, orden y puesto recibidos, identidad, `finalScore`, `quoteValue` con `CREDIT_PER_TOKEN`, instante UTC y enlace de perfil en `tests/unit/features/ranking/RankingPage.spec.ts`.

### Implementation for User Story 1

- [X] T005 [P] [US1] Implementar cliente de solo lectura en `src/frontend/services/client/player-ranking.service.ts`: enviar token Bearer, `page=1&limit=20` por defecto, aceptar `AbortSignal`, preservar respuesta y exponer estado HTTP sin modificar `src/app/api/players/ranking/route.ts`.
- [X] T006 [P] [US1] Añadir enlace «Ranking» hacia `/ranking` con `aria-current="page"` solo en esa ruta en `src/frontend/components/GlobalNav/GlobalNav.tsx`; ajustar foco y distribución móvil si hace falta en `src/frontend/components/GlobalNav/GlobalNav.module.scss`.
- [X] T007 [US1] Implementar la carga inicial ligada a `AuthContext` hidratado y token actual en `src/frontend/features/ranking/hooks/usePlayerRanking.ts`; mantener juntos `players`, `strategyCode`, `strategyVersion` y `pagination` de una respuesta, y no pedir perfiles adicionales.
- [X] T008 [P] [US1] Crear presentación semántica de entradas en `src/frontend/features/ranking/components/RankingList.tsx` y `src/frontend/features/ranking/components/RankingList.module.scss`: puesto `rank` textual, nombre enlazado a `/players/:id`, equipo, liga, posición, puntaje 0–1, cotización «créditos por token» y fecha/hora UTC indicada; conservar exactamente el orden recibido.
- [X] T009 [US1] Integrar `usePlayerRanking`, `RankingList`, encabezado de estrategia/versión y estado de carga en `src/app/ranking/page.tsx` y `src/app/ranking/RankingPage.module.scss`; bloquear datos antes de hidratación y llevar al usuario sin sesión a `/login`.

**Checkpoint**: La página ya permite consultar un ranking de una página desde navegación sin filtros ni acciones de mercado.

---

## Phase 4: User Story 2 - Filtrar y recorrer resultados (Priority: P1)

**Goal**: Combinar liga, equipo parcial y posición, limpiar filtros y recorrer páginas sin perder selección ni alterar puestos.

**Independent Test**: Aplicar una combinación, visitar página 2 y volver; comprobar URL, selección y puestos recibidos. Probar texto parcial de equipo ausente en la página actual y `totalPages=0`.

### Tests for User Story 2

- [X] T010 [P] [US2] Crear pruebas de parseo y serialización de `league`, `team`, `position`, `page` en `tests/unit/features/ranking/ranking-url.spec.ts`: omitir filtros vacíos, recortar equipo, aceptar solo enums válidos, normalizar página no positiva a 1, ignorar parámetros ajenos, reiniciar página al cambiar filtros y conservarlos al paginar.
- [X] T011 [P] [US2] Ampliar `tests/unit/features/ranking/RankingPage.spec.ts` con escenarios de filtros combinados, equipo parcial confirmado por formulario, limpiar filtros, navegación entre páginas, controles en extremos y puestos globales en página 2.

### Implementation for User Story 2

- [X] T012 [P] [US2] Implementar parseo y serialización canónica de la selección de `/ranking` en `src/frontend/features/ranking/utils/ranking-url.ts`: `league` y `position` enums existentes, `team` recortado, `page` entero >=1, omisión de parámetros desconocidos y `limit=20` fuera de la URL visible.
- [X] T013 [P] [US2] Crear formulario de filtros en `src/frontend/features/ranking/components/RankingFilters.tsx` y `src/frontend/features/ranking/components/RankingFilters.module.scss`: selects de liga/posición, campo de texto para equipo parcial independiente de la página visible, envío explícito, limpiar filtros y etiquetas accesibles.
- [X] T014 [P] [US2] Crear controles de paginación en `src/frontend/features/ranking/components/RankingPagination.tsx` y `src/frontend/features/ranking/components/RankingPagination.module.scss`: mostrar `total`, `page` y `totalPages` del backend, deshabilitar extremos y omitir controles cuando `totalPages=0`.
- [X] T015 [US2] Extender `src/frontend/services/client/player-ranking.service.ts` para enviar solo `league`, `team`, `position`, `page` y `limit=20`, sin `name` ni parámetros desconocidos; `team` debe conservar la coincidencia parcial que resuelve el backend.
- [X] T016 [US2] Ajustar `src/frontend/features/ranking/hooks/usePlayerRanking.ts` para consultar la selección aplicada, invalidar resultados de otra selección al cambiar filtros o página y evitar solicitudes duplicadas mientras cambia de página.
- [X] T017 [US2] Integrar selección por URL, formulario, limpiar y paginación en `src/app/ranking/page.tsx`; al cambiar cualquier filtro volver a página 1, al paginar conservar filtros y, ante una URL con página mayor que `totalPages`, reemplazar una vez por la última válida o por 1 si el total es cero, sin inventar filas.

**Checkpoint**: Filtros y paginación de la API funcionan sin depender de la lista visible del catálogo.

---

## Phase 5: User Story 3 - Entender estados y recuperarse de fallos (Priority: P2)

**Goal**: Separar carga, vacío, fallo, falta de estrategia y sesión vencida; reintentar cuando corresponda sin mostrar respuestas tardías.

**Independent Test**: Simular `200` vacío, `409`, `401`, error de red y consultas anteriores resueltas después de cambiar filtros, página o sesión; comprobar mensaje y acción de cada estado.

### Tests for User Story 3

- [X] T018 [P] [US3] Ampliar `tests/unit/services/client/player-ranking.service.spec.ts` para clasificar `401`, `409`, `400`, `500` y fallo de red sin exponer detalles internos ni convertirlos en `players: []`.
- [X] T019 [P] [US3] Crear pruebas de estado y concurrencia en `tests/unit/features/ranking/usePlayerRanking.spec.ts`: carga frente a vacío, reintento de selección vigente, `409` específico, `401` que limpia datos y cierra sesión, y respuestas tardías descartadas tras cambios de filtros, página o token.
- [X] T020 [P] [US3] Ampliar `tests/unit/features/ranking/RankingPage.spec.ts` con anuncios de carga, vacío con filtros modificables, error y reintento, falta de estrategia, ausencia de sesión y controles por teclado.

### Implementation for User Story 3

- [X] T021 [US3] Completar clasificación de errores HTTP y de red en `src/frontend/services/client/player-ranking.service.ts`, conservando `status` para `401` y `409` y un mensaje seguro para fallos recuperables.
- [X] T022 [US3] Completar transiciones de `loading`, `content`, `empty`, `error`, `no-active-strategy` y `unauthenticated` en `src/frontend/features/ranking/hooks/usePlayerRanking.ts`; abortar al cambiar selección/sesión/desmontar, comprobar clave vigente antes de aplicar respuesta, limpiar datos de sesión anterior y exponer reintento de la selección actual.
- [X] T023 [US3] Presentar los estados y acciones en `src/app/ranking/page.tsx` y `src/app/ranking/RankingPage.module.scss`: carga perceptible, vacío solo tras `200`, error recuperable con «Reintentar», `409` específico y `401` con `logout()` y redirección a `/login`, sin reutilizar resultados obsoletos.

**Checkpoint**: La vista informa correctamente cada estado y nunca muestra resultados de otra selección o sesión.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validar accesibilidad, contrato y calidad de la entrega completa.

- [X] T024 Revisar en `src/app/ranking/RankingPage.module.scss`, `src/frontend/features/ranking/components/RankingList.module.scss`, `src/frontend/features/ranking/components/RankingFilters.module.scss` y `src/frontend/features/ranking/components/RankingPagination.module.scss` foco visible, lectura móvil sin desplazamiento horizontal y ausencia de significado transmitido solo por color.
- [X] T025 Ejecutar tests dirigidos, lint, TypeScript y build indicados en `specs/012-player-ranking-frontend/quickstart.md`; corregir fallos de la feature en `src/app/ranking/`, `src/frontend/features/ranking/` y `src/frontend/services/client/player-ranking.service.ts` sin modificar tests existentes para forzar verde.
- [ ] T026 Recorrer los escenarios manuales de `specs/012-player-ranking-frontend/quickstart.md` contra la API 007, registrar resultados y cualquier límite real en ese archivo; verificar que `src/app/api/players/ranking/route.ts` y `specs/007-player-ranking/contracts/ranking.yaml` permanecen sin cambios.

---

## Dependencies & Execution Order

- T001 precede cualquier cambio de código; T002 precede las tres historias.
- US1 (T003–T009) entrega la consulta básica y es el MVP.
- US2 (T010–T017) reutiliza página, cliente y hook de US1; sus utilidades y componentes pueden prepararse en paralelo, pero la integración depende de US1.
- US3 (T018–T023) amplía el cliente, hook y página ya creados; sus pruebas pueden prepararse en paralelo con los componentes de US2, y su integración debe usar la selección final de US2.
- Polish (T024–T026) sigue a las tres historias. No se requiere backend, migración, paquete nuevo ni cambio de contrato.

## Parallel Opportunities

- **US1**: T003 y T004 escriben pruebas distintas; T005, T006 y T008 trabajan en archivos distintos una vez definido T002. T007 consume T005 y T009 integra T006–T008.
- **US2**: T010 y T011 preparan verificaciones distintas; T012, T013 y T014 trabajan en archivos distintos. T015–T017 integran esos resultados en cliente, hook y página.
- **US3**: T018, T019 y T020 preparan verificaciones distintas. T021–T023 se ejecutan en orden porque el hook clasifica errores del servicio y la página consume sus estados.

## Implementation Strategy

1. Completar Setup y Foundational; escribir las pruebas de US1 y comprobar que detectan el comportamiento aún ausente.
2. Implementar US1 y validar el MVP de consulta simple antes de incorporar filtros.
3. Implementar US2 y verificar URL, selección y páginas con puestos recibidos.
4. Implementar US3 y validar errores, sesión y respuestas tardías.
5. Cerrar con la validación de `quickstart.md` y revisión de alcance. La aprobación formal de la entrega sigue el proceso de la constitución.
