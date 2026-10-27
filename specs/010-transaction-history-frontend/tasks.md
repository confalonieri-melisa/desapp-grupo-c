---

description: "Task list for the investor transaction history frontend"
---

# Tasks: Historial de operaciones del inversor

**Input**: Design documents from `/specs/010-transaction-history-frontend/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/history-ui.md`, `quickstart.md`

**Tests**: Vitest tests are included because the plan and quickstart require behavior coverage for pagination, formatting, errors, and session isolation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated as an independent increment.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing frontend structure and test locations needed by the feature.

- [X] T001 Confirm the App Router, authenticated navigation, AuthContext, player client, and Vitest conventions in `src/app`, `src/frontend`, and `tests`
- [X] T002 [P] Create the feature directories `src/frontend/features/history/components`, `src/frontend/features/history/hooks`, `tests/unit/features/history`, and `tests/unit/services/client`
- [X] T003 [P] Add the `/transactions` route and feature stylesheet placeholders at `src/app/transactions/page.tsx` and `src/app/transactions/TransactionsPage.module.scss`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the shared history projection, HTTP response classification, and formatting behavior required by all user stories.

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Define `TransactionHistoryItem`, `TransactionHistoryResponse`, `PlayerReference`, and view-state types in `src/frontend/features/history/history.ts`, preserving the UUID, `BUY | SELL`, positive quantity, historical monetary values, `CREDIT_PER_TOKEN`, ISO timestamp, offset, and `hasMore` constraints from `data-model.md`
- [X] T005 Implement the transaction history client in `src/frontend/services/client/transaction-history.service.ts` for `GET /api/users/{sessionUserId}/transactions?limit=20&offset=...`, sending the Bearer token and exposing HTTP status for `401`, `403`, and recoverable failures without accepting an unrelated user ID
- [X] T006 Extend or adapt the player client in `src/frontend/services/client/player.service.ts` so player lookup preserves HTTP status, supports `GET /api/players/{playerId}`, and distinguishes `401` from `404` and other non-authoritative failures
- [X] T007 [P] Implement historical number and Buenos Aires date/time formatting helpers in `src/frontend/features/history/history.ts` using `es-AR`, `America/Argentina/Buenos_Aires`, and the literal unit fallback rules from `contracts/history-ui.md`
- [X] T008 [P] Add focused unit coverage for page merging, ID deduplication, offset advancement, stable ordering, number formatting, and Buenos Aires date boundaries in `tests/unit/features/history/history.spec.ts`
- [X] T009 Implement the session-scoped history hook skeleton in `src/frontend/features/history/hooks/useTransactionHistory.ts`, including `(user.id, token)` generation invalidation, abort cleanup, initial/loading-more/page-error states, and no empty state before a successful empty response

**Checkpoint**: Shared data, HTTP, formatting, and session-state primitives are ready; user stories can proceed independently.

---

## Phase 3: User Story 1 - Consultar las operaciones propias (Priority: P1) ðŸŽ¯ MVP

**Goal**: Let an authenticated investor open â€œMi historialâ€ and read only their completed purchases and sales with historical values and resolvable player references.

**Independent Test**: Sign in as an investor with at least one purchase and one sale, open the navigation entry, and compare every visible field with the historical API response; also verify an empty successful response and an unresolved player.

### Tests for User Story 1

- [X] T010 [P] [US1] Add service contract tests for authenticated history requests, `limit=20`, session-derived user ID, and preservation of historical `quoteValue`, `total`, and `unit` in `tests/unit/services/client/transaction-history.service.spec.ts`
- [X] T011 [P] [US1] Add component tests for purchase/sale text labels, all seven visible operation fields, Buenos Aires legend, historical formatting, empty-state timing, and player fallback/link behavior in `tests/unit/features/history/TransactionHistoryList.spec.tsx`

### Implementation for User Story 1

- [X] T012 [P] [US1] Add the authenticated â€œMi historialâ€ link beside â€œJugadoresâ€ and active `aria-current="page"` handling for `/transactions` in `src/frontend/components/GlobalNav/GlobalNav.tsx`
- [X] T013 [P] [US1] Add navigation styles, visible focus treatment, and responsive layout for the new link in `src/frontend/components/GlobalNav/GlobalNav.module.scss`
- [X] T014 [US1] Implement the initial session-aware fetch, player-reference enrichment, and `401` logout/redirect behavior in `src/frontend/features/history/hooks/useTransactionHistory.ts`
- [X] T015 [US1] Implement accessible operation rows showing textual â€œCompraâ€/â€œVentaâ€, player name or ID, profile link only after successful resolution, Buenos Aires date/time, quantity, historical quote with unit, and historical total in `src/frontend/features/history/components/TransactionHistoryList.tsx`
- [X] T016 [P] [US1] Implement the operation-row responsive and accessible presentation styles in `src/frontend/features/history/components/TransactionHistoryList.module.scss`
- [X] T017 [US1] Implement the `/transactions` page with authenticated loading, content, and successful-empty states, semantic status announcements, and no user-ID route controls in `src/app/transactions/page.tsx`
- [X] T018 [P] [US1] Implement page-level responsive layout, field labels, and readable mobile presentation in `src/app/transactions/TransactionsPage.module.scss`

