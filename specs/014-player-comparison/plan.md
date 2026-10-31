# Implementation Plan: Comparador de jugadores

**Branch**: `feature/014-player-comparison` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/014-player-comparison/spec.md`

## Summary

Agregar una ruta protegida de comparación de jugadores que reutilice la búsqueda del catálogo y el historial existente de cotizaciones. La matriz comparativa será la única representación principal de la identidad seleccionada: cada jugador aparecerá una sola vez como encabezado de columna, con el ícono `X` para quitarlo. La matriz mostrará únicamente cotización actual, variación desde la última cotización, score individual, score colectivo y score final.

La cotización actual se tomará del primer registro histórico de cada jugador. La variación se derivará en frontend con los dos registros más recientes. El gráfico mostrará solo puntos históricos reales, sin recomendaciones, clasificaciones, riesgos, oportunidades ni cambios de backend.

## Technical Context

**Language/Version**: TypeScript 5, Node.js >=22.12

**Primary Dependencies**: Next.js 16.3.4, React 19.2.8, Sass 1.99.0, `lucide-react` para iconos y `recharts` para el gráfico; todas ya están instaladas.

**Storage**: PostgreSQL existente consultado por las APIs actuales; no se agregan tablas, migraciones ni persistencia de selección.

**Testing**: Vitest 5 para derivaciones, estados, cliente/hooks y renderizado estático de componentes; ESLint, `npx tsc --noEmit`, `npm run build` y validación manual/visual según [quickstart.md](quickstart.md).

**Target Platform**: Navegadores de escritorio y móvil soportados por la aplicación, con validación visual desde 320 px de ancho y en un viewport de escritorio.

**Project Type**: Aplicación web Next.js con frontend y backend en `src/`.

**Performance Goals**: Una búsqueda por envío y una lectura de historial por jugador seleccionado; selección de hasta tres jugadores; no se agregan consultas de paginación ni polling. La vista debe mostrar una fase de carga explícita mientras las consultas responden.

**Constraints**: Solo lectura; sin endpoints nuevos; no usar `currentQuote` del catálogo como valor vigente porque la implementación actual lo devuelve como valor base constante; no inventar datos; no mostrar un jugador en chips, tarjetas y matriz a la vez; respuestas antiguas o de otra sesión no pueden actualizar la vista.

**Scale/Scope**: Una ruta nueva, un enlace de navegación, búsqueda de hasta 12 resultados iniciales sin paginación propia, selección local de 0 a 3 jugadores, matriz de cinco filas, gráfico multiserie compacto y pruebas asociadas.

## Constitution Check

*GATE: Revisado antes de investigación y después del diseño.*

| Principio | Evaluación |
|---|---|
| I y II: alcance y especificación | Pasa: el plan implementa solo la comparación definida en `spec.md`, sin ampliar el dominio financiero. |
| III y IV: capas y validación | Pasa: no se modifica backend; las únicas derivaciones son de presentación y se validan en el módulo frontend. |
| V y IX: verificación y terminado | Pasa: se prevén pruebas unitarias, compilación, lint, escenarios de error, accesibilidad y validación visual. La aprobación formal de la Project Owner sigue siendo requisito de entrega. |
| VI: seguridad y resiliencia | Pasa: se reutiliza autenticación, se manejan 401, errores parciales, abortado y respuestas tardías. No hay operaciones financieras. |
| VII y VIII: incrementalidad y simplicidad | Pasa: se reutilizan servicios, hooks, estilos y gráfico existentes; no se añade almacenamiento ni una API nueva. |
| X: GitFlow | Pasa para el diseño. La implementación deberá realizarse en `feature/014-player-comparison`, creada desde `main`; este plan no crea ni cambia ramas. |

**Gate result**: Pasa sin violaciones ni aclaraciones pendientes.

## Project Structure

### Documentation (this feature)

```text
specs/014-player-comparison/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-comparison.md
└── tasks.md                    # generado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── comparison/
│   │   ├── page.tsx
│   │   └── ComparisonPage.module.scss
│   └── api/                    # sin cambios
└── frontend/
    ├── components/GlobalNav/GlobalNav.tsx  # agregar enlace Comparador
    ├── features/comparison/
    │   ├── comparison.ts
    │   ├── hooks/usePlayerComparison.ts
    │   ├── utils/comparison.ts
    │   └── components/
    │       ├── ComparisonSearch.tsx
    │       ├── ComparisonMatrix.tsx
    │       ├── ComparisonChart.tsx
    │       └── ComparisonStates.tsx
    └── services/client/
        ├── player.service.ts        # reutilizado
        └── player-quotes.service.ts # reutilizado

