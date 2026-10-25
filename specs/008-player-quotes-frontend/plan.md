# Implementation Plan: Cotizaciones desde el perfil del jugador

**Branch**: `feature/008-player-quotes-frontend` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: `specs/008-player-quotes-frontend/spec.md`

## Summary

Agregar al perfil existente cotización actual, historial completo, consulta por fecha y explicación persistida. Un cliente HTTP tipado consume exclusivamente las lecturas de 004. Un hook mantiene historial y consulta puntual independientes, invalida respuestas obsoletas y deriva la actual de `items[0]`. Componentes con SCSS Modules y controles nativos reutilizan la presentación del perfil. No hay cambios de backend, persistencia ni nuevas dependencias.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js >=22.12.0, según package.json.

**Primary Dependencies**: Next.js 16.3.4 App Router, React/React DOM 19.2.8, Sass existente, fetch y AbortController nativos. Versiones declaradas localmente; sin actualización propuesta.

**Storage**: Estado transitorio React; PostgreSQL/Drizzle existentes solo detrás de la API. Sin migraciones ni nueva caché persistida.

**Testing**: Vitest 5 existente con entorno Node, mocks de fetch/React y promesas controladas. Validación manual de DOM, teclado, lector de pantalla y estilos. Regresión existente de repositorios contra PostgreSQL real.

**Target Platform**: Navegadores de escritorio/móvil; anchos de aceptación 1280 y 360 px.

**Project Type**: Aplicación web Next.js con frontend y backend en el mismo repositorio; incremento frontend.

**Performance Goals**: Una lectura de historial por carga válida del perfil, una lectura puntual por consulta/reintento explícito; detalles sin solicitudes adicionales. Sin polling ni solicitudes por fila. No existe SLA de latencia aprobado.

**Constraints**: Conservar todos los registros en orden recibido; ninguna escritura/recálculo; UTC con precisión temporal recibida; fechas calendario sin conversión de zona; sesión existente; descarte de éxitos y errores obsoletos.

**Scale/Scope**: Una sección en `/players/[id]`, cuatro historias y FR-001–020. Historial completo sin paginación, gráficos ni virtualización anticipada.

## Constitution Check

*Gate previo a Phase 0 y reevaluación posterior a Phase 1: PASS para planificación.*

| Principios | Comprobación previa y resultado de diseño |
|---|---|
| I, II: alcance y especificación | Spec 008 existente, contrato normativo 004; diseño limitado a FR-001–020, sin alterar historia ni implementar código |
| III: capas | Cliente HTTP, hook y presentación separados; sin acceso frontend a repositorios ni motor de valoración |
| IV: validación | Fecha calendario en entrada; existencia y selección temporal siguen en backend; sin reglas de precio duplicadas |
| V: verificación | Tests conductuales de cliente/hook/utilidades y guía manual; conservar pruebas anteriores, sin tests triviales |
| VI: operación y seguridad | Bearer y logout/login existentes; 401 vigente retira datos; no modifica controles operacionales ni auditoría del backend |
| VII, VIII: incremento y simplicidad | Perfil existente, sin librerías, tablas ni estado global nuevo; decisiones justificadas en research.md |
| IX: terminado | Quickstart exige evidencia de implementación y aprobación formal de Project Owner; contratos API sin cambios reutilizan OpenAPI/Postman existentes |
| X: GitFlow/YAGNI | Rama real `feature/008-player-quotes-frontend`, integración main; una feature, sin commits sobre main ni acciones externas |

La spec tiene estado `Ready for Review`. Planificar no acredita aprobación formal; antes de implementar corresponde cumplir el gate de especificación aprobada. No se proponen excepciones constitucionales.

## Project Structure

### Documentation (this feature)

```text
specs/008-player-quotes-frontend/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/player-quotes-ui.md
```

`tasks.md` corresponde a `$speckit-tasks` y no se genera aquí.

### Source Code (repository root)

Rutas propuestas salvo archivos marcados existentes:

```text
src/app/players/[id]/page.tsx                       # existente: integrar sección con identidad de jugador
src/frontend/services/client/
├── player.service.ts                              # existente: conservar status en errores
└── player-quotes.service.ts                        # DTO y cliente de lectura
src/frontend/features/profile/
├── hooks/usePlayerProfile.ts                       # existente: evitar estados y errores obsoletos
├── hooks/usePlayerQuotes.ts
├── utils/player-quotes.ts
└── components/
    ├── PlayerQuotesSection/PlayerQuotesSection.tsx
    ├── PlayerQuotesSection/PlayerQuotesSection.module.scss
    ├── QuoteSummary/QuoteSummary.tsx
    ├── QuoteHistory/QuoteHistory.tsx
    ├── QuoteDateQuery/QuoteDateQuery.tsx
    └── QuoteExplanation/QuoteExplanation.tsx
tests/unit/
├── services/client.player-quotes.service.spec.ts
├── services/client.player.service.spec.ts           # existente: compatibilidad de errores
└── features/profile/
    ├── use-player-profile.spec.ts                  # existente: regresión de identidad
    ├── use-player-quotes.spec.ts
    └── player-quotes.spec.ts
```

**Structure Decision**: Extender profile y servicios client existentes. La sección recibe jugador confirmado, token y callback de sesión inválida. Aislar montaje por jugador, verificar identidad de datos antes de renderizar y proteger también el hook del perfil. Conservar el callback de autorización en referencia actualizada para que cambios de identidad de logout no provoquen recargas. Reutilizar UI y estilos; estilos específicos en el módulo de la sección.

## Phase 0: Research

Completada en [research.md](research.md), con inspección local y revisión independiente de integración solicitada por el workflow. Resueltos DTO, status HTTP, identidad sin id público, precisión, explicación variable, cancelación y pruebas. Sin incógnitas técnicas pendientes.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): DTO, identidades, estados y transiciones.
- [contracts/player-quotes-ui.md](contracts/player-quotes-ui.md): consumo HTTP, interacción, accesibilidad y trazabilidad.
- [quickstart.md](quickstart.md): preparación, verificaciones y aceptación.

Reevaluación constitucional: PASS para diseño, sin excepciones. No se generan tareas ni código de aplicación.

## Complexity Tracking

Sin violaciones que justificar.
