# Contrato observable: ranking con caché en memoria

La optimización conserva el contrato público definido en `specs/007-player-ranking/contracts/ranking.yaml`. No agrega parámetros, encabezados, campos, códigos de respuesta ni endpoints.

## Lectura del ranking

**Operación**: `GET /api/players/ranking`  
**Autenticación**: `Authorization: Bearer <JWT>` válido en cada solicitud  
**Parámetros**: `league`, `team`, `position`, `page`, `limit`, con las reglas actuales (`page` predeterminado 1; `limit` predeterminado 20 y máximo 100; equipo recortado y coincidencia parcial sin distinguir mayúsculas).  
**Respuesta `200`**: `strategyCode`, `strategyVersion`, `players[]` y `pagination` con los mismos campos, orden y significado actuales. Una lista vacía válida también es `200`.  
**Errores**: `400` para parámetros inválidos o desconocidos; `401` para sesión no válida; `409` si no hay estrategia activa; error de servidor actual si falla una lectura necesaria.

## Garantías de comportamiento

| Situación                                                                                  | Comportamiento observable                                                                                   |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Misma versión activa, filtros, página, límite y revisión de publicaciones                  | Puede reutilizarse la respuesta completa vigente sin límite de tiempo.                                      |
| Filtros, página, límite o versión activa distintos                                         | Se obtiene el resultado correspondiente a esa consulta, sin mezclar entradas.                               |
| Resultado descartado por el límite de 100                                                  | La consulta vuelve a leer los datos persistidos.                                                            |
| Publicación de una o más cotizaciones por recálculo manual o programado, incluso `PARTIAL` | La primera consulta que comienza después de la confirmación refleja las cotizaciones publicadas.            |
| Sincronización confirmada de jugadores por el flujo manual o programado                    | La primera consulta posterior refleja los jugadores persistidos.                                            |
| Fallo de lectura o respuesta incompleta                                                    | Se mantiene el error actual; no se devuelve un resultado parcial ni se guarda para solicitudes posteriores. |
| Reinicio de la aplicación web                                                              | Se pierde la caché local; la lectura del ranking sigue disponible con datos persistidos.                    |

El encabezado `x-correlation-id` y la observación HTTP existentes siguen aplicándose también a respuestas servidas desde la caché. No se expone al consumidor si una respuesta fue reutilizada.

## Relación con el recálculo

`POST /api/quotes/recalculate` mantiene su autenticación de superusuario, solicitud, respuesta y errores actuales. El worker programado conserva su interfaz operativa. Ambos publican cotizaciones mediante los turnos existentes; esta feature solo observa esas publicaciones para decidir la vigencia del ranking.