tests/unit/features/comparison/
├── comparison.spec.ts
├── usePlayerComparison.spec.ts
├── ComparisonSearch.spec.ts
├── ComparisonMatrix.spec.ts
├── ComparisonChart.spec.ts
└── ComparisonPage.spec.ts
```

**Structure Decision**: La ruta orquesta autenticación y composición. El módulo `features/comparison` concentra selección, derivaciones, carga y componentes. El servicio de catálogo y el de cotizaciones permanecen como fuentes existentes. La matriz es la representación única de identidad desde que existe al menos un jugador seleccionado; con un jugador muestra su columna y el mensaje de que falta otro, sin crear un chip o tarjeta adicional.

## Design Decisions

1. **Ruta y navegación**: agregar `/comparison` y un enlace autenticado «Comparador» en `GlobalNav`, con `aria-current="page"` solo en esa ruta.
2. **Layout**: mantener la jerarquía visual de la referencia: título y descripción, buscador, contador y superficie comparativa. En desktop, la matriz ocupa el área principal y el gráfico un panel compacto a su derecha; en mobile, se apilan verticalmente.
3. **Identidad única**: no se crearán chips ni tarjetas de selección. La cabecera de la matriz es la única representación principal y contiene imagen/placeholder, nombre, equipo, liga y botón `X`. El contador se muestra como texto y no repite identidades.
4. **Selección**: estado local ordenado, sin duplicados y con máximo de tres. Al agregar el segundo jugador se muestra automáticamente la comparación. Al quitarlo se actualizan matriz, series, leyenda y estados; con uno queda la columna única y el mensaje de selección incompleta.
5. **Búsqueda**: reutilizar `getPlayers` con `name` y `limit=12`. Confirmar por Enter o botón, limpiar con el patrón existente y no ofrecer paginación propia en el comparador. Un jugador seleccionado se marca como ya agregado.
6. **Carga de datos**: al seleccionar cada jugador se solicita su historial con `getPlayerQuotes`. Se mantiene un estado independiente por jugador para que un error de una serie no oculte la matriz ni las series válidas. Se invalidan o abortan solicitudes al quitar/reemplazar jugadores o cambiar de sesión.
7. **Cotización y variación**: `items[0]` es la cotización actual. Con los dos registros más recientes se deriva `((actual - anterior) / anterior) * 100`. Se conserva el signo y se formatea como porcentaje; con menos de dos puntos se muestra «No disponible». No se calculan diferencias adicionales.
8. **Matriz**: exactamente cinco filas: cotización actual, variación desde la última cotización, score individual, score colectivo y score final. Los valores y unidades se conservan; el score colectivo ausente se rotula «No disponible». No se muestran estadísticas deportivas, posición como fila, ranking, explicación de score ni acciones financieras.
9. **Gráfico**: multiserie de cotizaciones históricas reales, ordenadas cronológicamente y limitada a los 15 puntos más recientes por jugador para conservar el carácter compacto. Eje compartido en créditos por token; no se interpolan puntos ni se normalizan valores. Una serie requiere al menos dos puntos; las series insuficientes se informan individualmente.
10. **Contexto de valuación**: conservar estrategia y versión internamente para evitar mezclar silenciosamente registros incompatibles. Si difieren entre jugadores, mostrar un aviso contextual y no declarar un ganador.
11. **Estados**: representar por separado inicial vacío, un jugador, búsqueda cargando, búsqueda sin resultados, carga de cotizaciones, contenido parcial, sin historial, error recuperable y 401. Los errores ofrecen reintento y no se presentan como ausencia de datos.
12. **Responsive**: en desktop, matriz y gráfico lado a lado; en mobile, matriz y gráfico apilados. La matriz de tres jugadores puede desplazarse horizontalmente, manteniendo visible la columna «Métrica» y los encabezados. Las mismas cinco filas aparecen en ambos tamaños.
13. **Accesibilidad**: tabla semántica para la matriz, botones con nombres completos, foco visible, anuncios de carga/selección/error con live regions, colores acompañados por texto y alternativa textual del gráfico con series, primer/último valor y fechas.

## Phase 0: Research

Consultar [research.md](research.md). Las decisiones de arquitectura, búsqueda, selección, cotizaciones, gráfico, responsive y accesibilidad quedan resueltas con capacidades existentes; no quedan `NEEDS CLARIFICATION` técnicos.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md): selección local, estados por jugador, snapshot de cotización, variación derivada y series históricas.
- [contracts/ui-comparison.md](contracts/ui-comparison.md): contrato observable de la ruta, estados, matriz, gráfico y reutilización de consultas existentes.
- [quickstart.md](quickstart.md): validación funcional, de estados, responsive, accesibilidad, pruebas automatizadas y revisión visual.

**Post-design constitution check**: Pasa. La solución es frontend-only, no agrega endpoints ni persistencia, reutiliza las capas actuales y limita las derivaciones al cálculo de variación explícitamente aprobado por la especificación.

## Risks and Mitigations

| Riesgo | Impacto | Mitigación |
|---|---|---|
| `currentQuote` del catálogo no representa la cotización vigente | Alto | Usar `getPlayerQuotes` e `items[0]` como fuente de la matriz. |
| Tres historiales implican cargas independientes | Medio | Estado por jugador, abortado por generación y no bloquear la matriz por fallos parciales. |
| Contextos de estrategia/versiones distintos | Alto | Mostrar contexto y advertencia; no declarar ganador ni mezclar scores silenciosamente. |
| Tres columnas en mobile reducen legibilidad | Medio | Desplazamiento horizontal de la matriz, columna de métricas visible y prueba a 320 px. |
| Gráfico inaccesible para lector de pantalla | Medio | Resumen textual equivalente, leyenda textual y no depender solo del color. |
| Búsqueda amplia devuelve más de 12 jugadores | Bajo | Mantener el límite del catálogo en v1 y exigir refinar el nombre; no agregar paginación a esta feature. |