**Checkpoint**: An authenticated investor can navigate to the history, read a complete first page, follow resolvable players, understand an empty history, and see no protected data while the initial request is pending.

---

## Phase 4: User Story 2 - Ver mÃ¡s operaciones (Priority: P2)

**Goal**: Append older history pages without losing visible rows, duplicating IDs, or offering the action after the final page.

**Independent Test**: Use more than 20 operations, load additional pages repeatedly, verify order and unique IDs, then verify the button disappears at `hasMore=false` and new operations do not shift the current visit.

### Tests for User Story 2

- [X] T019 [P] [US2] Add hook tests for `offset=0`, next offset based on response item count, deduplication without offset drift, stable existing rows, `hasMore` termination, and same-offset retry after a page failure in `tests/unit/features/history/useTransactionHistory.spec.ts`
- [X] T020 [P] [US2] Add component tests for â€œVer mÃ¡s operacionesâ€, disabled/progress state, appended ordering, and end-of-history indication in `tests/unit/features/history/TransactionHistoryPage.spec.tsx`

### Implementation for User Story 2

- [X] T021 [US2] Complete pagination and merge logic in `src/frontend/features/history/hooks/useTransactionHistory.ts`, advancing by `response.offset + response.items.length`, deduplicating by `id`, retaining the failed offset, and avoiding duplicate requests while loading
- [X] T022 [US2] Add the semantic â€œVer mÃ¡s operacionesâ€ action, progress announcement, retry surface for the same page, and end-of-history state to `src/frontend/features/history/components/TransactionHistoryList.tsx`
- [X] T023 [US2] Integrate paginated hook state with the page without replacing already visible operations during additional loads in `src/app/transactions/page.tsx`
- [X] T024 [P] [US2] Style the pagination action, disabled progress state, retry state, and end-of-history indication in `src/app/transactions/TransactionsPage.module.scss`

**Checkpoint**: The investor can traverse all available pages while preserving the visible list and receiving clear progress and completion feedback.

---

## Phase 5: User Story 3 - Recuperarse de errores y proteger la sesiÃ³n (Priority: P2)

**Goal**: Recover from initial and subsequent request failures while preventing expired-session or stale-session data from appearing.

**Independent Test**: Simulate initial failure, later-page failure, `401`, `403`, logout/session switch, and a delayed response from user A; verify messages, retry behavior, cleared protected data, and user B isolation.

### Tests for User Story 3

- [X] T025 [P] [US3] Add service tests for status classification of `401`, `403`, `404`, and recoverable network/HTTP failures in `tests/unit/services/client/transaction-history.service.spec.ts`
- [X] T026 [P] [US3] Add hook tests for initial retry, page retry without clearing prior rows, `403` access error, logout on history/player `401`, session-key changes, abort cleanup, and stale A-response rejection in `tests/unit/features/history/useTransactionHistory.spec.ts`
- [X] T027 [P] [US3] Add accessibility/error-state tests for `role="alert"`, `role="status"`/`aria-live`, keyboard-reachable retry controls, and absence of an empty-state message on errors in `tests/unit/features/history/TransactionHistoryPage.spec.tsx`

### Implementation for User Story 3

- [X] T028 [US3] Complete explicit error classification, initial retry, page retry, protected-data clearing, and generation checks for delayed responses in `src/frontend/features/history/hooks/useTransactionHistory.ts`
- [X] T029 [US3] Render recoverable initial/page errors, access-denied state, retry actions, and accessible loading/error announcements in `src/app/transactions/page.tsx`
- [X] T030 [US3] Ensure player enrichment treats `404` and non-authoritative failures as ID-only references while treating player `401` as session expiry in `src/frontend/features/history/hooks/useTransactionHistory.ts`
- [X] T031 [US3] Verify authenticated navigation and route behavior do not expose history controls or data without a hydrated session in `src/frontend/components/GlobalNav/GlobalNav.tsx` and `src/app/transactions/page.tsx`

