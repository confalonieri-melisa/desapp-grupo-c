# Implementation Plan: Compra y venta de tokens desde el perfil

**Branch**: `feature/009-player-token-trading-frontend` | **Date**: 2026-10-25 | **Spec**: [spec.md](spec.md)

**Input**: `specs/009-player-token-trading-frontend/spec.md`

## Summary

Integrar al perfil una sección que muestre el saldo y solo la posición del jugador abierto, y permita a INVESTOR confirmar compras y ventas con los contratos actuales. Elevar la lectura de cotizaciones existente para que la sección de cotizaciones y la de trading compartan la misma cotización vigente. Un cliente HTTP tipado y un hook de trading mantienen separadas la consulta de portfolio, la confirmación, el envío único y el comprobante. Tras una orden exitosa se vuelve a consultar el portfolio; las respuestas tardías se aíslan por jugador y sesión. Sin cambios de backend, persistencia ni dependencias.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js >=22.12.0 declarados en `package.json`.

**Primary Dependencies**: Next.js 16.3.4 App Router, React/React DOM 19.2.8, Sass existente, `fetch` y `AbortController` nativos; sin dependencias nuevas.

**Storage**: Estado React transitorio; PostgreSQL/Drizzle existentes detrás de las rutas actuales. Sin migraciones ni caché nueva.

**Testing**: Vitest 5 en entorno Node con mocks de `fetch` y promesas controladas; verificación manual en navegador de foco, teclado y tamaños. Reutilizar el harness de hooks del perfil.

**Target Platform**: Navegadores de escritorio y móvil; aceptación a 360 y 1280 px.

**Project Type**: Aplicación web Next.js con frontend y API en el mismo repositorio; incremento solo frontend.

**Performance Goals**: Una lectura de portfolio por carga de perfil y otra tras éxito o reintento explícito; una lectura compartida del historial de cotizaciones por perfil. Sin polling ni SLA de latencia aprobado.

**Constraints**: JWT existente; identidad obtenida de la sesión, nunca de un `userId` editable; cantidad entera positiva dentro del rango de entrada del contrato; cálculo previo solo orientativo; resultado efectivo solo de la respuesta; ninguna decisión financiera nueva; una solicitud por confirmación; datos protegidos aislados por sesión y jugador.

**Scale/Scope**: Una sección de saldo, posición y operaciones en `/players/[id]`; tres historias y FR-001–022. Sin portfolio global, historial de órdenes ni nuevas operaciones.

## Constitution Check

*Gate antes de Phase 0 y reevaluación posterior a Phase 1: PASS para planificación; aprobación de la spec pendiente para implementación.*

| Principio | Verificación previa y posterior al diseño |
|---|---|
| I, II: alcance y especificación | Spec 009 existe con escenarios y límites; el diseño solo usa lecturas y órdenes existentes. Figura `Draft`: la aprobación formal es requisito antes de implementar, no impide producir el plan. |
| III: capas | Cliente HTTP, hook de interacción y componentes del perfil separados; el frontend no accede a repositorios ni modifica reglas del dominio. |
| IV: validación | La UI valida formato y disponibilidad visible para orientar; el backend conserva la decisión sobre saldo, tenencia, cotización y ejecución. |
| V: verificación | Pruebas conductuales de cliente, validación y hook con éxito, rechazo, incertidumbre y respuestas obsoletas; guía manual de teclado y ancho. No hay tests declarativos. |
| VI: seguridad y auditoría | Se reutiliza Bearer/JWT y el flujo de logout; las rutas existentes conservan autenticación, transacción y auditoría. No se envía `userId`. |
| VII, VIII: incremento y simplicidad | Se amplía `profile` sin estado global, infraestructura ni librerías nuevas. La cotización compartida evita lecturas duplicadas. |
| IX: terminado | `quickstart.md` define verificación, compilación y revisión; la entrega requiere aprobación formal de Project Owner. Sin cambio público de API que exija actualizar OpenAPI/Postman. |
| X: GitFlow/YAGNI | Rama real `feature/009-player-token-trading-frontend`, base `main`; una sola feature, sin implementación anticipada ni commits en `main`. |

No se identifican excepciones constitucionales. La diferencia entre el error documentado en 005 y el error HTTP real se registra en investigación y contrato UI, sin ampliar el alcance a backend.

## Project Structure

### Documentation (this feature)

```text
specs/009-player-token-trading-frontend/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/player-trading-ui.md
```

`tasks.md` corresponde a `$speckit-tasks` y no se genera en este paso.

### Source Code (repository root)

Rutas existentes y propuestas para la implementación posterior:

```text
src/app/players/[id]/page.tsx                              # existente: compartir cotización y montar trading
src/frontend/context/AuthContext.tsx                        # existente: token y rol de sesión
src/frontend/services/client/
├── player-quotes.service.ts                                 # existente: lectura de cotización
└── player-trading.service.ts                                # propuesto: portfolio y órdenes
src/frontend/features/profile/
├── hooks/usePlayerQuotes.ts                                 # existente: cotización compartida
├── hooks/usePlayerTrading.ts                                # propuesto: lectura, orden y refresco
├── utils/player-trading.ts                                  # propuesto: cantidad y estado visible
└── components/
    ├── PlayerQuotesSection/PlayerQuotesSection.tsx          # existente: recibir lectura compartida
    ├── PlayerTradingSection/PlayerTradingSection.tsx        # propuesto: posición, controles y comprobante
    └── PlayerTradingSection/PlayerTradingSection.module.scss
tests/unit/
├── services/client.player-trading.service.spec.ts           # propuesto
└── features/profile/
    ├── use-player-trading.spec.ts                            # propuesto
    └── player-trading.spec.ts                                # propuesto
```

**Structure Decision**: Elevar `usePlayerQuotes` al perfil y pasar su resultado a la sección actual y a trading; usar el jugador confirmado del perfil y `user.role` de `AuthContext`. Mantener el estado de operación en el nivel del perfil para etiquetar un comprobante con el jugador confirmado aunque cambie la ruta mientras llega la respuesta, sin aplicar esa respuesta al saldo o posición del nuevo perfil. El hook descarta lecturas obsoletas por identidad y generación; las órdenes ya enviadas no se reinterpretan por cancelación de red.

## Phase 0: Research

Completada en [research.md](research.md). Se revisaron arquitectura del perfil, contratos HTTP reales, modelo de portfolio, motivos de rechazo, límites de cantidad, concurrencia y pruebas. Sin `NEEDS CLARIFICATION` técnicos pendientes.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): DTO de entrada/salida, datos derivados de presentación y estados.
- [contracts/player-trading-ui.md](contracts/player-trading-ui.md): contrato HTTP consumido, comportamiento de UI, errores y accesibilidad.
- [quickstart.md](quickstart.md): preparación y escenarios de validación ejecutables.

Reevaluación constitucional: PASS para diseño, sin excepciones. La spec continúa en `Draft`; la implementación requiere su aprobación según el principio II. Este paso no genera tareas ni código de aplicación.

## Complexity Tracking

Sin violaciones que justificar.
