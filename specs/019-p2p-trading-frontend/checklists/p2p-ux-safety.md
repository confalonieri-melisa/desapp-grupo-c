# Checklist de requisitos: experiencia P2P y seguridad de operaciones

**Purpose**: Revisar la calidad de los requisitos del frontend P2P antes de la implementación, con foco en experiencia,
accesibilidad, límites del backend y resultados financieros inciertos. **Created**: 2026-11-25
**Feature**: [spec.md](../spec.md)

**Review Ownership**: Este checklist pertenece a quien revisa los requisitos antes del PR. Marcar `[x]` solo cuando el
criterio de calidad esté satisfecho; no indica que la implementación esté terminada.

## Completitud y límites del alcance

- [x] CHK001 ¿Queda definido que las dos vistas pertenecen al perfil del jugador abierto y que el único listado de
  «Comprar» reúne ofertas ajenas comprables y propias cancelables? [Completitud, Spec §FR-001, §FR-014]
- [x] CHK002 ¿Está especificada la compra al pool condicionada a disponibilidad positiva, su ocultamiento cuando no
  quedan tokens, la consulta de disponibilidad y la ausencia de venta al pool en la
  interfaz? [Completitud, Spec §FR-002, §FR-025, §FR-028, §FR-029]
- [x] CHK003 ¿Queda explícito que consultar, publicar y aceptar ofertas P2P no dependen de la cotización vigente del
  pool? [Consistencia, Spec §FR-026]
- [x] CHK004 ¿Están definidos los datos que se pueden mostrar del vendedor y la alternativa cuando la API solo aporta su
  identificador? [Completitud, Spec §FR-004]
- [x] CHK005 ¿Se evita un panel o vacío separado de ofertas propias y se distingue el listado de ofertas abiertas de un
  historial, sin incluir estados cerrados que no entrega la API? [Consistencia, Spec §FR-014, §FR-017]
- [x] CHK006 ¿Están definidos los criterios para omitir porcentajes, gráficos e identidades del mockup que no puedan
  derivarse de datos reales? [Claridad, Spec §FR-027]

## Precisión de cantidades, precios y confirmaciones

- [x] CHK007 ¿Queda inequívoco que una aceptación comprende la cantidad completa publicada, sin edición de cantidad ni
  precio? [Claridad, Spec §FR-006]
- [x] CHK008 ¿Están especificados formato, rango y precisión de cantidad y precio de publicación de forma coherente con
  los límites vigentes del backend? [Claridad, Spec §FR-010, §FR-011]
- [x] CHK009 ¿Está definido qué hacer cuando saldo o tenencia no están disponibles o aún se están actualizando antes de
  ofrecer una confirmación? [Cobertura, Spec §FR-008, §FR-011, §FR-017]
- [x] CHK010 ¿Se distingue el total calculado para decidir del importe efectivo del comprobante de
  aceptación? [Consistencia, Spec §FR-007, §FR-009]
- [x] CHK011 ¿Están definidos los datos mínimos de cada confirmación de aceptación, publicación y cancelación, y el
  efecto de abandonarla? [Completitud, Spec §FR-007, §FR-012, §FR-015]
- [x] CHK012 ¿Se aclara que publicar no reserva tokens ni modifica créditos o tenencia y cómo llegar desde «Vender
  (P2P)» al listado de «Comprar» tras publicar? [Claridad, Spec §FR-012, §FR-013]

## Rechazos, concurrencia y recuperación

- [x] CHK013 ¿Se diferencian en los requisitos un rechazo comprobado y un resultado incierto de una
  mutación? [Consistencia, Spec §FR-019, §FR-020]
- [x] CHK014 ¿Están cubiertos los cambios de saldo, tenencia y estado de oferta entre la consulta y la confirmación, sin
  atribuir una causa no comprobada? [Cobertura, Spec §Edge Cases, §FR-019]
- [x] CHK015 ¿Se especifica la protección contra activaciones repetidas y el uso de una misma intención para un
  reintento compatible de aceptación? [Cobertura, Spec §FR-018, §FR-020]
- [x] CHK016 ¿Se distingue la recuperación de una aceptación incierta de la de una publicación o cancelación incierta,
  que carecen de garantía de idempotencia? [Cobertura, Spec §FR-018, §FR-020]
- [x] CHK017 ¿Se aclara qué conclusiones permite y cuáles no permite extraer un listado actualizado cuando una oferta
  desaparece tras una respuesta incierta? [Ambigüedad, Spec §FR-020]
- [x] CHK018 ¿Están definidos el comprobante persistente y los datos no confirmados tras un refresco fallido, incluida
  la oferta publicada visible provisionalmente en «Comprar» y la prioridad del listado al actualizarse con
  éxito? [Completitud, Spec §FR-009, §FR-013, §FR-021]
- [x] CHK019 ¿Están definidos los resultados y vías de recuperación para errores de autenticación, permisos, validación,
  recurso ausente y conflicto? [Cobertura, Spec §FR-019, §FR-022]
- [x] CHK020 ¿Se especifica el aislamiento de borradores, confirmaciones, comprobantes y respuestas tardías al cambiar
  de jugador o sesión? [Cobertura, Spec §FR-023]

## Accesibilidad y criterios de aceptación

- [x] CHK021 ¿Están definidos el foco inicial, la salida con Escape y el retorno de foco para los tres tipos de
  confirmación? [Cobertura, Spec §FR-024]
- [x] CHK022 ¿Están definidos etiquetas, asociación de errores a campos y anuncios perceptibles de progreso, rechazo e
  incertidumbre? [Completitud, Spec §FR-017, §FR-019, §FR-024]
- [x] CHK023 ¿Es verificable la disponibilidad de todos los datos y controles necesarios con teclado y a 360 y 1280
  píxeles? [Medibilidad, Spec §FR-024, §SC-006]
- [x] CHK024 ¿Los criterios de éxito cubren por separado compra P2P, publicación, cancelación y compra al pool
  condicionada a su disponibilidad, incluida la ocultación cuando llega a cero? [Cobertura, Spec §SC-001–SC-008]
- [x] CHK025 ¿Los criterios de éxito permiten constatar que una respuesta incierta nunca se presenta como éxito
  confirmado y que una confirmación abandonada no inicia una mutación? [Medibilidad, Spec §SC-004, §SC-005]

## Notas

- Los ítems evalúan la redacción y cobertura de los requisitos, no la ejecución de la interfaz.
- Dejar sin marcar cualquier ítem que necesite aclaración o corrección y registrar el hallazgo junto al requisito
  correspondiente.
- `/speckit.implement` lee el estado de los checklists y no modifica sus marcas.
- [requirements.md](requirements.md) conserva su ciclo independiente de validación general de la especificación.
