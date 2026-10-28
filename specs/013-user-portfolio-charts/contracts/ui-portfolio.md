# UI Contract: Mi portfolio

## Ruta y acceso

- La navegación principal ofrece «Mi portfolio» a inversores autenticados y abre `/portfolio`.
- Sin sesión válida, la ruta retira datos protegidos y sigue el flujo de inicio de sesión actual.
- La ruta no acepta un identificador de usuario para seleccionar otra cartera.

## Datos existentes consumidos

| Consulta | Uso | Fallo |
|---|---|---|
| `GET /api/portfolio` con sesión vigente | Saldo, posiciones, valores y resultados. | 401: retirar datos y cerrar sesión; otros: error inicial o aviso de cifras desactualizadas con reintento. |
| `GET /api/players/{id}` por jugador distinto | Nombre legible. | Mostrar `playerId`; la cartera permanece visible. |
| `GET /api/players/{id}/quotes` en el perfil existente | Evolución real de la cotización del token, sin nueva consulta de la página portfolio. | Mantener el error y reintento de cotizaciones ya existentes; 401 cierra sesión. |

No se crea ni modifica un contrato público de backend.

## Estados observables

| Estado | Resultado visible |
|---|---|
| Carga inicial | Mensaje de carga, sin cifras anteriores. |
| Cartera vacía | Saldo, valor de tenencias 0, resultado 0, patrimonio igual al saldo y mensaje de vacío. |
| Contenido | Resumen, posiciones y comparación de resultados basada en el snapshot; el perfil del jugador muestra la tendencia histórica del token en la tarjeta junto a «Rendimiento». |
| Refresco | Cifras anteriores con aviso de actualización pendiente. |
| Error inicial | Mensaje y «Reintentar», sin cifras. |
| Error de refresco | Cifras anteriores de la misma sesión marcadas como desactualizadas y «Reintentar». |
| Sesión ausente, vencida o cambiada | Ningún dato anterior; flujo de autenticación actual. |

## Invariantes de visualización

- Valor actual y resultado no realizado son métricas distintas. El segundo no incluye ganancias realizadas.
- Cero, negativo y `null` son estados distintos; `null` no entra en barras ni sumas.
- Si faltan datos, los agregados afectados indican «parcial» y número de posiciones omitidas, o «no disponible» si todas las posiciones existentes carecen del dato.
- Cada barra tiene jugador e importe textual. Positivos y negativos se distinguen por ubicación respecto de cero y por signo escrito.
- Cada curva usa cotizaciones reales en orden temporal, con fecha e importe inicial y final; con cero o un registro se informa que no hay evolución comparable.
- Cada resultado enlaza al perfil del jugador. Cuando todos son cero, se conservan el eje y los carriles de barras con importes y acceso al perfil.
- Cada posición actual aparece, incluidas las de valor cero y las que no tienen cotización o nombre disponible.
