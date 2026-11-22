# Research: decisiones para el scheduler básico

## Alcance reducido

La solicitud posterior del usuario reemplaza el diseño de reintentos durables, ítems por jugador, frescura de siete días y recuperación exacta. La sincronización es completa o fallida; las cotizaciones mantienen el resultado parcial que ya produce el dominio.

## Calendario

El worker usa `@js-temporal/polyfill` para día semanal, hora local y zona IANA. La desambiguación `compatible` elige la primera hora repetida y desplaza una inexistente por el salto horario. Sólo calcula horarios transcurridos durante la vida del proceso; PostgreSQL evita duplicados si hay varios workers.

## Coordinación y atomicidad

Un bloqueo asesor de sesión PostgreSQL cubre todos los lotes y sus vías manuales. La conexión reservada es también la conexión de sus transacciones. Cada sincronización o publicación de cotizaciones confirma todos sus efectos y el resultado del turno en una transacción. El scraper y los cálculos ocurren antes de abrirla. Esto evita tablas de ítems y reanudación de efectos individuales.

## Fallback y fallos

Un fallo de WhoScored deja intactos los jugadores persistidos. La obtención se repite una vez tras un segundo; después se registra fallo. El recálculo puede utilizar los jugadores locales. Un turno interrumpido queda fallido cuando otro proceso obtiene el bloqueo; no se reproduce. Los turnos `PENDING` ya guardados sí pueden empezar tras reiniciar.
