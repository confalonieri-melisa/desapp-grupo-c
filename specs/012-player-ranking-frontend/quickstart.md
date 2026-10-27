# Quickstart: validar el ranking en el frontend

## Prerrequisitos

- Aplicación configurada según `.env.example`, con PostgreSQL y migraciones existentes.
- Un usuario autenticable, una versión de valuación activa y cotizaciones persistidas de esa versión para varios jugadores.
- Para los casos negativos, poder desactivar temporalmente la estrategia o simular respuestas HTTP en el entorno de prueba.

## Preparar y ejecutar

```bash
npm install
npm run dev
```

Iniciar sesión en el navegador. Abrir «Ranking» desde la navegación principal. El destino debe ser `/ranking`; el contrato visible esperado está en [ranking-ui.md](./contracts/ranking-ui.md).

## Recorrido de aceptación

1. Confirmar que cada resultado muestra puesto, identidad, liga, equipo, posición, puntaje, cotización con unidad, fecha/hora y enlace al perfil. Comparar orden y `rank` con `GET /api/players/ranking` para la misma selección. La cabecera debe informar estrategia y versión de esa respuesta.
2. Filtrar por liga y posición; escribir una parte de un nombre de equipo y confirmar. La consulta debe volver a la primera página y mostrar solo resultados coincidentes. Limpiar filtros debe volver al ranking general.
3. Con más de 20 resultados, avanzar y retroceder. Comprobar que la URL conserva filtros, el puesto no se reinicia al cambiar de página y los controles se deshabilitan en los extremos.
4. Probar una URL con `page` mayor al total actual. Debe volver a la última página válida; con cero resultados debe mostrar vacío sin paginación.
5. Probar carga pendiente, respuesta vacía, fallo de red, `409` y `401`. Deben aparecer estados distintos; el error recuperable permite reintentar y `401` dirige a `/login` sin datos del ranking visibles.
6. Cambiar filtros o cerrar sesión durante una consulta pendiente. La respuesta antigua no debe reemplazar la selección actual ni reaparecer tras el cierre de sesión.
7. Recorrer navegación, filtros, lista y paginación solo con teclado; comprobar foco, lectura de estados y legibilidad en viewport móvil.

## Comandos de verificación durante la implementación

```bash
npm test -- tests/unit/features/ranking tests/unit/services/client/player-ranking.service.spec.ts
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

## Validación realizada el 2026-10-27

- `npm test -- tests/unit/features/ranking tests/unit/services/client/player-ranking.service.spec.ts tests/integration/player-ranking.routes.spec.ts`: 21 pruebas aprobadas en 5 archivos.
- `npm run lint`, `npx tsc --noEmit`, `npm run build` y `git diff --check`: aprobados.
- `src/app/api/players/ranking/route.ts` y `specs/007-player-ranking/contracts/ranking.yaml`: sin cambios frente a la branch de partida.
- Recorrido manual autenticado en navegador con PostgreSQL y cotizaciones reales: pendiente. No se dispuso en esta sesión de un usuario de prueba y datos de ranking preparados para verificar los pasos 1–7 visualmente; no se registra como aprobado.
