# Milestone 4 — catalog, product pages and persistent cart

Authorized 24 November 2026. Complete and locally verified; ready for user review. Checkout remains M5.

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
 → merge/replace/remove, increment revision on successful writes (absent removal is a no-op)
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

Final full run: `npm run check` passed lint, strict typechecks, 23 HTTP/config/safety tests and both builds; `npm run test:integration` passed all 44 PostgreSQL tests (67 total). No functional source changes followed that run.

Chromium desktop 1440×1000 / mobile 375×812 checks:

- Anonymous catalog Add redirects to sign-in; switching to signup preserves the product return path and successful registration returns to that detail page.
- Add quantity 2 of product 25 → cart RM70.00. Invalid zero shows feedback and leaves persisted quantity/totals unchanged. Replace with 3 → RM105.00; reload retains 3 and RM105.00.
- Replace with 99 exceeds stock35: server409 and visible stock-conflict feedback; subtotal stays RM105.00. Remove produces the explicit empty state.
- Out-of-stock product03 disables quantity/Add. Anonymous cart explains sign-in and carries `/cart` return path.
- Catalog503 was deliberately intercepted: visible error, no invented products; removing interception and clicking Try again restores 24 products.
- At375px catalog/product/cart `scrollWidth === innerWidth === 375`; screenshots inspected against generated concepts. See [design record](DESIGN_NOTES.md) for deviations and assets.

Account switching: after A saved product01, sign-out removed cart visibility; B saw an empty cart; signing back into A returned to `/cart` and restored A’s product01/RM11.00. Missing product shows Product not found. Next moves to URL `?page=2`; keyboard Tab reaches Skip to content. Both exact synthetic browser users were deleted afterward, with zero remaining; related sessions/carts cascaded. Expected401/409/503 resource errors are induced test outcomes; they are not JavaScript application exceptions. Hosted TLS/proxy, Firefox/Safari and real deployment remain unverified.

## Learning/review prompts

1. What state belongs in the URL versus React versus PostgreSQL?
2. Why can two individually valid add requests exceed stock together without locking?
3. Why is PATCH quantity absolute and POST add incremental?
4. Why must cart reads show changed availability even when adding originally succeeded?
5. What does the revision represent, and why does GET not create a cart?

## Commit record

- `66cc5d0`: separately reviewed/freshly verified M1–M3 baseline.
- `a474544`: cart schema/API, serialized mutations, ownership/concurrency tests and synced notes.
- `6d7a409`: catalog/detail UI, URL state, runtime schemas, illustrative assets and synced design/learning notes.
- Cart UI checkpoint: connected add/replace/remove, safe auth return paths and full-flow verification; this commit includes final notes after verified Obsidian sync (resolve its hash in Git log).

## Catalog UI checkpoint

Added feature modules for catalog HTTP schemas, product cards/detail, request/error states, abortable reads and MYR display. Category/product requests run in parallel; URL-keyed result components abort stale work and preserve discovery on refresh/back. Product responses are validated with the existing pinned Zod version in the web workspace.

Browser verified 24 active products, AMBER TELESCOPE search returning product 25, category=desk with price-asc ordering and reload persistence, real product detail and empty-search state. Cart actions were intentionally introduced in the following cart-UI checkpoint. [Design notes](DESIGN_NOTES.md) record generated concept/assets, implementation tokens and justified data differences.

## Frontend data flow and learning example

`CatalogPage` reads query parameters → parallel product/category reads → Zod parses runtime JSON → cards show current server data. A request-owning component is keyed by URL/attempt; abort cleanup avoids showing a stale search after navigation. URL state survives reload; input draft state belongs in React.

`AddToCart` checks session, validates a whole quantity and gets a fresh session-bound CSRF token. The browser sends only product ID/quantity. `mutateCart` validates the returned canonical cart; it never sends prices or a user ID. `/cart` loads only the authenticated user's relation. Update is absolute (3 means three total), while add merges (2 more onto3 means5). All amounts are integer sen from the server; `money()` only formats presentation.

`CartEditor` disables overlapping actions while a write is pending. A 409 triggers a fresh read and retains the conflict explanation. Account-keyed cart components discard the previous customer's UI state when identity changes. Unavailable lines remain removable, and no checkout action implies that an order exists. Authentication return URLs allow only `/cart` or an explicit product path, preventing external redirects.

## Limitations and next milestone

Cart is not a reservation and is not a quote. Another customer can consume inventory before future checkout. Prices/availability refresh on navigation, explicit refresh, mutation responses or conflict; no live cross-tab subscription. No guest cart, orders, payments, shipping, tax or admin management UI. M5 must revalidate stock/prices and atomically create order snapshots/decrement stock with duplicate-request protection. Review this milestone before starting it.

## Documentation delivery and review

Updated API/schema/architecture/requirements, decisions, roadmap, README and compact memory/log. The Obsidian project hub links the M4 learning guide and design record, with both generated concepts and six final browser screenshots. Allowlisted synchronization checks source/target hashes, exact Markdown bodies, unique titles and local links, preserving independent personal notes. No vault settings or secrets are copied. Obsidian rendered views/backlinks remain unverified.

All five action-plan parts are complete: reviewed baseline, owned cart backend, catalog/detail UI, connected cart UI with verification, and organized notes/commit handoff. Review M4 before M5; no push/deploy.
