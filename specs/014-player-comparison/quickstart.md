# Quickstart de validación: Comparador de jugadores

## Prerrequisitos

Desde la raíz del repositorio:

```powershell
npm install
npm run db:up
```

Iniciar la aplicación:

```powershell
npm run dev
```

Usar un usuario autenticado y una base con jugadores y cotizaciones históricas.

## Validación funcional

1. Abrir `/comparison` y comprobar el estado vacío, buscador y contador `0 de 3`.
2. Buscar un nombre parcial y confirmar que aparecen resultados sin controles de paginación propios.
3. Agregar un jugador: comprobar una sola representación en la cabecera y el mensaje de selección incompleta.
4. Agregar un segundo jugador: comprobar que aparecen automáticamente la matriz de cinco filas y el gráfico.
5. Agregar un tercer jugador y comprobar que se agrega una única columna.
6. Intentar agregar un cuarto jugador y comprobar que la selección no cambia.
7. Quitar un jugador mediante `X` y comprobar que se eliminan su columna, serie y leyenda.
8. Verificar que la matriz muestra exactamente cotización, variación, score individual, score colectivo y score final.

## Validación de datos

- Usar dos cotizaciones con valores conocidos y comprobar el porcentaje `((actual - anterior) / anterior) * 100`.
- Usar un jugador con una sola cotización: la variación y la serie deben indicar datos insuficientes.
- Usar un jugador sin historial: no debe dibujarse una línea ni presentarse un cero como cotización.
- Usar un jugador con score colectivo ausente: debe verse “No disponible”.
- Confirmar que la cotización visible coincide con `items[0]`, no con el valor base `currentQuote` del catálogo.
- Confirmar que el gráfico usa valores y fechas reales, orden cronológico y no agrega recomendaciones, ranking o clasificación.

## Validación de estados y resiliencia

- Simular búsqueda pendiente, búsqueda vacía y error de búsqueda.
- Simular carga, error y reintento de cotizaciones para un jugador.
- Simular éxito para dos jugadores y error para el tercero; la matriz y las series válidas deben permanecer visibles.
- Cambiar selección mientras una consulta está pendiente; la respuesta tardía no debe repoblar la vista con el jugador retirado.
- Expirar la sesión; deben retirarse los datos y ejecutarse el flujo hacia `/login`.

## Validación responsive y accesible

- Revisar escritorio: matriz y gráfico compactos, sin duplicación de identidad.
- Revisar 320 px y 360 px: matriz desplazable, columna «Métrica» identificable, sin pérdida de las cinco filas.
- Navegar solo con teclado: búsqueda, agregar, quitar, reintentar y lectura de estados.
- Verificar foco visible, nombres accesibles de cada `X`, tabla semántica y resumen textual del gráfico.
- Confirmar que ningún estado o serie se distingue únicamente por color.

## Comandos de verificación

```powershell
npm test -- --run tests/unit/features/comparison
npm run lint
npx tsc --noEmit
npm run build
```

La validación visual debe documentar viewport, estado probado y cualquier diferencia intencional respecto de la imagen de referencia.
