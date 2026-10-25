# Quickstart de validación

Guía para ejecutar durante implementación de 008: los tests nuevos y la UI descritos aún no existen. Referencias: [contrato](contracts/player-quotes-ui.md), [modelo](data-model.md), [spec](spec.md).

## Preparación

Desde la raíz, Node >=22.12, npm y Docker/PostgreSQL. Crear .env desde .env.example solo si no existe; configurar DATABASE_URL y JWT_SECRET. Usar base aislada para pruebas de integración.

```powershell
npm ci
npm run db:up
npm run db:migrate
npm run dev
```

No generar migraciones para 008. No depender de db:seed: el archivo al que apunta no existe en este checkout. No hace falta scraping para validar esta UI.

Abrir http://localhost:3000 y autenticar mediante el flujo existente. Para prueba con backend real: cuentas INVESTOR y SUPERUSER, jugador A con tres o más snapshots persistidos antes/durante/después de 2026-10-20, dos instantes el mismo día y dos registros empatados; jugador B sin quotes. Incluir teamScore nulo, ceros reales, JSON anidado/arrays/booleanos/texto largo. Guardar respuestas esperadas. Si faltan datos, preparar fixtures en base de prueba durante implementación tomando como referencia `tests/integration/player-quotes.repository.spec.ts`; no agregar una vía productiva de escritura. Ausencia completa de explicación puede verificarse con respuesta HTTP simulada, pues el esquema normal la contiene.

## Automatización

Después de implementar las rutas de tests propuestas:

```powershell
npm test -- tests/unit/services/client.player-quotes.service.spec.ts tests/unit/features/profile/use-player-quotes.spec.ts tests/unit/features/profile/player-quotes.spec.ts tests/unit/features/profile/use-player-profile.spec.ts tests/unit/services/client.player.service.spec.ts
npm run lint
npm test
npm run build
npm run test:coverage
```

Esperado: pruebas conductuales, lint, build y umbrales vigentes pasan; conservar todos los tests anteriores. No crear pruebas declarativas para inflar cobertura.

Verificación de fecha en zonas opuestas (restaurar TZ original después si existía):

```powershell
$env:TZ = 'Etc/GMT+3'
npm test -- tests/unit/features/profile/player-quotes.spec.ts tests/unit/services/client.player-quotes.service.spec.ts
$env:TZ = 'Pacific/Kiritimati'
npm test -- tests/unit/features/profile/player-quotes.spec.ts tests/unit/services/client.player-quotes.service.spec.ts
Remove-Item Env:TZ
```

Esperado: misma query para 2026-10-20, fin de mes y 2028-02-29; rechazar 2026-02-29, 2026-02-30, formato incorrecto y vacío; permitir futuro.

Regresión PostgreSQL real con DATABASE_URL de prueba y esquema migrado (restaurar variable previa si existía):

```powershell
$env:RUN_DB_INTEGRATION_TESTS = 'true'
npm test -- tests/integration/player-quotes.repository.spec.ts
Remove-Item Env:RUN_DB_INTEGRATION_TESTS
```

Esperado: orden/selección según tests existentes. La prueba `tests/integration/player-quotes.routes.spec.ts` usa dobles; se ejecuta en la suite general como regresión de contrato, sin acreditar integración real.

## Aceptación en navegador

1. INVESTOR: catálogo → perfil A. Comparar con GET sin fecha en DevTools: actual = items[0], todas las filas en orden recibido incluidos empates. Valor/unidad/timestamp UTC preciso/estrategia/versión completos; no usar currentQuote del perfil. Perfil B muestra ausencias específicas sin cero ficticio.
2. Consultar 2026-10-20: comparar con GET con date exacta, distinguir día solicitado e instante efectivo y regla temporal. Probar día sin cálculo, anterior al primero y futuro; solo ausencia puntual reconocida muestra su mensaje específico y el historial no cambia.
3. Fecha vacía/incorrecta y 400 simulado: error asociado sin éxito aparente. Cambiar selección tras éxito retira vigencia. Limpiar durante carga/error/éxito vacía estado puntual, conserva historial y descarta respuestas pendientes.
4. Abrir detalles de actual, filas y puntual: comparar scores y todos los componentes anidados; cero/false reales conservados y null/ausencia distintos. Empates distinguibles por posición; explicaciones no se mezclan.
5. Simular offline/500, recuperar red y reintentar cada consulta. Fallo puntual conserva actual/historial. En tests con promesas controladas, resolver A después de B y generar error/401/finally tardíos; repetir con cambio de jugador/fecha, limpiar y reintentos superpuestos. Ningún resultado obsoleto afecta presentación.
6. UUID inexistente e identificador inválido muestran estado específico y regreso al catálogo. Sin sesión o 401 vigente retira datos y redirige a login. SUPERUSER tiene las mismas consultas.
7. Completar recorrido a 360/1280 px solo con teclado: foco, label, consultar/limpiar/reintentar y detalles accesibles. Verificar anuncios con lector de pantalla y texto largo sin pérdida. Red solo GET, sin polling ni requests de detalle.

Registrar comandos/resultados, evidencia SC-001–007, capturas de ambos anchos y observaciones de teclado/anuncios durante implementación. Esta guía no acredita pruebas ejecutadas ni aprobación de entrega; sigue pendiente revisión formal de Project Owner al finalizar.
