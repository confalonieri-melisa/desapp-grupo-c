# Implementation Plan: Visualización del portfolio del inversor

**Branch**: `feature/013-user-portfolio-charts` (prevista; la rama activa al planificar es `feature/012-player-ranking-frontend`) | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/013-user-portfolio-charts/spec.md`

## Summary

Agregar la página protegida «Mi portfolio» con saldo, posiciones, resumen y comparación de resultado no realizado con enlace al perfil para vender. En `/players/[id]`, ubicar una curva breve en la tarjeta junto a «Rendimiento», en lugar de «Información del jugador». Reutilizar el portfolio autenticado, el historial de cotizaciones que ya carga el perfil, la consulta de nombres y el aviso de actualización. Derivar los totales en el front distinguiendo cartera vacía, valor conocido, total parcial y dato no disponible. Usar SVG y HTML/CSS accesibles, sin biblioteca de gráficos ni cambios de persistencia o API.

## Technical Context

**Language/Version**: TypeScript 5, Node.js >=22.12

**Primary Dependencies**: Next.js 16.3.4, React 19.2.8, Sass 1.99.0; dependencias ya instaladas

**Storage**: PostgreSQL existente, solo lectura a través del backend actual; sin tablas ni migraciones nuevas

**Testing**: Vitest 5 para cálculos y estados de interfaz; ESLint, compilación de Next.js y verificación manual de `quickstart.md`

**Target Platform**: Navegadores de escritorio y móvil soportados por la aplicación; ancho de referencia mínimo 320 px

**Project Type**: Aplicación web Next.js con frontend y backend en `src/`

**Performance Goals**: Una lectura de portfolio por entrada o reintento; una lectura por jugador distinto para resolver nombres; la curva del perfil reutiliza la consulta de cotizaciones ya existente sin solicitudes adicionales

**Constraints**: Mostrar todas las posiciones sin truncamiento silencioso; no presentar valores parciales como completos; impedir que resultados de otra sesión o de consultas antiguas lleguen a la vista; accesibilidad sin depender de color o cursor

**Scale/Scope**: Una ruta nueva, resumen, posiciones y comparación de resultados; una curva en la ruta de perfil existente; un derivador de métricas y consultas existentes; ninguna API nueva

## Constitution Check

*GATE: Revisado antes de investigación y después del diseño.*

| Principio | Evaluación |
|---|---|
| I y II: alcance y especificación | Pasa: se implementa la spec 013; no se agrega evolución histórica ni reglas financieras nuevas. |
| III y IV: capas y validación | Pasa: la API y el dominio no cambian; las sumas son derivaciones de presentación de datos ya calculados. |
| V y IX: verificación y terminado | Pasa: la validación prevista cubre signos, cero, ausencias, privacidad, refresco, accesibilidad y compilación; la aprobación formal sigue siendo condición de entrega. |
| VI: seguridad y resiliencia | Pasa: sesión existente, consulta autenticada y estados de fallo recuperables; no se añaden operaciones financieras. |
| VII y VIII: incrementalidad y simplicidad | Pasa: reutiliza servicios y estilos actuales, sin biblioteca de gráficos ni nuevo almacenamiento. |
| X: GitFlow | Pasa para el diseño. La implementación deberá hacerse en `feature/013-user-portfolio-charts` creada desde `main`; el plan no crea ni conmuta ramas. |

**Gate result**: Sin violaciones ni aclaraciones pendientes. Revisión posterior al diseño: sin cambios.

## Project Structure

### Documentation (this feature)

```text
specs/013-user-portfolio-charts/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-portfolio.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   └── portfolio/
│       ├── page.tsx
│       └── PortfolioPage.module.scss
└── frontend/
    ├── components/GlobalNav/GlobalNav.tsx
    ├── features/portfolio/
    │   ├── portfolio.ts
    │   ├── hooks/usePortfolioDashboard.ts
    │   └── components/
    │       ├── PortfolioSummary.tsx
    │       ├── PortfolioPositions.tsx
    │       └── PortfolioPnlChart.tsx
    ├── features/profile/components/
    │   ├── QuoteTrend/QuoteTrend.tsx
    │   ├── QuoteTrend/QuoteTrend.module.scss
    │   ├── QuoteTrend/QuoteTrendCard.tsx
    │   └── PlayerQuotesSection/PlayerQuotesSection.tsx (sin la curva ancha)
    └── services/client/
        ├── player-trading.service.ts (reutilizado)
        ├── player.service.ts (reutilizado)
        ├── player-quotes.service.ts (reutilizado)
        └── portfolio-events.ts (reutilizado)
