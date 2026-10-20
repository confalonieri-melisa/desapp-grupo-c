# Quickstart: Estrategias de Valuación

## Prerequisites

1. Check out the feature on top of the `football-data-context` base branch/PR;
   its migration must be present in the stacked workspace.
2. Configure `DATABASE_URL`, `JWT_SECRET` and an existing superuser.
3. Configure the current market season (for example, `2026`), load players
   from WhoScored for that season and synchronize its valid collective context.
4. Create the valuation migration before running the API.

## Configuration flow

1. Create one immutable version row for each known strategy:
   - `INDIVIDUAL_PERFORMANCE`
   - `INDIVIDUAL_PLUS_TEAM_CONTEXT`
2. Store the typed `ValuationConfig` DTO snapshot in the version row with:
   - approved metric weights;
   - P5/P95 references;
   - position overrides;
   - collective weights;
   - `0.75/0.25` shares;
   - `1 + 99 * score` formula.
3. Select the active strategy through `POST /api/valuation/active`.
4. Request a recalculation for all eligible players with an empty body: `{}`.

## Expected demonstration

- Run individual strategy with two players whose team context differs:
  `individualScore` remains independent of the team.
- Run hybrid strategy for those players:
  `teamScore` and its 25% contribution are visible separately.
- Remove or omit one team link:
  the quote uses `INDIVIDUAL_ONLY`, `teamScore` is null and the explanation
  records the degradation.
- Recalculate after publishing a new version:
  new quote rows are created and previous rows remain unchanged.

## Validation commands

```powershell
npm run lint
npm test
npm run build
$env:RUN_DB_INTEGRATION_TESTS="true"; npm test
```

No command in the calculation path should require network access.
