# Data Model: Estrategias de Valuación y Cotizaciones

## Relationship overview

```text
valuation_strategy_versions 1 ─── N player_quotes
players 1 ─── N player_quotes
competition_context_updates 1 ─── N player_quotes (optional)
```

## Tables

### `valuation_strategy_versions`

Immutable configuration for one of the two known strategies. `configuration`
contains:

- individual metrics and polarity;
- general and position-specific weights;
- fixed minimum and maximum ranges for each metric;
- collective metrics and weights;
- `individualShare`, `teamShare`;
- monetary formula, limits and precision;
- missing-data policies.

The application uses a typed `ValuationConfig` DTO validated with Zod. The
JSONB column is only the immutable persistence snapshot; calculation code does
not access untyped JSON directly.

The single active version is represented by `is_active`; activation is a
transaction that clears the previous active row and sets the selected row.

### `player_quotes`

Append-only valuation result. It stores the scores, value and an explanation
containing every input used to reproduce the result:

- normalized metric values;
- effective weights and contributions;
- metric ranges used for normalization;
- WhoScored source marker;
- football-data.org context update and source marker when used;
- missing fields and degradation policy.

## Invariants

- Version rows cannot be updated after publication.
- Only one global active version exists.
- A quote always references the exact version used.
- A quote's explanation references the exact metric ranges used.
- A hybrid quote with a non-null `teamScore` references one valid persisted
  context update.
- Individual strategy quotes have `teamScore = null` and no collective
  contribution.
- `individualScore`, `teamScore` and `finalScore` are in `[0,1]`.
- `quoteValue` is in `[1,100]`.
- No quote row is updated by a later recalculation.
- No table introduced by this feature stores player statistics from
  football-data.org.

The recálculo is a request/response operation in the MVP; no execution entity
or asynchronous state machine is persisted. Valid player quotes are appended
and failures are returned in the response.
