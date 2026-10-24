# Data Model: Contexto Colectivo de Equipos

## Relationship Overview

```text
competition_context_updates 1 ─── N competition_context_snapshots
competition_context_updates 1 ─── N team_competition_standings
competition_context_snapshots 1 ─── N team_competition_standings
team_source_links ─── associates WhoScored team identity with football-data team identity
```

## Invariants

- Una ejecución `VALID` tiene exactamente cinco competiciones válidas.
- La última ejecución `VALID` por temporada es la referencia vigente.
- Una fila de `team_competition_standings` pertenece a una actualización y
  snapshot concretos.
- `(context_update_id, competition_code, team_external_id)` es único.
- La publicación no se actualiza si la ejecución es `PARTIAL` o `FAILED`.
- `position`, `played_games` y `points` son no negativos.
- `goal_difference` puede ser negativo.
- Una asociación confirmada no puede apuntar a dos equipos de football-data
  para la misma identidad WhoScored y temporada.
- Ninguna tabla nueva contiene estadísticas individuales de jugadores.

## State Transitions

```text
RUNNING -> VALID       (five competitions valid, transaction published)
RUNNING -> PARTIAL     (at least one competition failed, not published)
RUNNING -> FAILED      (request/configuration/validation failure)
```

Las asociaciones no confirmadas no se persisten.
