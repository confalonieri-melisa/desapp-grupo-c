# Implementation Plan: Compra y venta P2P desde el perfil del jugador

**Branch**: `feature/019-p2p-trading-frontend` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: `specs/019-p2p-trading-frontend/spec.md`

## Summary

Extender el perfil de jugador con dos vistas, «Comprar» y «Vender (P2P)». El listado único de «Comprar» reúne ofertas P2P ajenas comprables y propias cancelables; «Vender (P2P)» permite publicar. Agregar una lectura autenticada de la cantidad disponible en el pool por jugador para mostrar la compra central solo con stock positivo, limitar su cantidad a ese dato y ocultarla cuando llegue a cero. Un cliente P2P tipado, la lectura de pool, lógica de validación/presentación y hooks aislados por sesión y jugador manejarán lecturas, confirmaciones, mutaciones y refrescos. La venta al pool no será visible en esta interfaz; su operación backend permanece intacta.

## Technical Context

**Language/Version**: TypeScript 5.x; Node.js >=22.12.0 (`package.json`).

**Primary Dependencies**: Next.js 16.3.4 App Router, React 19.2.8, Sass existente, `fetch`/`AbortController` nativos y componentes/iconos presentes. Sin dependencias nuevas.

**Storage**: Estado transitorio de React para lista, disponibilidad del pool, borrador, confirmación, clave de idempotencia y resultado. La nueva ruta lee PostgreSQL/Drizzle mediante el repositorio existente; sin migraciones, escritura nueva ni almacenamiento nuevo en navegador.

**Testing**: Vitest 5 con mocks de `fetch`, promesas controladas y harness de hooks del perfil; tests de ruta/servicio y repositorio contra PostgreSQL para la nueva lectura; pruebas de interacción de componentes cuando cubran comportamiento; revisión manual de teclado/foco y anchos de 360/1280 px. Build de Next.js.

**Target Platform**: Navegadores actuales de escritorio y móvil; aceptación visual/funcional a 360 y 1280 px.

**Project Type**: Aplicación web Next.js con frontend y rutas API en el mismo repositorio; incremento de interfaz más un endpoint backend de solo lectura sobre el pool existente.

**Performance Goals**: Una lectura de ofertas y una de disponibilidad del pool por carga de perfil; nuevas lecturas al reintentar, y disponibilidad actualizada tras cada compra central confirmada. El listado único de «Comprar» muestra ofertas propias y ajenas. Sin polling ni nuevo objetivo de latencia aprobado.

**Constraints**: Solo `INVESTOR` opera; ofertas filtradas por jugador; aceptación completa a precio fijo sin depender de cotización; `Idempotency-Key` estable para reintento manual compatible; la API P2P no da nombre de vendedor ni historial de ofertas; el campo de error real es `{ error }`. La publicación limita precio y total a los máximos que puede registrar una operación P2P (ver investigación). El nuevo GET valida jugador, exige autenticación y devuelve solo `{playerId, availableQuantity}` sin datos del SUPERUSER. Con cero se oculta la compra central; durante carga/error se muestra estado recuperable y no se permite iniciarla. Una lectura positiva limita el formulario, pero puede quedar obsoleta: `POST /api/orders/buy` conserva la validación definitiva. No se muestra venta al pool, no se altera su endpoint ni el trading central. Aislar datos financieros por sesión/jugador.

**Scale/Scope**: Un perfil, dos vistas de acción y los FR-001–030 de la feature 019. Una ruta GET de disponibilidad, sin nuevas mutaciones API, esquema de base de datos, página global P2P, matching, compras parciales ni nuevas reglas financieras.

## Constitution Check

_Gate antes de Phase 0: PASS para planificación. Reevaluación posterior a Phase 1: PASS para diseño. La spec sigue en `Draft`; la aprobación formal de la Project Owner es requisito previo a implementar/entregar según los principios II y IX._

| Principio | Verificación antes y después del diseño |
| --- | --- |
| I y II: alcance y especificación | La spec 019 define los recorridos y límites; el diseño consume capacidades de 017 y añade solo una consulta de stock del pool. No añade reglas financieras. |
| III: capas | Nueva ruta GET → controlador → servicio → repositorio; cliente HTTP, hooks y componentes del perfil separados. Ninguna regla financiera pasa a la UI. |
| IV: validación | La ruta valida jugador y autenticación; la UI controla formato, saldo y cantidad frente a disponibilidad visible. `POST buy` conserva la validación autoritativa de stock, saldo y cotización. |
| V: comportamiento verificable | Pruebas de ruta/servicio/repositorio para disponibilidad positiva, cero, recurso ausente y autenticación; pruebas UI de carga/error, rechazo, incertidumbre, replay, foco y contexto obsoleto. Sin tests de configuración o mera estructura. |
| VI: seguridad y auditoría | Se reutilizan JWT y cierre de sesión. El GET no expone identidad/saldo del pool ni escribe. La aceptación P2P conserva la clave de idempotencia; auditoría y atomicidad siguen en 017. |
| VII y VIII: incremento simple | Un listado compartido y estado local al perfil, sin librerías, infraestructura ni acceso global nuevos. Se preservan flujos centrales. |
| IX: terminado | [quickstart.md](quickstart.md) define verificación y revisión. La nueva API GET exige documentar OpenAPI/Swagger y Postman en implementación; la entrega requiere build, pruebas aplicables y aprobación formal de la Project Owner. |
| X: GitFlow/YAGNI | Rama `feature/019-p2p-trading-frontend` creada desde `main`, un incremento separado y sin código anticipado en esta etapa. |

No hay excepciones constitucionales que requieran Complexity Tracking. La discrepancia entre el error YAML de 017 (`message`) y el error real (`error`) se registra en investigación y contrato UI. La nueva ruta de lectura se documentará al implementarla sin modificar los endpoints de trading existentes.

