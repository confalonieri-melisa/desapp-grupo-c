# Quickstart: validar Mi portfolio

## Preparación

1. Configurar el entorno y la base según `README.md`; ejecutar `npm install`, `npm run db:up`, `npm run db:migrate` y `npm run dev` si aún no están preparados.
2. Contar con un inversor sin posiciones y otro con posiciones de varios jugadores. Para los casos límite, disponer de datos de prueba con resultado positivo, negativo, cero y cotización ausente.
3. Iniciar sesión como inversor y abrir `/portfolio` desde «Mi portfolio» en la navegación.

## Recorrido

1. Comparar saldo y cada posición con el portfolio actual. Verificar que el valor de tenencias es la suma de valores conocidos, que el resultado suma solo resultados conocidos y que el patrimonio estimado es saldo más valor de tenencias.
2. Abrir `/players/[id]` y comprobar que la tarjeta «Valor del jugador», junto a «Rendimiento», muestra la evolución del token solo si hay al menos dos cotizaciones, con puntos, sombreado rosa y variación textual de cuatro decimales. No debe mostrar leyendas visibles de fecha y valor; el lector de pantalla debe recibir fechas y precios iniciales y finales en la descripción del gráfico. La tarjeta debe mantenerse compacta; la sección de Cotizaciones sigue debajo sin una curva ancha. Con cero o un registro debe explicarse la falta de comparación. En `/portfolio`, verificar que los resultados negativos aparecen al lado contrario de cero y llevan signo; si todos son cero, el eje y los carriles siguen visibles. Abrir el perfil desde la acción de un resultado positivo para acceder a la venta.
3. En el inversor sin posiciones, verificar saldo, mensaje de vacío, valor y resultado de cero, y patrimonio igual al saldo.
4. Simular una posición sin cotización: verificar etiquetas «parcial» y número de exclusiones. Si todas las posiciones carecen de cotización, verificar «no disponible», sin total engañoso.
5. Simular un fallo inicial: solo error y «Reintentar». Tras una compra o venta confirmada, simular un fallo de actualización: conservar cifras anteriores con aviso de desactualización y «Reintentar»; al reintentar con éxito, sustituir todos los bloques juntos.
6. Cerrar o cambiar la sesión durante una consulta: comprobar que no aparecen cifras de la cuenta anterior. Probar un fallo al resolver un nombre: el identificador permanece visible.
7. Revisar teclado, lector de pantalla y ancho de 320 px: nombres, signos, importes, estados y acción de reintento deben leerse sin hover ni pérdida de contenido.

## Verificación automatizada

Ejecutar `npm test`, `npm run lint` y `npm run build`. Revisar el contrato de estados en [contracts/ui-portfolio.md](contracts/ui-portfolio.md) y las reglas de cálculo en [data-model.md](data-model.md).

## Resultado de la implementación (2026-10-27)

- Los escenarios de cartera vacía, saldo cero, posiciones con valores positivos, negativos y cero, cotización ausente parcial y total, nombre no resuelto, error inicial, error de refresco y reintento se simularon con snapshots en los tests de `tests/unit/features/portfolio/`. Pasaron.
- El cambio de token, el cierre de sesión, el 401 y una respuesta antigua que llega después de una actualización nueva se simularon en `usePortfolioDashboard.spec.ts`. Pasaron; el snapshot anterior no llega a la vista de otra sesión.
- Se revisaron los componentes y estilos para 320 px: cuadrículas de una columna, texto con salto de línea, importes escritos junto a cada barra y acción de reintento accesible con teclado. Las barras son decorativas para tecnología asistiva; la lista de jugadores e importes aporta el contenido semántico.
- Límite: no se ejecutó un recorrido con cuentas y PostgreSQL reales, ni una sesión con lector de pantalla o navegador a 320 px en este entorno. Esas comprobaciones siguen recomendadas antes de la aprobación formal.
- Corrección posterior: se incorporaron a la rama los commits de `origin/main` que contienen «Mi historial». La navegación conserva esa ruta y añade «Mi portfolio» para inversores; `PortfolioNavigation.spec.ts` comprueba ambas. Las posiciones del portfolio se presentan en filas.
- Ajuste solicitado por el usuario: se quitó el gráfico de distribución de valor del portfolio. La evolución se ubicó en la tarjeta compacta de `/players/[id]` que reemplaza «Información del jugador», reutilizando las cotizaciones ya consultadas. `quote-trend.spec.ts` verifica curvas ascendentes, descendentes y planas; `player-trend-card.spec.ts` y `player-trading-page.spec.ts` verifican la tarjeta y su ubicación. `PortfolioPnlChart.spec.ts` verifica los accesos al perfil y la permanencia del eje y los carriles cuando todos los resultados son cero.
- Ajuste visual posterior: la curva muestra un punto por cotización y un degradado rosa inferior. La variación usa cuatro decimales; las fechas y los valores de los extremos permanecen en la descripción accesible del SVG, sin leyendas visibles. `quote-trend.spec.ts` cubre estos detalles.
