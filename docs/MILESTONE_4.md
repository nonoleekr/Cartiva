# Milestone 4 — catalog, product pages and persistent cart

Authorized 24 November 2026. In progress: backend/schema implemented and under final checkpoint verification; shopping UI/browser checks pending. Checkout remains M5.

## Action plan and commit checkpoints

1. Review/freshly verify M1–M3 and save an explicit baseline: **66cc5d0**. Completed; 53 tests and lint/type/build passed.
2. Implement cart schema/API, verify database behavior, write notes/update contracts, sync Obsidian and commit the backend part.
3. Implement catalog/detail UI and sample imagery from the generated concept; verify browser query/navigation/states, document/sync and commit this part.
4. Connect cart UI to authenticated API, verify quantity/ownership/session/concurrency and responsive behavior; finish notes/sync and commit.
5. Record actual commit hashes and evidence, review M4, stop before M5. No push/deployment.

## Concepts and reasons

React state owns input drafts and feedback. URL query parameters own catalog search/category/sort/page so reload and browser navigation preserve discovery. The server owns prices, cart quantities and totals; client calculations are never authoritative.

A cart is a persistent user-owned relation, not a browser-only array. Auth user IDs remain TEXT because Better Auth owns their format; domain cart/product IDs are UUIDs. Unique user/cart and cart/product indexes prevent duplicate carts/lines. SQL checks constrain quantity 1–99 and nonnegative revision.

Adding to a cart is not an inventory reservation. The server checks the merged quantity against current active stock and enforces at most 100 distinct products. Stock is not decremented until future checkout. Current prices/availability are read when displaying the cart; an inactive or insufficient-stock line remains visible and removable.

## Backend request flow

```text
POST /api/v1/cart/items { productId, quantity }
 → authenticated current user from session (never body userId)
 → exact Origin + JSON + session-bound CSRF
 → bounded JSON parser and strict request validation
 → transaction: insert cart ON CONFLICT DO NOTHING
 → lock the user's cart row FOR UPDATE
 → lock product, read existing line and current stock
 → merge/replace/remove, increment revision when changed
 → return server-computed canonical cart
```

Concurrent first requests serialize through the unique insert and cart lock. Later requests lock the same cart before changing quantities, avoiding lost updates. All writers lock cart before product; future checkout must lock products in stable ID order. A failure rolls back changes and revision together. GET returns a nonpersisted empty cart when absent and uses a repeatable-read snapshot for batched relation reads.

Sources: [PostgreSQL row locking](https://www.postgresql.org/docs/17/explicit-locking.html), [Prisma v7 transactions](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions).

## API and semantics

- GET `/api/v1/cart`: current user's cart; absent id=null, revision=0, items empty; no row created.
- POST `/api/v1/cart/items`: adds to existing quantity by product ID.
- PATCH `/api/v1/cart/items/:productId`: replaces absolute quantity; zero is invalid (use DELETE).
- DELETE same item path: idempotent removal, valid JSON `{}` required by the mutation contract.
- All return `{ data: { id, revision, currency, items, totalQuantity, subtotalMinor } }`.
- A line includes productId/slug/name/image, current integer unit/line amounts, quantity, stock and availability AVAILABLE/INSUFFICIENT_STOCK/UNAVAILABLE.
- Unknown body fields, malformed IDs, fractional/out-of-range quantities and invalid JSON return 400. Missing session 401; failed origin/CSRF 403; missing PATCH line 404; combined stock/quantity/cart limit conflicts 409.
- Subtotals include displayed lines at current prices, including unavailable lines; no order/charge exists yet. UI must label availability and avoid implying checkout is ready.

## Verification record

Backend initial run: lint/typecheck/build, 23 HTTP/config/safety tests and 44 real PostgreSQL integration tests passed (67 total). Cart tests use independent clients for concurrent first creation/addition and combined-stock races, and cover exact integer totals, absolute PATCH, ownership, strict validation, CSRF, no GET writes, no reservation, unavailable removal, 100-line cap and SQL constraints. GET repeatable-read snapshot refinement also passed strict typechecks and all 44 integration tests before commit.

UI/browser verification, final asset paths/design comparison and frontend commit results will be added as that work is completed; no UI success is claimed yet.

## Learning/review prompts

1. What state belongs in the URL versus React versus PostgreSQL?
2. Why can two individually valid add requests exceed stock together without locking?
3. Why is PATCH quantity absolute and POST add incremental?
4. Why must cart reads show changed availability even when adding originally succeeded?
5. What does the revision represent, and why does GET not create a cart?

## Commit record

- `66cc5d0`: separately reviewed/freshly verified M1–M3 baseline.
- Backend, catalog UI and cart UI checkpoints pending.
