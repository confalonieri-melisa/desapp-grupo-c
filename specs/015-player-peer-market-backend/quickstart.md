# Quickstart: Mercado P2P de Tokens de Jugadores — Backend

## Prerequisites

- Node.js `>=22.12.0`.
- PostgreSQL running through the repository's Docker setup.
- `TEST_DATABASE_URL` pointing to a database whose name contains `test` or
  `integration`.
- Migrations applied with the repository's Drizzle migration command.

## Validation commands

```powershell
npm run db:up
npm run db:migrate
npm run test:unit
npm run test:integration
npm run format:check
npm run build
```

## Required integration scenarios

1. Seed one `SUPERUSER`, two investors, one player, a quote and a pool
   holding of 100 tokens.
2. Buy from the pool with `POST /api/orders/buy` and a unique
   `Idempotency-Key`; repeat the identical request and assert one operation.
3. Publish an offer with `POST /api/p2p/offers`; assert the seller's total
   holding is unchanged and available quantity is reduced by the open
   reservation.
4. Call `GET /api/p2p/offers` with and without `playerId`; assert only `OPEN`
   offers are returned and an empty result is `200` with `items: []`.
5. Purchase the offer as the second investor; assert `SOLD`, exact fixed
   price/total, both balance changes, token transfer, operation and audit.
6. Publish and cancel another offer; assert `CANCELLED`, zero open reserve and
   no token or credit transfer.
7. Run concurrent purchase requests against one offer; assert one success and
   all other requests are `409` or idempotent replays, with no duplicate
   operation or audit.
8. Run concurrent publications whose quantities exceed the seller's holding;
   assert confirmed reservations never exceed availability and no negative
   holding exists.
9. Run purchase/cancel concurrently; assert exactly one terminal transition.
10. Verify that no central-pool sell endpoint is part of this feature; selling
    to the pool is intentionally absent and future exchange belongs to P2P.

See [contracts/market-p2p.yaml](contracts/market-p2p.yaml) for HTTP examples
and [data-model.md](data-model.md) for invariants and constraints.
