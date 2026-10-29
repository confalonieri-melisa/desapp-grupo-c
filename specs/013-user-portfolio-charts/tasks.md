# Tasks: Visualización del portfolio del inversor

**Input**: `specs/013-user-portfolio-charts/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/ui-portfolio.md`, `quickstart.md`

**Tests**: Los escenarios de la spec y el principio V de la constitución requieren verificar cálculos, privacidad y estados. Incluir pruebas de comportamiento donde agregan cobertura real, sin tests estructurales triviales.

**Organization**: Fases por historia de usuario; cada una aporta un resultado verificable. Los archivos indicados son rutas desde la raíz del repositorio.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Trabajo en archivos distintos sin depender de otra tarea incompleta.
- **[USn]**: Historia de usuario correspondiente.

## Phase 1: Setup

**Purpose**: Aislar la implementación de esta feature según GitFlow.

- [X] T001 Crear `feature/013-user-portfolio-charts` desde `main` y llevar los artefactos `specs/013-user-portfolio-charts/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/ui-portfolio.md`, `quickstart.md` y `tasks.md` a esa rama sin perder cambios de la rama activa.

---

## Phase 2: Foundational

**Purpose**: Consulta segura y resolución de jugadores usadas por las cuatro historias.

- [X] T002 Implementar en `src/frontend/features/portfolio/hooks/usePortfolioDashboard.ts` la lectura inicial con `getPortfolio`, identidad ligada al token, cancelación o invalidación de respuestas obsoletas y limpieza por cambio de sesión o 401; exponer carga, contenido, vacío y error inicial con reintento.
- [X] T003 Añadir en `src/frontend/features/portfolio/hooks/usePortfolioDashboard.ts` la resolución de nombres por `playerId` distinto con `getPlayer`, manteniendo el identificador cuando falle y evitando que respuestas de otra sesión aparezcan.
- [X] T004 Verificar en `tests/unit/features/portfolio/usePortfolioDashboard.spec.ts` carga, error inicial y reintento, fallo de nombre con identificador visible, 401 y respuesta tardía tras cambio de token.

**Checkpoint**: Snapshot y nombres propios disponibles de forma segura para la página.

---

## Phase 3: User Story 1 - Consultar mi cartera actual (Priority: P1) 🎯 MVP

**Goal**: Página protegida con saldo, posiciones y totales correctos.

**Independent Test**: Abrir la página con posiciones y sin posiciones; cotejar saldo, datos por jugador y agregados con el portfolio actual.

- [X] T005 [US1] Derivar en `src/frontend/features/portfolio/portfolio.ts` valor de tenencias desde `currentValue`, resultado total desde `unrealizedPnl` y patrimonio estimado desde saldo más valor de tenencias: `null` se excluye, cero se incluye; con `items=[]` ambos agregados son 0; con posiciones y ningún dato disponible el agregado es `null`/«no disponible»; con cobertura parcial mostrar suma conocida y cantidad excluida.
- [X] T006 [US1] Verificar en `tests/unit/features/portfolio/portfolio.spec.ts` cartera vacía, saldo cero, valores positivos y negativos, cero, cobertura parcial y ausencia total de cotización para cada agregado.
- [X] T007 [P] [US1] Crear `src/frontend/features/portfolio/components/PortfolioSummary.tsx` con saldo, valor de tenencias, resultado no realizado y patrimonio estimado en créditos, incluyendo etiquetas «parcial»/«no disponible» y cantidad excluida.
- [X] T008 [P] [US1] Crear `src/frontend/features/portfolio/components/PortfolioPositions.tsx` con todas las posiciones, nombre o identificador, cantidad, precio promedio, cotización, valor y resultado; distinguir cero y dato ausente.
- [X] T009 [US1] Integrar hook, resumen, posiciones, redirección de sesión ausente y estados iniciales en `src/app/portfolio/page.tsx`; agregar acceso «Mi portfolio» solo para inversores en `src/frontend/components/GlobalNav/GlobalNav.tsx`.
- [X] T010 [US1] Diseñar el contenedor, tarjetas, textos y estados de la página en `src/app/portfolio/PortfolioPage.module.scss`, siguiendo los estilos existentes y manteniendo lectura a 320 px.
- [X] T011 [US1] Verificar en `tests/unit/features/portfolio/PortfolioPage.spec.ts` acceso propio, cartera vacía, resumen, posiciones y ausencia de cifras en error inicial.

**Checkpoint**: US1 es utilizable sin gráficos.

---

## Phase 4: User Story 2 - Ver la evolución del token por jugador (Priority: P2)

**Goal**: Ver cómo cambió la cotización real del token en el perfil del jugador.

**Independent Test**: Mostrar historiales ascendentes, descendentes, planos, con un registro y vacíos; cotejar curva, fechas, importes y estados.

- [X] T012 [US2] Crear `src/frontend/features/profile/components/QuoteTrend/QuoteTrend.tsx` con la historia ya cargada por `usePlayerQuotes`, curva cronológica, fechas y precios inicial/final, variación textual y explicación cuando hay menos de dos registros.
- [X] T013 [US2] Integrar `QuoteTrendCard` en `/players/[id]/page.tsx` en lugar de `PlayerInformation`, junto a «Rendimiento», con ancho compacto; quitar la curva ancha de `PlayerQuotesSection`, retirar la distribución de valor agregada del portfolio y no añadir consultas de cotizaciones a sus posiciones.
- [X] T014 [US2] Verificar en `tests/unit/features/profile/quote-trend.spec.ts`, `player-trend-card.spec.ts` y `player-trading-page.spec.ts` orden cronológico, subida, bajada, estabilidad, cero y un registro, ubicación en la tarjeta compacta y ausencia de puntos inventados.

