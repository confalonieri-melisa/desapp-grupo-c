# Feature Specification: búsqueda de jugadores por nombre

**Feature Branch**: `feature/011-player-name-search`
**PR Base**: `feature/009-player-token-trading-frontend`
**Status**: Implemented for review

## Objective

Un inversor autenticado puede buscar jugadores por una parte del nombre desde la home, sin limitar la búsqueda a la página visible del catálogo.

## Requirements

- La home ofrece una barra con nombre accesible, envío por Enter o botón «Buscar» y acción para limpiar la búsqueda.
- El valor buscado se conserva en la URL; cambiarlo vuelve a la página 1. La búsqueda se combina con liga, equipo y posición y se mantiene al paginar.
- `GET /api/players` acepta `name` opcional, recorta espacios y busca sin distinguir mayúsculas antes de contar y paginar resultados.
- Una búsqueda sin resultados muestra el estado vacío existente. No se modifica el esquema de la base de datos.
- El parámetro nuevo pertenece solo al catálogo; el endpoint de ranking conserva su contrato.

## Verification

- Pruebas de URL, cliente, validación, servicio, repositorio y ruta.
- Ejecutar `npm test` dirigido, `npm run lint`, `npx tsc --noEmit` y `npm run build`.
- Consultar la API local con una búsqueda que devuelva más de una página y confirmar que `total` y `data` reflejan el filtro.