**Checkpoint**: Failures are understandable and recoverable, while session expiry or Aâ†’B changes remove protected data and reject stale responses.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the complete feature against the repository standards and quickstart scenarios.

- [X] T032 [P] Run the focused history and client tests from `quickstart.md` and resolve regressions in `tests/unit/features/history` and `tests/unit/services/client`
- [X] T033 [P] Verify keyboard navigation, visible focus, screen-reader announcements, responsive mobile labels, and color-independent operation types in `src/app/transactions/TransactionsPage.module.scss` and `src/frontend/features/history/components/TransactionHistoryList.module.scss`
- [X] T034 Run `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` for the completed feature
- [ ] T035 Run the manual scenarios in `specs/010-transaction-history-frontend/quickstart.md`, including historical values, pagination mutation, empty/error states, session expiry, delayed Aâ†’B response, and accessibility

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; can start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and can reuse US1 components; its pagination behavior is independently testable.
- **User Story 3 (Phase 5)**: Depends on Foundational and hardens the shared hook/page; run after the baseline UI exists.
- **Polish (Phase 6)**: Depends on all desired stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependency on another user story after Phase 2.
- **US2 (P2)**: Logically extends the US1 list/page, but its hook and merge tests can be developed in parallel once the foundational types and service exist.
- **US3 (P2)**: Extends the same hook/page error paths; complete after the initial US1 flow is available so failures can be verified against real states.

### Within Each User Story

- Tests should be written before implementation and fail first where the test runner supports it.
- Shared types/services precede hook behavior.
- Hook behavior precedes page and component integration.
- Styling can proceed in parallel when it touches a separate stylesheet.
- A story is complete only after its independent test criteria pass.

### Parallel Opportunities

- Phase 1: T002 and T003 can run in parallel after T001 confirms paths.
- Phase 2: T007 and T008 can run in parallel with T005/T006; T009 follows the shared types/service contracts.
- US1: T010, T011, T012, T013, T016, and T018 can proceed in parallel; T014/T015/T017 integrate them sequentially.
- US2: T019, T020, and T024 can proceed in parallel; T021 precedes T022/T023.
- US3: T025, T026, and T027 can proceed in parallel; T028 precedes T029/T030.
- After Phase 2, separate developers can work on US1, US2 test scaffolding, and US3 service tests in parallel if they coordinate shared hook changes.

## Parallel Example: User Story 1

```text
Task T010: Service contract tests in tests/unit/services/client/transaction-history.service.spec.ts
Task T011: History list tests in tests/unit/features/history/TransactionHistoryList.spec.tsx
Task T012: Global navigation link in src/frontend/components/GlobalNav/GlobalNav.tsx
Task T013: Navigation styles in src/frontend/components/GlobalNav/GlobalNav.module.scss
Task T016: Operation-row styles in src/frontend/features/history/components/TransactionHistoryList.module.scss
Task T018: Page styles in src/app/transactions/TransactionsPage.module.scss
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 navigation, initial query, rendering, player resolution, formatting, and focused tests.
3. Run the independent US1 test criteria and the relevant lint/type checks.
4. Stop for review/demo before adding pagination and recovery hardening.

### Incremental Delivery

1. Setup + Foundational â†’ shared history primitives ready.
2. US1 â†’ authenticated read-only history MVP.
3. US2 â†’ append older pages and finish traversal.
4. US3 â†’ recoverable errors and strict session isolation.
5. Polish â†’ automated, manual, accessibility, build, and diff validation.

### Parallel Team Strategy

1. Complete Phase 1 and shared contracts together.
2. After Phase 2, assign US1 UI/navigation to one developer, US2 pagination tests/merge behavior to another, and US3 service/error tests to another.
3. Merge shared hook changes carefully, then run each story checkpoint before the final cross-cutting validation.

## Notes

- Every task uses the required `- [ ] Txxx` checklist format and includes the concrete file path(s) it changes or validates.
- `[P]` marks work that can proceed in parallel without depending on incomplete work in the same files.
- Story labels appear only in user-story phases.
- The history remains read-only and does not add backend routes, migrations, advanced filters, exports, PnL calculations, or dependencies. Its basic filters apply only to loaded rows.

## Visual refinement requested after implementation

- [X] T036 Add the loaded-operation summary and basic search, type, and Buenos Aires month filters in `src/app/transactions/page.tsx` and `src/frontend/features/history/history.ts`.
- [X] T037 Present operation rows with resolved player metadata and images from the existing mapper in `src/frontend/features/history/components/TransactionHistoryList.tsx`.
- [X] T038 Validate filtering, mapped images, historical fields, responsive styles, and the production build in `tests/unit/features/history` and `src/app/transactions`.