## Project Structure

### Documentation (this feature)

```text
specs/019-p2p-trading-frontend/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/p2p-trading-ui.md
```

`tasks.md` se genera en la etapa `$speckit-tasks`, no en este plan.

### Source Code (repository root)

Rutas existentes y archivos previstos para la implementación posterior:

```text
src/app/players/[id]/page.tsx                              # existente: perfil, sesión y composición
src/app/api/players/[id]/pool-availability/route.ts          # propuesto: GET autenticado de disponibilidad
src/backend/controllers/pool-availability.controller.ts      # propuesto: respuesta mínima del pool
src/backend/services/pool-availability.service.ts            # propuesto: existencia del jugador y consulta
src/backend/repositories/pool-availability.repository.ts     # propuesto: lectura del pool canónico
src/frontend/context/AuthContext.tsx                        # existente: token, user.id y rol
src/frontend/services/client/
├── player-trading.service.ts                                # existente: portfolio y pool
├── portfolio-events.ts                                      # existente: actualización de saldo global
├── pool-availability.service.ts                             # propuesto: GET tipado
└── p2p-offers.service.ts                                    # propuesto: GET/POST/DELETE/accept tipados
src/frontend/features/profile/
├── hooks/usePlayerTrading.ts                                # existente: portfolio y órdenes al pool
├── hooks/usePoolAvailability.ts                             # propuesto: carga/estado/refresco por jugador
├── hooks/useP2POffers.ts                                    # propuesto: lista, borrador y mutaciones P2P
├── utils/player-trading.ts                                  # existente: cantidad, total y formato
├── utils/p2p-trading.ts                                     # propuesto: precio, oferta propia, errores P2P
└── components/PlayerTradingSection/
    ├── PlayerTradingSection.tsx                             # existente: sección y selección de vistas
    ├── PlayerOrderForm.tsx                                  # existente: compra central visible solo con stock positivo
    ├── PlayerConfirmationDialog.tsx                         # existente: confirmación pool
    ├── P2POfferList.tsx                                     # propuesto: listado único en Comprar; comprar ajenas, cancelar propias
    ├── P2PPublishForm.tsx                                   # propuesto: borrador de venta P2P
    ├── P2PConfirmationDialog.tsx                            # propuesto: confirmar aceptar/publicar/cancelar
    ├── P2PFeedback.tsx                                      # propuesto: progreso, comprobante y recuperación
    └── PlayerTradingSection.module.scss                    # existente: adaptación del diseño
tests/unit/
├── services/pool-availability.service.spec.ts               # propuesto: jugador, stock y fallos
├── services/client.pool-availability.service.spec.ts        # propuesto: GET y respuesta
├── services/client.p2p-offers.service.spec.ts               # propuesto: contratos HTTP y errores
└── features/profile/
    ├── use-pool-availability.spec.ts                         # propuesto: positivo, cero, error y actualización
    ├── p2p-trading.spec.ts                                  # propuesto: validación/derivaciones
    ├── use-p2p-offers.spec.ts                               # propuesto: estado y concurrencia
    └── player-p2p-section.spec.tsx                          # propuesto: interacciones significativas
tests/integration/pool-availability.routes.spec.ts           # propuesto: auth, lectura real y ausencia
tests/integration/pool-availability.repository.spec.ts       # propuesto: pool canónico, cero y sin mutación
specs/001-player-token-marketplace/contracts/openapi.yaml    # existente: documentar nuevo GET
specs/001-player-token-marketplace/contracts/postman_collection.json # existente: documentar nuevo GET
```

**Structure Decision**: El perfil sigue siendo dueño del jugador confirmado, sesión, cotización y portfolio. La nueva ruta de disponibilidad resuelve el mismo pool canónico que la compra y lee su tenencia del jugador sin escribir ni exponer datos del SUPERUSER. `usePoolAvailability` aísla la lectura por sesión/jugador y la refresca tras una compra central confirmada; con cero oculta el formulario, con carga/error muestra recuperación, y con cantidad positiva limita el input sin prometer ejecución. `useP2POffers` obtiene un único listado por jugador; cada fila compara `sellerId` con `user.id` para ofrecer «Comprar» o «Cancelar». `PlayerTradingSection` presenta el resumen común y organiza «Comprar» (compra al pool condicionada y listado P2P) y «Vender (P2P)» (solo publicación). Tras publicar, el resultado orienta a «Comprar» y la oferta `201` queda confirmada localmente hasta reconciliar el listado. Los diálogos P2P pueden compartir una pieza de confirmación sin reemplazar el diálogo central. El hook P2P mantiene comprobante e incertidumbre separadamente de las órdenes centrales y solicita el refresco del portfolio existente tras una aceptación confirmada.

## Phase 0: Research

Completada en [research.md](research.md). Se verificaron perfil y hooks actuales, formato real de rutas P2P, identidad de vendedor, precio fijo sin cotización, validación de dinero, idempotencia, errores, lectura del pool canónico y aislamiento de estado. No quedan `NEEDS CLARIFICATION` técnicos.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): DTO existentes, derivados de presentación, borrador, confirmaciones y transiciones.
- [contracts/p2p-trading-ui.md](contracts/p2p-trading-ui.md): consumo HTTP P2P y contrato previsto para el nuevo GET del pool, comportamiento visible, errores y accesibilidad.
- [quickstart.md](quickstart.md): escenarios reproducibles de validación tras implementar.

**Reevaluación del gate**: PASS para diseño. La spec permanece en estado `Draft`; su aprobación formal debe ocurrir antes de la implementación. Esta etapa no produce tareas ni cambios de aplicación.

## Complexity Tracking

Sin violaciones que justificar.
