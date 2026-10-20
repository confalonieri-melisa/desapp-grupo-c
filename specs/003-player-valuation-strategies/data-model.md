# Data Model: Estrategias de Valuación y Cotizaciones

## Relationship overview

```text
valuation_strategies 1 ─── N valuation_strategy_versions
valuation_strategy_versions 1 ─── 1 active_valuation_strategy
valuation_strategy_versions 1 ─── N quote_recalculations
quote_recalculations 1 ─── N player_quotes
players 1 ─── N player_quotes
competition_context_updates 1 ─── N player_quotes (optional)
```

## Tables

### `valuation_strategies`

Identity stable of a strategy. `code` is unique and limited to the two
required strategy codes.

### `valuation_strategy_versions`

Immutable published configuration. `configuration` contains:

- individual metrics and polarity;
- general and position-specific weights;
- P5/P95 references by league-season-position;
- collective metrics and weights;
- `individualShare`, `teamShare`;
- monetary formula, limits and precision;
- missing-data policies.

The JSON is a snapshot of the complete configuration, not a pointer to mutable
application constants.

### `active_valuation_strategy`

Stores the single global version selected for new recalculations. Activation
history must be append-only or auditable; changing the current pointer cannot
change historical quotes.

### `quote_recalculations`

Represents one requested operation and captures the selected strategy/version,
optional context update, requested player scope, status, counters and errors.

### `player_quotes`

Append-only valuation result. It stores the scores, value and an explanation
containing every input used to reproduce the result:

- normalized metric values;
- effective weights and contributions;
- P5/P95 limits;
- WhoScored source marker;
- football-data.org context update and source marker when used;
- missing fields and degradation policy.

## Invariants

- Published versions cannot be updated or deleted.
- Only one global active version exists.
- A quote always references the exact version used.
- A hybrid quote with a non-null `teamScore` references one valid persisted
  context update.
- Individual strategy quotes have `teamScore = null` and no collective
  contribution.
- `individualScore`, `teamScore` and `finalScore` are in `[0,1]`.
- `quoteValue` is in `[1,100]`.
- No quote row is updated by a later recalculation.
- No table introduced by this feature stores player statistics from
  football-data.org.

## State transitions

```text
Version: DRAFT -> PUBLISHED -> RETIRED
Recalculation: RUNNING -> COMPLETED
                 └───────> PARTIAL
                 └───────> FAILED
```

Only `PUBLISHED` versions can be activated. A `PARTIAL` recalculation still
persists valid quotes and per-player failures.
