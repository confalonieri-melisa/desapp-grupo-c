# Quickstart de validación: Mi historial

Guía para validar la implementación futura de la [spec](./spec.md) y el [contrato UI](./contracts/history-ui.md). No se agregan comandos ni código de implementación aquí.

## Prerrequisitos

- Node.js >=22.12.0, dependencias instaladas con `npm ci`.
- PostgreSQL y variables de `.env` configuradas según [README](../../README.md) y `.env.example`.
- Backend de la feature 006 disponible en `main`; esta rama incluye además las features frontend 008 (cotizaciones) y 009 (compra y venta).
- Dos usuarios inversores de prueba, A y B, y operaciones completadas conocidas: A con compras y ventas en más de 20 filas para paginación, B con operaciones distintas. Preparar también un usuario sin operaciones.

## Inicio

```powershell
npm run db:up
npm run db:migrate
npm run dev
```

Abrir `http://localhost:3000`, iniciar sesión como A y entrar a «Mi historial» desde la navegación principal. Si el entorno ya tiene base y migraciones aplicadas, basta `npm run dev`.

## Escenarios

1. **Lectura histórica**: comparar una compra y una venta con sus filas persistidas o la respuesta de `GET /api/users/{A}/transactions?limit=20&offset=0`. Verificar tipo textual, jugador, fecha, hora, cantidad, cotización aplicada con unidad y total. Cambiar una cotización actual y recargar: los importes históricos deben conservarse.
2. **Zona horaria**: usar una operación cercana a medianoche UTC. Comparar el instante con `America/Argentina/Buenos_Aires`; la vista debe indicar «Hora de Buenos Aires (ART)» y mostrar el día correcto.
3. **Jugador disponible y ausente**: una operación con perfil resoluble debe mostrar nombre y enlace al perfil. Otra cuyo `playerId` no resuelva debe mostrar el ID sin enlace, manteniendo la operación completa.
4. **Paginación**: con más de 20 operaciones, activar «Ver más operaciones» hasta el final. Comparar el orden con la API, comprobar IDs únicos, permanencia de filas previas, progreso mientras carga y desaparición del botón al final. Insertar una operación nueva entre páginas: la lista visible no debe desplazarse; al salir y volver debe aparecer la nueva.
5. **Vacío y errores**: entrar con usuario sin operaciones para ver vacío solo tras un `200` exitoso. Simular un fallo de red en la primera solicitud y usar «Reintentar»; después simular fallo en una página posterior y verificar que solo se reintenta ese offset sin borrar filas previas.
6. **Sesión**: expirar el token durante carga inicial y adicional; se deben retirar operaciones y navegar a login. Iniciar A, retrasar su respuesta de red, cerrar sesión e iniciar B; al completar la respuesta de A, B solo debe ver sus operaciones. Alterar manualmente la ruta visible: no debe ofrecer selección de ID ajeno.
7. **Accesibilidad y móvil**: recorrer enlace, perfiles, «Ver más operaciones» y reintento solo con teclado; comprobar foco visible, anuncio de carga/error, tipo discernible sin color y etiquetas legibles en pantalla estrecha.

## Comprobaciones automatizadas previstas

```powershell
npm test -- tests/unit/features/history tests/unit/services/client/transaction-history.service.spec.ts
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Los tests de la feature se crearán durante la implementación; el comando dirigido presupone esos archivos. Para la forma de los datos y las transiciones esperadas, consultar [data-model.md](./data-model.md).
