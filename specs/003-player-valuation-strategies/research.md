# Research: Estrategias de Valuación y Cotización

**Date**: 2026-10-20  
**Status**: Completed for planning

## Findings

### Existing WhoScored boundary

La integración actual expone `SCRAPED_PLAYER_STATISTICS` con:

`appearances`, `minutesPlayed`, `rating`, `goals`, `assists`,
`shotsPerGame`, `tacklesPerGame`, `interceptionsPerGame`, `foulsPerGame`,
`yellowCards`, `redCards`.

Estos datos llegan a `players.statistics` como un mapa persistido. El motor
de valuación debe leer esa frontera local y no llamar al scraper ni modificar
su contrato.

### Existing football-data.org boundary

La feature `football-data-context` define snapshots, standings y links entre
identidades de equipos. Su contrato normalizado permite usar únicamente:

`league`, `season`, `teamExternalId`, `teamName`, `position`,
`playedGames`, `points` y `goalDifference`.

La estrategia híbrida debe depender de un repositorio de lectura de la última
actualización válida; no debe reutilizar el adapter HTTP.

La rama base ya contiene esta feature: las tablas de contexto están en
`src/backend/db/schema.ts` y las migraciones `0000`–`0002` están presentes.
`CompetitionContextRepository` actualmente resuelve escritura, publicación y
links, pero no ofrece todavía el método de lectura que la valuación necesita.
Ese método debe agregarse en la capa de repositorio, sin duplicar tablas ni
consultar el proveedor.

### Temporal provenance gap

La tabla `players` heredada contiene `statistics`, `league`, `team` y
`position`, pero no contiene `season` ni un identificador de ingesta temporal.
Para este MVP, `players` representa el dataset WhoScored vigente del market y
la temporada vigente se configura en la aplicación. No se agrega procedencia
temporal a `players` ni se expone una temporada arbitraria en el recálculo.

### Normalization decision

Se aprobó percentil 5 como `lower` y percentil 95 como `upper`, por
liga-temporada-posición, congelados en la versión. Esto reduce la influencia
de valores atípicos sin comprimir excesivamente los extremos legítimos.

### Numeric design

La especificación aprobó:

- `individualShare = 0.75`
- `teamShare = 0.25`
- `quoteValue = 1 + 99 * finalScore`
- rango `[1,100]`
- redondeo final a dos decimales
- faltantes individuales con exclusión y renormalización
- contexto faltante con `INDIVIDUAL_ONLY`
- publicación parcial del recálculo

### Remaining input before implementation

Aunque las decisiones de arquitectura y fórmula están cerradas, todavía debe
aprobarse el conjunto numérico de pesos por métrica y por posición. El plan
propone que esos valores formen parte del payload de una versión publicada y
que no se inventen como constantes ocultas. La implementación debe bloquear la
publicación si faltan pesos válidos.

La procedencia temporal queda resuelta operacionalmente por la configuración
de una única temporada vigente, que debe coincidir con el dataset WhoScored
cargado y con el contexto publicado de football-data.org. La limitación es
explícita y no se presenta como historial de temporadas dentro de `players`.

## Alternatives rejected

- **Consultar proveedores durante el cálculo**: rompe reproducibilidad y la
  separación de fuentes.
- **Guardar quotes como estado actual mutable**: elimina el historial y la
  trazabilidad de versiones.
- **Usar mínimo/máximo observado sin clipping robusto**: vuelve la escala
  sensible a outliers.
- **Usar estadísticas individuales de football-data.org**: duplica o mezcla
  fuentes y contradice la especificación.
- **Hacer atómico todo el recálculo**: un jugador inválido bloquearía valores
  válidos; se aprobó estado `PARTIAL`.

## Planning conclusions

El diseño más simple compatible con la arquitectura es un motor puro, una
configuración JSONB inmutable por versión y tablas relacionales para
referencias/consultas frecuentes. No se requiere una dependencia externa nueva.
