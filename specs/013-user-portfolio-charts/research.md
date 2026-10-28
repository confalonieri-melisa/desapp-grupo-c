# Research: Mi portfolio

## Decisión 1: Fuente de datos

**Decision**: Reutilizar `GET /api/portfolio` a través de `getPortfolio()` y resolver nombres con `getPlayer()` por identificador distinto.

**Rationale**: El portfolio ya incluye saldo, cantidad, precio promedio, cotización, valor y resultado no realizado. No contiene nombres. La consulta de jugador existente cubre ese dato sin ampliar la API. Si el nombre falla, se muestra el identificador.

**Alternatives considered**: Agregar nombres al endpoint o consultar el catálogo paginado. La primera amplía contrato backend sin necesidad; la segunda no garantiza hallar todas las posiciones en una página.

## Decisión 2: Gráficos

**Decision**: La comparación de resultado en el portfolio usa barras HTML/CSS. El perfil del jugador muestra una curva SVG de las cotizaciones que ya consulta, con fechas y valores textuales; la distribución de valor agregada se retiró a pedido del usuario.

**Rationale**: La serie temporal del token responde a la necesidad de ver si subió o bajó en el propio perfil. Las cotizaciones históricas ya están disponibles allí y no requieren nuevas solicitudes ni una biblioteca. El texto hace visibles cero, datos ausentes y tendencias sin depender de hover o color.

**Alternatives considered**: Biblioteca de gráficos o canvas. Añaden dependencia o complejidad de accesibilidad sin aportar una interacción necesaria.

## Decisión 3: Totales y precisión semántica

**Decision**: Derivar agregados del snapshot usando únicamente `currentValue` y `unrealizedPnl` no nulos. Mantener cero como número válido y contar exclusiones por métrica. El patrimonio estimado hereda la completitud del valor de tenencias.

**Rationale**: El backend ya calcula esas cifras por posición. Recalcularlas desde precio y cantidad duplicaría reglas; convertir `null` en cero escondería datos incompletos.

**Alternatives considered**: Sumar todas las posiciones usando cero por ausencia o ocultar cualquier suma parcial. La primera induce a error y la segunda pierde información útil.

## Decisión 4: Actualización y privacidad

**Decision**: Consultar al entrar y reintentar; observar `PORTFOLIO_UPDATED_EVENT` mientras la página está montada. Asociar el estado al token actual, cancelar consultas obsoletas y retirar datos al cambiar de sesión o recibir 401. Mantener el último snapshot solo en fallos de refresco dentro de la misma sesión y marcarlo desactualizado.

**Rationale**: El evento existente comunica cargas y resultados del portfolio en la misma ventana. La ruta también debe consultar por sí misma al montarse, porque un evento pasado no se conserva y los eventos no cruzan pestañas.

**Alternatives considered**: Mantener un estado global nuevo o depender únicamente del evento. Ambos agregan complejidad o dejan la página sin datos al entrar.

## Decisión 5: Verificación

**Decision**: Probar los cálculos de completo/parcial/ausente y los cambios de sesión y refresco con las convenciones Vitest existentes; completar con revisión a 320 px y teclado.

**Rationale**: Los cálculos y las transiciones son los puntos donde un error puede presentar cifras falsas o datos ajenos. La inspección visual y de accesibilidad cubre propiedades que los tests de cálculo no observan.

**Alternatives considered**: Tests que solo comprueben estructura o snapshots de marcado; no verifican los riesgos funcionales.
