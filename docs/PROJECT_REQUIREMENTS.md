# Cartiva requirements — proposed

Requirements approved on 19 November 2026. M1 creates the foundation; M2 implements catalog API/data; M3 implements AUTH-1 and the authorization infrastructure for AUTH-2 (actual admin mutations remain M6). M4 implements CAT-1, CAT-2 and CART-1, with local verification recorded in its guide; M5 implements simulated checkout and customer orders. M6 implements catalog, inventory, category and fulfillment administration. This is a single-store educational portfolio project, not a marketplace or live merchant system.

## Users and outcomes

Visitors discover products. Customers keep a persistent cart and place simulated orders. Administrators manage the store and fulfill orders. The developer should explain each request from React through HTTP, service logic, and SQL, and justify trade-offs in interviews.

## Essential MVP

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| AUTH-1 | Email/password registration, login, logout; all signup creates CUSTOMER | Session survives reload; logout revokes session; supplied ADMIN field rejected/ignored safely |
| AUTH-2 | Admin permissions enforced by API, role stored server-side | Anonymous gets 401, customer gets 403 on admin mutations |
| CAT-1 | Catalog/detail pages, active products only | Archived/draft products hidden; unknown slug returns 404 |
| CAT-2 | Server search, category filter, allowlisted sorting, pagination | Search finds seeded item beyond first page; URL preserves query on refresh |
| CART-1 | Persistent customer cart, merge add, replace quantity, remove | Two accounts cannot read/change each other's cart; quantities 1–99, stock checked |
| CHECK-1 | Shipping form, review of current prices, simulated order placement | No card data collected; UI always states payment is simulated |
| CHECK-2 | Atomic stock/order/cart changes; idempotent retry | Last-unit race permits one buyer; repeated request creates one order; failure rolls back |
| ORDER-1 | Customer history, detail, current status | Customer sees only own orders; snapshots survive product edits |
| ADMIN-1 | Product create/read/update/archive; category create/read/update/delete when unused; inventory adjustments | Protected API/UI, input constraints; ordered products retain history; used categories cannot be deleted |
| ADMIN-2 | Paginated order list/detail and fulfillment transitions | Confirmed → processing → shipped → delivered; invalid jumps rejected |
| UX-1 | Mobile/desktop layouts and accessible controls | Verify 375px and 1440px, keyboard navigation, labels, loading/error/empty states |

An authenticated cart is the MVP: login required before adding. No guest merge policy is needed. A customer with ADMIN privileges may also shop; admin role grants administrative actions, not ownership of all customer-facing resources.

## Proposed business boundaries

- Currency: MYR, integer sen, one currency only. Prices positive; total equals sum of item totals; shipping charge and tax explicitly zero in this demo. This is a simulation policy, not tax guidance.
- Stock is a nonnegative integer; a cart does not reserve stock. Revalidate all lines at checkout.
- All checkout requests require a recent server quote matching cart revision, quantities, and current prices. Changed quote returns 409 for review; never silently charge a revised total.
- Order stores shipping and line snapshots. Only administrator fulfillment transitions above are in MVP. Cancellation/refund/restock workflows are deferred rather than partially implemented.
- Product deletion is archive semantics. Categories can be deleted only when no products reference them. New public registrations cannot grant roles.
- No real personal/customer information in seed data, screenshots, public test accounts, or documentation.

## Future enhancements

After a verified MVP: wishlist; price-range/in-stock filters; sales dashboard; product image uploads; reviews and eligibility/moderation; guest cart; password recovery and email verification; customer cancellation with transactional restocking; payment provider sandbox/webhook state machine. Real payments and broader public signup require a separate readiness review. Multi-seller marketplace remains outside the current roadmap.

## Quality requirements

- Strict TypeScript and runtime request validation; readable feature modules.
- Database constraints and migrations; no browser/database direct access.
- No auth tokens in localStorage, no secrets in client bundles or git.
- HTTPS production, secure cookies, explicit origin/CSRF checks, rate/body/page limits, safe structured errors.
- Unit tests for rules, PostgreSQL integration for transactions/ownership/races, browser tests for complete workflows.
- CI gates typecheck/lint/tests/build; migrations reviewed and applied in deployment order; restore procedure documented.
- No availability or performance claims until measured. Establish a small seed dataset and record catalog query count/latency before adding caching.

## Learning rules and approval boundary

Explain unfamiliar concepts before code. Build one milestone, explain the changes, execute meaningful checks, demonstrate the flow, and record remaining gaps. Do not mark a feature complete because a screen exists. Stop at milestone review; do not start multiple milestones in one step. Planning documents are proposals and may change with the user's decisions.
