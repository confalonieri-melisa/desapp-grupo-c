# Implementation Plan: Ranking de jugadores en el frontend

**Branch**: `feature/012-player-ranking-frontend` (creada desde `feature/011-player-name-search`) | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-player-ranking-frontend/spec.md`

## Summary

Agregar una página autenticada `/ranking` y su acceso «Ranking» en la navegación principal. La página consulta `GET /api/players/ranking`, presenta los puestos y valores recibidos para la versión activa, permite filtrar por liga, equipo y posición y recorrer páginas conservando los filtros. La consulta y el estado visual se aíslan por selección y sesión; `401` sigue el cierre de sesión existente y `409` muestra que falta una estrategia activa. No se modifica el backend.

## Technical Context

**Language/Version**: TypeScript 5, Node.js >=22.12.0.

**Primary Dependencies**: Next.js 16 App Router, React 19, Sass y componentes existentes; sin nuevas dependencias.

**Storage**: Ninguno nuevo; lectura de cotizaciones persistidas mediante la API 007.

**Testing**: Vitest 5 para comportamiento de cliente, filtros y estados; comprobación manual de teclado, lector de pantalla y tamaños de pantalla.

**Target Platform**: Navegadores de escritorio y móvil admitidos por la aplicación.

**Project Type**: Aplicación web, incremento frontend.

**Performance Goals**: Consultar una sola página de hasta 20 entradas por selección; no descargar ni ordenar el ranking completo en el navegador.

**Constraints**: JWT obligatorio; datos y puestos únicamente de la respuesta vigente; sin cálculo de valuación, cambios de contrato, migraciones ni dependencia adicional.

**Scale/Scope**: Una página nueva, un enlace de navegación, cliente de ranking, filtros y paginación, estados accesibles y pruebas dirigidas.

## Constitution Check

*GATE: evaluado antes de Phase 0 y nuevamente después del diseño de Phase 1.*

| Principio | Antes | Después | Evidencia y decisión |
|---|---|---|---|
| I-II. Alcance y especificación | PASS | PASS | [spec.md](./spec.md) fija la experiencia y excluye cambios de negocio; la aprobación de implementación sigue pendiente. |
| III-IV. Capas y validación | PASS | PASS | Página y hook de vista → cliente HTTP → API 007. El backend sigue validando filtros y autorizando. |
| V-IX. Verificación y entrega | PASS | PASS | [quickstart.md](./quickstart.md) cubre recorridos, errores y límites; la aprobación formal de entrega se gestiona después de implementar. |
| VI. Seguridad | PASS | PASS | Se espera hidratación, se usa Bearer, se retiran datos al cambiar sesión y se descartan respuestas tardías. |
| VII-VIII. Incrementalidad y simplicidad | PASS | PASS | Se reutilizan contexto, navegación, etiquetas y estilos; no hay cambios de backend ni abstracciones generales. |
| X. Rama propia por feature | EXCEPCIÓN | EXCEPCIÓN ACOTADA | La documentación se preparó en `feature/011-player-name-search` y la implementación se aisló en `feature/012-player-ranking-frontend` creada desde ella. La base difiere de `main` hasta integrar la 011. |

No hay aclaraciones funcionales pendientes. La excepción de base de rama se registra en Complexity Tracking; la primera tarea de implementación aisló la feature en su propia rama.

## Project Structure

### Documentation (this feature)

```text
specs/012-player-ranking-frontend/
├── prompt.md
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/ranking-ui.md
```

### Source Code (repository root)

```text
src/app/ranking/
├── page.tsx
└── RankingPage.module.scss
src/frontend/components/GlobalNav/
├── GlobalNav.tsx
└── GlobalNav.module.scss
src/frontend/features/ranking/
├── ranking.ts                 # tipos y estado de presentación
├── hooks/usePlayerRanking.ts
├── utils/ranking-url.ts      # filtros y página en URL
└── components/               # filtros, resultados y controles accesibles
src/frontend/services/client/player-ranking.service.ts
tests/unit/features/ranking/
tests/unit/services/client/player-ranking.service.spec.ts
```

**Structure Decision**: La ruta vive en App Router, la consulta en un servicio cliente específico y la coordinación de estado en la feature frontend. Se reutiliza `AuthContext`, `PageContainer`, etiquetas de liga/posición y patrones visuales existentes. No se comparte a la fuerza el filtro del catálogo: su selector de equipo depende de los jugadores de la página visible y el ranking exige texto parcial independiente.

## Design

### Transporte y contrato

El servicio cliente consulta `/api/players/ranking` con `Authorization: Bearer <token>` y filtros `league`, `team`, `position`, `page` y `limit=20`. Omite filtros vacíos y recorta espacios externos del equipo. Recibe `strategyCode`, `strategyVersion`, `players` y `pagination`; conserva `rank` y el orden de `players` sin cálculo local. Distingue fallos por estado HTTP; no interpreta un `409` como vacío. El [contrato de UI](./contracts/ranking-ui.md) registra la correspondencia con el contrato [ranking.yaml](../007-player-ranking/contracts/ranking.yaml).

### Selección y paginación

La URL de `/ranking` conserva `league`, `team`, `position` y `page` para navegación, recarga y enlaces. Los enums desconocidos y páginas no positivas se normalizan al valor predeterminado antes de consultar; no se propagan parámetros ajenos a la API. El equipo se aplica al enviar el campo de búsqueda o pulsar su acción, lo que permite escribir un nombre parcial sin una solicitud por tecla. Cambiar filtros restablece la página 1; avanzar o retroceder mantiene los filtros. `limit=20` es fijo y no se ofrece selector de tamaño.

La paginación usa `pagination.total`, `page` y `totalPages` de la respuesta. Con `totalPages=0`, se muestra el vacío y no hay controles de página. Si una URL antigua solicita una página posterior a `totalPages` y hay resultados, se reemplaza una vez por la última página válida y se consulta allí; no se inventan puestos. Si el total pasa a cero, se vuelve a la página 1 sin bucles. Los botones se deshabilitan en extremos y durante una transición que pudiera disparar una solicitud duplicada.

### Sesión, concurrencia y estados

La página espera `AuthContext.isHydrated`. Sin token válido dirige a `/login` sin mostrar datos. El hook asocia cada resultado con una clave de token y selección; aborta la solicitud anterior al cambiar filtros, página, token o desmontar, y verifica que la clave siga vigente antes de aplicar éxito o error. El cambio de sesión elimina de inmediato resultados, versión y mensajes de la sesión anterior. Ante `401`, llama a `logout()` y redirige a `/login`.

Los estados de vista son carga, contenido, vacío, error recuperable y falta de estrategia activa. Un reintento vuelve a consultar la selección vigente. La carga no reutiliza una lista previa como si correspondiera a filtros nuevos. `409` presenta un mensaje específico sin reintento de datos hasta que el usuario decida actualizar; `400` o un fallo de red se presentan como error recuperable, sin exponer mensajes internos. Estrategia y versión se actualizan atómicamente con la lista de la misma respuesta.

### Presentación y accesibilidad

Cada fila o tarjeta conserva el orden recibido y muestra puesto `rank`, nombre enlazado a `/players/:id`, equipo, liga, posición, `finalScore` en escala 0–1, `quoteValue` con unidad «créditos por token» y fecha y hora de cálculo. `Intl.NumberFormat('es-AR')` formatea números y `Intl.DateTimeFormat` muestra el instante en UTC, como la vista actual de cotizaciones; la página indica «UTC». El instante y los valores no cambian. La cabecera informa código y versión de estrategia activa. No se consulta cada perfil por separado porque la respuesta ya contiene la identidad necesaria.

Filtros y paginación usan controles nativos etiquetados, foco visible, puesto textual y avisos de carga/error perceptibles. La disposición se adapta a móvil sin ocultar campos ni requerir desplazamiento horizontal para leer una entrada. El enlace de GlobalNav marca `aria-current="page"` únicamente en `/ranking`.

## Research and Design Artifacts

- [research.md](./research.md): decisiones y alternativas.
- [data-model.md](./data-model.md): proyecciones y transiciones de estado, sin persistencia nueva.
- [contracts/ranking-ui.md](./contracts/ranking-ui.md): navegación, datos y estados observables.
- [quickstart.md](./quickstart.md): recorrido manual y comandos de verificación.

## Verification Strategy

Pruebas dirigidas para serialización de filtros, equipo parcial y página inválida; transporte y `401`/`409`; conservación del orden y `rank` en páginas posteriores; cambio de filtros/página/sesión con respuesta tardía; vacío, error y reintento. Validación manual en escritorio y móvil con teclado y lector de pantalla. En implementación, ejecutar tests pertinentes, `npm run lint`, `npx tsc --noEmit`, `npm run build` y `git diff --check`. No se ejecutan pruebas de código ahora porque esta etapa solo produce diseño.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Principio X: base de rama distinta de `main` | El usuario indicó partir de la rama 011; se creó la rama 012 desde ella antes de implementar. | Crear 012 directamente desde `main` omitiría el estado de partida solicitado y podría perder el trabajo de la feature 011 que esta entrega toma como base. |
