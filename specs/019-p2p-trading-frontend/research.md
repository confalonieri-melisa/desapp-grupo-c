# Research: Frontend de compra y venta P2P

**Feature**: [spec.md](spec.md)  
**Fecha**: 2026-11-25

## Decisiones

### 1. Integración en el perfil existente

**Decisión**: Ampliar la sección de trading de `/players/[id]`. La cotización, el saldo y la posición siguen saliendo de `usePlayerQuotes` y `usePlayerTrading`; una lectura P2P adicional consulta únicamente las ofertas abiertas del jugador. Hay dos vistas: «Comprar», con un listado único de ofertas ajenas y propias, y «Vender (P2P)», con la publicación. Ambas comparten la identidad de la sesión y el estado de reconciliación de la lista.

**Motivo**: El perfil ya confirma la identidad del jugador, carga el portfolio protegido y aísla las lecturas por jugador y sesión. Un listado único evita una consulta y un estado separados para ofertas propias. Las operaciones P2P no necesitan cotización vigente.

**Alternativas consideradas**: Crear una página P2P global o una pestaña aparte de ofertas propias. Ambas ampliarían el alcance o duplicarían estados sin aportar valor al recorrido solicitado.

### 2. Compra al pool y lectura de disponibilidad

**Decisión**: Mantener el contrato y el comportamiento de `POST /api/orders/buy`. Agregar una lectura autenticada `GET /api/players/{id}/pool-availability` que devuelve `{playerId, availableQuantity}` para el pool central del jugador. Una ruta llama a un controlador y servicio de lectura; un repositorio nuevo y acotado consulta la tenencia del mismo `SUPERUSER` canónico que usa la compra, con la misma selección determinista, sin transferencias ni bloqueos de escritura. El servicio valida que exista el jugador; una tenencia ausente o con cantidad cero devuelve `availableQuantity: 0`, mientras errores de consulta o de configuración del pool se informan como error, no como cero. La lectura no devuelve el identificador ni otros datos financieros del pool.

**Motivo**: El perfil y el portfolio del inversor no contienen la tenencia del pool. Una lectura acotada permite mostrar la compra al pool en «Comprar» solo cuando la cantidad confirmada es positiva, limitar la cantidad ingresada a esa disponibilidad y ocultarla cuando es cero. La venta al pool no tendrá controles visibles en esta interfaz. La lectura es una foto que puede quedar obsoleta; `POST /api/orders/buy` sigue validando cotización, saldo y tokens disponibles al ejecutar y puede rechazar una compra iniciada desde una lectura positiva.

**Alternativas consideradas**: Inferir disponibilidad como `100 - suma de posiciones visibles`, confiar en la cotización, o cambiar la orden de compra para devolver disponibilidad. La primera no dispone de todas las tenencias, la segunda confunde precio con stock y la tercera altera el flujo financiero existente. Mantener visible la venta al pool contradice el alcance actualizado de la interfaz.

### 3. Datos disponibles e identidad del vendedor

**Decisión**: Consultar `GET /api/p2p/offers?playerId=<id>`, que devuelve solo ofertas `OPEN`; cada fila del listado de «Comprar» usa la igualdad de `sellerId` con `user.id` para mostrar «Comprar» si es ajena o «Cancelar» si es propia. Mostrar una etiqueta de vendedor basada en `sellerId`, con el identificador completo disponible en el detalle accesible, sin inventar un nombre. Conservar el `id` de la oferta para diferenciar ofertas del mismo vendedor.

**Motivo**: La respuesta real incluye `id`, `sellerId`, `playerId`, `quantity`, `unitPrice`, `status` y `createdAt`. No hay endpoint de ofertas cerradas ni nombre público de vendedor.

**Alternativas consideradas**: Consultar todos los usuarios, inferir un alias o mostrar ofertas completadas/canceladas. No hay contrato que sostenga esas opciones.

### 4. Validación y dinero

**Decisión**: Reutilizar la regla de cantidad entera positiva y límite de entrada ya empleado por el trading central. Para publicar, aceptar precio positivo con hasta dos decimales y convertir el texto a número solo tras validarlo. El formulario limitará el precio a 99.999.999,99 créditos por token y el total a 9.999.999.999,99 créditos para no crear una oferta cuyo precio o importe no pueda registrarse como operación P2P en el esquema vigente. Calcular el total visible con redondeo monetario de dos decimales, como hace el dominio P2P; el importe ejecutado se toma exclusivamente del comprobante. Deshabilitar la compra si el total de la oferta supera el saldo vigente visible; validar nuevamente antes del envío.

**Motivo**: El backend valida `quantity` entera positiva, `unitPrice` positivo y hasta dos decimales. La base persiste la oferta con `quantity` entero de 32 bits y `unitPrice` `numeric(12,2)`, pero una aceptación registra el precio en `market_operations.quote_value` `numeric(10,2)` y el total en `numeric(12,2)`. La API aún no impone esos máximos en el request; el control del formulario evita exceder los campos de precio y total de la operación, sin garantizar que esta pueda concretarse por saldo, tenencia u otras restricciones. La oferta completa no admite editar cantidad ni precio. El saldo y la tenencia pueden cambiar después de la lectura.

