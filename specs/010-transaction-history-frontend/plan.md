# Implementation Plan: Historial de operaciones del inversor

**Branch**: `feature/010-transaction-history-frontend` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Stack base**: `feature/009-player-token-trading-frontend` (incluye `feature/008-player-quotes-frontend`); integración final en `main` después de sus dependencias.

## Summary


Agregar «Mi historial» a la navegación autenticada y una vista de solo lectura en `/transactions`. Consulta el endpoint existente de la feature 006 con el ID del `AuthContext`, presenta importes históricos, resuelve nombres de jugadores y permite anexar páginas anteriores. El estado se aísla por sesión; ante `401` se retira el historial y se dirige a `/login`.

## Technical Context

**Language/Version**: TypeScript 5, Node.js >=22.12.0
**Primary Dependencies**: Next.js 16 App Router, React 19, Sass y `lucide-react` existentes
**Storage**: Ninguno nuevo; lectura de la API 006 respaldada por PostgreSQL
**Testing**: Vitest 5; comprobación manual en navegador
**Target Platform**: Navegadores de escritorio y móvil admitidos por la aplicación
**Project Type**: Aplicación web, incremento frontend
**Performance Goals**: 20 operaciones por página; resolver cada jugador distinto solo una vez por visita y sin bloquear el historial
**Constraints**: Sin cambios de backend, migraciones, dependencias ni exportación; historial de solo lectura con hora `America/Argentina/Buenos_Aires`, identidad desde sesión y valores monetarios históricos intactos.
**Scale/Scope**: Una ruta nueva, un enlace de navegación, cliente de historial, estado de paginación, presentación y pruebas dirigidas

## Constitution Check

*GATE: evaluado antes de Fase 0 y nuevamente después del diseño de Fase 1.*

| Principio | Antes | Después | Evidencia |
|---|---|---|---|
| I-II. Alcance y especificación | PASS | PASS | [spec.md](./spec.md) delimita consulta sobre feature 006, sin nuevas reglas financieras. |
| III-IV. Capas y validación | PASS | PASS | UI → cliente HTTP → API existente; la autorización permanece en backend. |
| V-IX. Verificación | PASS | PASS | [quickstart.md](./quickstart.md) cubre positivos, errores y límites; pruebas de comportamiento, sin tests triviales. La aprobación formal corresponde a la entrega. |
| VI. Privacidad y auditoría | PASS | PASS | ID desde contexto autenticado; respuestas viejas se ignoran; no se modifican registros. |
| VII-VIII-X. Incrementalidad | PASS | PASS | Solo feature 010 en rama propia apilada sobre 009; se reutilizan API, autenticación, navegación y perfil. |

No hay violaciones constitucionales ni aclaraciones pendientes. La especificación sigue en estado `Draft`; su aprobación se verifica antes de implementar o entregar conforme a la constitución.

## Project Structure

### Documentation (this feature)

```text
specs/010-transaction-history-frontend/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/history-ui.md
```

### Source Code (repository root)

```text
src/app/transactions/
├── page.tsx
└── TransactionsPage.module.scss
src/frontend/components/GlobalNav/
├── GlobalNav.tsx
└── GlobalNav.module.scss
src/frontend/context/AuthContext.tsx       # contrato existente de sesión
src/frontend/features/history/
├── components/                     # lista y fila de operación
├── hooks/useTransactionHistory.ts
└── history.ts                      # tipos, formato y mezcla de páginas
src/frontend/services/client/
├── transaction-history.service.ts
└── player.service.ts               # recurso de jugador existente
tests/unit/features/history/
tests/unit/services/client/
```

**Structure Decision**: Ruta en App Router y estado de consulta dentro de la feature frontend; HTTP en servicio cliente. No se introduce almacén global ni entidad persistida. Los nombres concretos de componentes y tests se fijarán en `tasks.md`.

## Design

### Sesión y transporte

La página espera hidratación de `AuthContext`. Sin sesión dirige a `/login` sin pintar operaciones. Obtiene `user.id` y `token` del contexto; ni la URL de la vista ni controles aceptan otro ID. Solicita `/api/users/${encodeURIComponent(user.id)}/transactions?limit=20&offset=...` con Bearer. El cliente conserva el estado HTTP para diferenciar `401`, `403` y errores recuperables. La API 006 mantiene la comprobación `auth.sub === :id`.

Cada cambio de identidad/token y el desmontaje abortan peticiones e invalidan una generación de solicitudes. Solo se aplica una respuesta de la generación vigente. El cambio de A a B vacía enseguida operaciones, nombres y errores de A. Un `401` ejecuta `logout()` y `router.replace('/login')`; `403` retira datos y muestra fallo de acceso sin presentarlo como historial vacío.

### Paginación y estado

La primera consulta usa `offset=0`; tras cada éxito, `nextOffset = response.offset + response.items.length`. Se anexan elementos en orden recibido, omitiendo IDs ya visibles. `hasMore` decide si mostrar «Ver más operaciones». El botón se deshabilita durante carga y anuncia progreso. Si falla una página posterior, se conservan elementos, `nextOffset` y `hasMore` para reintentar el mismo offset. Solo una primera respuesta exitosa vacía muestra el estado vacío.

Las inserciones nuevas pueden desplazar filas del servidor con paginación por `offset`. Avanzar según elementos recibidos y deduplicar por `id` preserva lo visible y evita duplicados; no se inserta contenido nuevo en cabeza durante la visita. El contrato 006 no ofrece una instantánea entre páginas; volver a abrir consulta desde cero. Esta limitación y su validación figuran en [research.md](./research.md).

### Presentación

Cada fila muestra «Compra»/«Venta», jugador, fecha y hora, cantidad, `quoteValue` como créditos por token y `total` como créditos. `Intl.DateTimeFormat` usa `America/Argentina/Buenos_Aires`; la vista dice «Hora de Buenos Aires (ART)». `Intl.NumberFormat('es-AR')` formatea números sin recalcular importes. El enlace `/players/:id` aparece solo tras resolver correctamente el perfil; ante `404` u otro fallo no autorizativo se muestra el ID sin enlace. El enriquecimiento de jugadores no bloquea la lista y se invalida al cambiar sesión; `401` de jugador cierra sesión.

La vista usa encabezado, lista y botones semánticos con foco visible; carga con `role=status`/`aria-live` y errores con `role=alert`. En móvil cada campo conserva su etiqueta. `GlobalNav` determina `aria-current="page"` con `usePathname` para `/players` y `/transactions`.

## Research and Design Artifacts

- [research.md](./research.md): decisiones y alternativas.
- [data-model.md](./data-model.md): proyecciones de lectura y estados, sin migración.
- [contracts/history-ui.md](./contracts/history-ui.md): navegación, integración HTTP y estados observables.
- [quickstart.md](./quickstart.md): validación de extremo a extremo.

## Verification Strategy

Vitest cubrirá mezcla de páginas repetidas y mismo timestamp, reintento de offset, vacío solo tras éxito, respuesta tardía de A luego de iniciar B, `401` frente a `404` de jugador y fecha cerca de cambio de día. Validación manual: teclado, foco, lector de pantalla, móvil y lectura de compras/ventas. Durante implementación, ejecutar `npm run lint`, `npx tsc --noEmit`, `npm run build` y `git diff --check`.

## Complexity Tracking

No aplica: el diseño no introduce excepciones a la constitución.