tests/unit/features/portfolio/
├── portfolio.spec.ts
├── usePortfolioDashboard.spec.ts
├── PortfolioPnlChart.spec.ts
└── PortfolioPage.spec.ts
tests/unit/features/profile/
├── quote-trend.spec.ts
└── player-trend-card.spec.ts
```

**Structure Decision**: La ruta Next.js orquesta la sesión y los estados; el módulo de feature separa cálculo, carga y bloques visuales. No se crean entidades persistidas. Los nombres se obtienen por jugador distinto y un fallo de nombre mantiene el identificador.

## Design Decisions

1. **Cálculos**: `portfolio.ts` deriva por separado valor de tenencias y resultado no realizado. `null` significa ausencia, mientras que `0` participa de las sumas y de los gráficos. Cartera vacía devuelve ambos agregados en cero y patrimonio igual al saldo. Con posiciones pero ningún dato disponible, el agregado y el patrimonio afectado son «no disponible». Con cobertura parcial, se muestra la suma conocida, la etiqueta «parcial» y cantidad omitida.
2. **Gráficos**: el perfil del jugador reutiliza su historial de cotizaciones y dibuja una línea cronológica únicamente con dos o más registros reales; inicio, fin y cambio se escriben en texto. La comparación de resultados en el portfolio se extiende desde cero según el signo, con importe y enlace al perfil. El eje y los carriles permanecen cuando todos los resultados son cero. Datos ausentes figuran fuera de la escala. Se conserva lectura semántica a 320 px.
3. **Consulta y sesión**: `usePortfolioDashboard` solicita el snapshot al montar y al reintentar, cancela o invalida respuestas anteriores, y expone solo datos de la sesión vigente. Un 401 limpia datos y usa el cierre de sesión existente. La resolución de nombres es secundaria y no bloquea el snapshot.
4. **Actualización**: al volver a la ruta se consulta de nuevo; mientras la ruta esté montada escucha `PORTFOLIO_UPDATED_EVENT` solo para el mismo token. Un evento `loading` marca datos anteriores como pendientes; `success` reemplaza el snapshot completo; `error` conserva el último snapshot de esa sesión como desactualizado y ofrece reintento. La propia consulta de la página usa la misma regla. Un evento de carga que no confirme operación puede disparar el mismo estado de refresco, sin alterar cifras.
5. **Presentación**: `/portfolio` muestra carga inicial, error inicial, vacío o contenido. Con contenido previo, refresco y fallo de refresco preservan resumen, posiciones y comparación de resultados con aviso visible. `/players/[id]` incorpora la curva a una tarjeta compacta junto a «Rendimiento», y conserva la sección de cotizaciones debajo. Se reutiliza el lenguaje visual de las rutas actuales y el formato español de créditos.

## Phase 0: Research

Consultar [research.md](research.md) para las decisiones y alternativas consideradas. No quedan `NEEDS CLARIFICATION` técnicos.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): estructura del snapshot, estados derivados e invariantes de cálculo.
- [contracts/ui-portfolio.md](contracts/ui-portfolio.md): comportamiento observable de la ruta y dependencias existentes.
- [quickstart.md](quickstart.md): escenarios de validación manual y comandos de verificación.

**Post-design constitution check**: Pasa. La solución mantiene una feature de frontend pequeña, con una única ruta nueva y sin contrato backend público nuevo.