**Checkpoint**: US2 puede demostrarse con el resumen y las posiciones de US1.

---

## Phase 5: User Story 3 - Comparar resultados no realizados (Priority: P2)

**Goal**: Comparar resultados positivos, negativos, cero y ausentes por jugador.

**Independent Test**: Mostrar las cuatro clases de resultado y verificar signo, ubicación respecto de cero, importes y total parcial.

- [X] T015 [US3] Crear `src/frontend/features/portfolio/components/PortfolioPnlChart.tsx` con escala respecto de cero, barras a lados opuestos según signo, signo e importe textuales, enlaces al perfil y posiciones sin `unrealizedPnl` separadas; conservar eje y carriles cuando todos son cero.
- [X] T016 [US3] Integrar `PortfolioPnlChart` en `src/app/portfolio/page.tsx` y su distribución adaptable en `src/app/portfolio/PortfolioPage.module.scss`.
- [X] T017 [US3] Verificar en `tests/unit/features/portfolio/PortfolioPnlChart.spec.ts` positivo, negativo, cero, `null`, todos ausentes, enlaces al perfil y lectura sin depender del color.

**Checkpoint**: El resultado refleja el mismo snapshot que el resumen; la tendencia aparece en el perfil y reutiliza su historial de cotizaciones.

---

## Phase 6: User Story 4 - Consultar datos vigentes y protegidos (Priority: P2)

**Goal**: Actualizar tras operar, recuperar fallos y evitar datos entre sesiones.

**Independent Test**: Confirmar una operación, observar actualización exitosa y fallida, reintentar y cambiar de sesión con una respuesta pendiente.

- [X] T018 [US4] Extender `src/frontend/features/portfolio/hooks/usePortfolioDashboard.ts` para escuchar `PORTFOLIO_UPDATED_EVENT` del token vigente, entrar en refresco ante `loading`, adoptar el snapshot completo ante `success` y conservar el último snapshot de esa sesión marcado desactualizado ante `error` o fallo de consulta; ignorar eventos y respuestas obsoletos.
- [X] T019 [US4] Mostrar en `src/app/portfolio/page.tsx` y `src/app/portfolio/PortfolioPage.module.scss` avisos visibles durante refresco y fallo de refresco, con «Reintentar»; conservar resumen, posiciones y comparación del snapshot previo únicamente para la misma sesión.
- [X] T020 [US4] Verificar en `tests/unit/features/portfolio/usePortfolioDashboard.spec.ts` evento de carga/éxito/error, fallo de consulta tras snapshot, reintento, cambios de token, 401 y carreras de respuestas; asegurar que un snapshot antiguo nunca reemplaza uno más nuevo.
- [X] T021 [US4] Verificar en `tests/unit/features/portfolio/PortfolioPage.spec.ts` que el error de refresco deja visibles cifras marcadas desactualizadas y que el error inicial o cierre de sesión no deja cifras.

**Checkpoint**: La página cumple la aclaración sobre cifras anteriores tras fallar la actualización.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validación final de comportamiento, presentación y alcance.

- [ ] T022 Revisar `src/app/portfolio/page.tsx` y `src/app/portfolio/PortfolioPage.module.scss` a 320 px, con teclado y lector de pantalla, corrigiendo cualquier texto, foco, estado o barra que no pueda comprenderse sin hover o color.
- [ ] T023 Ejecutar los escenarios actualizados de `specs/013-user-portfolio-charts/quickstart.md`, incluida evolución del token y acceso al perfil, con inversor vacío, inversor con posiciones, cotización ausente, refresco fallido y cambio de sesión; registrar resultados y límites observados en ese mismo archivo.
- [X] T024 Ejecutar `npm test`, `npm run lint` y `npm run build`; corregir fallos atribuibles a esta feature en `src/app/portfolio/`, `src/frontend/features/portfolio/` o `tests/unit/features/portfolio/`.

---

## Dependencies & Execution Order

- **Setup → Foundational → US1**. US1 es el MVP y entrega la página sin gráficos.
- **US2 y US3** dependen de US1 para el contenedor y los nombres, pero sus componentes y pruebas se pueden construir independientemente. La integración en `page.tsx` y el SCSS compartido se hace en orden para evitar conflictos de archivo.
- **US4** depende de la página de US1; sus estados se aplican a la comparación y a las posiciones si US2 y US3 ya están integradas.
- **Polish** sigue a las cuatro historias.

## Parallel Opportunities

- **US1**: T007 (`PortfolioSummary.tsx`) y T008 (`PortfolioPositions.tsx`) se pueden realizar en paralelo después de T005.
- **US2 y US3**: T012/T014 y T015/T017 pueden desarrollarse en paralelo después de US1 porque usan archivos distintos; T013 y T016 integran secuencialmente en los archivos compartidos.
- **US4**: La preparación de escenarios de T020 y T021 usa archivos de prueba distintos, aunque las verificaciones finales dependen de T018 y T019.

## Implementation Strategy

1. Completar Setup y Foundational; verificar identidad y carga propia.
2. Completar US1 y validar el MVP de solo lectura.
3. Añadir US2 y US3 con sus verificaciones independientes.
4. Añadir US4, revisar privacidad y recuperación; cerrar con la guía y los comandos de validación.