**Alternativas consideradas**: Usar `type=number` sin validación de precisión, precio de cotización para P2P o confiar en el cálculo del cliente como resultado final. No respetan el contrato o crean una afirmación financiera incorrecta.

### 5. Envíos, idempotencia y resultados inciertos

**Decisión**: Guardar un solo intento en curso por acción. Al confirmar una aceptación, generar una clave de idempotencia asociada a esa intención y oferta; conservarla para un reintento manual de la misma aceptación tras un resultado incierto. Una acción nueva usa una clave nueva. Nunca reintentar automáticamente. Publicación y cancelación no tienen idempotencia: ante respuesta incierta, actualizar ofertas antes de permitir que la persona decida si envía otra acción.

**Motivo**: `POST /api/p2p/offers/{id}/accept` exige `Idempotency-Key` y puede devolver el comprobante original en un replay compatible. `POST /api/p2p/offers` y `DELETE /api/p2p/offers/{id}` no ofrecen esa garantía. Una desaparición del listado tras un fallo de aceptación no prueba por sí sola quién la aceptó; el comprobante confirmado sigue siendo la fuente de verdad.

**Alternativas consideradas**: Crear una clave nueva en cada reintento o repetir automáticamente solicitudes sin respuesta. Podría duplicar o confundir operaciones.

### 6. Errores HTTP reales

**Decisión**: El cliente P2P lee el campo `{ error: string }` de las rutas actuales y conserva `status`. Solo asigna causas concretas a combinaciones conocidas; otros 4xx reciben un rechazo genérico. Errores de red, 5xx o respuesta 2xx malformada se presentan como resultado incierto de una mutación. `401` activa el cierre de sesión existente. La cancelación exitosa es `204` sin cuerpo.

**Motivo**: `toHttpResponse` devuelve `{ error }`, mientras `specs/017-p2p-fixed-offers/contracts/p2p.yaml` declara `{ message }`. La implementación real de las rutas prevalece para esta integración. La discrepancia del contrato previo se documenta aquí y en el contrato UI; corregir el backend/OpenAPI 017 queda fuera del alcance de esta feature frontend.

**Alternativas consideradas**: Parsear únicamente `{ message }`, mostrar mensajes crudos no reconocidos o asumir fracaso ante fallos de red. Se perdería información o se afirmaría un resultado no comprobado.

### 7. Actualización y aislamiento de estado

**Decisión**: Cargar ofertas y disponibilidad del pool al entrar al perfil; refrescar ofertas tras sus mutaciones y la disponibilidad tras una compra al pool confirmada o un reintento explícito. Si esa compra agota el stock y la lectura posterior devuelve cero, ocultar el formulario central sin perder su comprobante. No hacer polling. Tras aceptación P2P confirmada, refrescar ofertas y el portfolio compartido para actualizar también el saldo global. Conservar los comprobantes aunque un refresco posterior falle y marcar cada dato como pendiente o no confirmado. Aislar borradores, confirmación, listado, disponibilidad, clave de idempotencia y respuestas tardías por token de sesión y `playerId`.

**Motivo**: El hook central ya publica actualizaciones del portfolio para la navegación global y descarta lecturas obsoletas. El listado P2P tiene una sola fuente y aparece en «Comprar», incluso para ofertas publicadas desde «Vender (P2P)». La disponibilidad del pool tiene estados propios `loading`, `available`, `empty` y `error`: carga/error no se interpretan como cero, y solo `availableQuantity > 0` habilita mostrar la compra. La cantidad central se contrasta con esa lectura tanto al ingresar como al confirmar; el backend revalida al ejecutar. El resultado de una mutación confirmada no depende de la disponibilidad de una lectura posterior.

**Alternativas consideradas**: Actualizar saldos por aritmética local, conservar un listado anterior como vigente o compartir borradores entre jugadores. Todas podrían presentar datos engañosos.

### 8. Accesibilidad y presentación

**Decisión**: Usar controles de sección nativos con estado seleccionado perceptible, encabezados y etiquetas explícitos; diálogos de confirmación con foco inicial y retorno al disparador, Escape y mensajes `status`/`alert`. Reutilizar estilos y variables del perfil, con tarjetas que se apilan a 360 px. El cambio porcentual y gráficos del mockup se muestran solo si datos reales ya disponibles permiten calcularlos de forma inequívoca.

**Motivo**: El perfil ya dispone de estilos, confirmaciones y un componente de tendencia. Una reproducción literal del mockup agregaría cifras ficticias o componentes redundantes.

**Alternativas consideradas**: Copiar la captura como maqueta estática o crear un sistema visual nuevo. No cumpliría con estados reales ni con la arquitectura incremental.
