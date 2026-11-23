# REST API — proposed contract

M4 in progress: the four customer-owned cart endpoints below are now implemented on top of M3 auth/CSRF. Shopping UI verification is pending. GET absent-cart id is null; DELETE item sends JSON `{}`. Cart lines expose current prices and availability AVAILABLE/INSUFFICIENT_STOCK/UNAVAILABLE; unavailable lines remain removable. No checkout/order/admin endpoints are implemented.

Implemented through M3: public catalog and health endpoints, the four auth routes below, `/api/v1/me`, `/api/v1/csrf`, and JSON API 404s. Cart/order/admin endpoints remain planned. Domain routes use `/api/v1`; auth uses Better Auth's `/api/auth` namespace. Cookies are same-origin sessions. Auth POSTs require exact Origin and bounded JSON; future domain mutations additionally require the session-bound CSRF token. Never accept a customerId or role as authorization evidence from the client.

## Endpoints

| Method | Path | Access | Behavior |
| --- | --- | --- | --- |
| POST | /api/auth/sign-up/email | Public | Library signup (name,email,password), server default CUSTOMER |
| POST | /api/auth/sign-in/email | Public | Library login, sets cookie |
| POST | /api/auth/sign-out | Session | Library revoke/clear cookie |
| GET | /api/auth/get-session | Public | Library-native session/null response; app uses sanitized /me and discards library tokens |
| GET | /api/v1/me | Session | Application identity and current role |
| GET | /api/v1/csrf | Session | Non-cacheable session-bound token for application mutations |
| GET | /api/v1/health/live | Public | Process liveness only |
| GET | /api/v1/health/ready | Public | Minimal ready/unavailable result; no infrastructure secrets |
| GET | /api/v1/products | Public | Active catalog search/filter/sort/page |
| GET | /api/v1/products/:slug | Public | Active product detail, else 404 |
| GET | /api/v1/categories | Public | Category list |
| GET | /api/v1/cart | Customer | Own canonical cart or nonpersisted empty cart |
| POST | /api/v1/cart/items | Customer | Merge productId,quantity; 200 updated cart |
| PATCH | /api/v1/cart/items/:productId | Customer | Replace quantity; 200 updated cart |
| DELETE | /api/v1/cart/items/:productId | Customer | Remove if present; 200 updated cart (idempotent) |
| POST | /api/v1/checkout/quotes | Customer | Create current quote; 201 |
| POST | /api/v1/orders | Customer | Atomic simulated checkout; 201; identical replay 200 |
| GET | /api/v1/orders | Customer | Own paginated history |
| GET | /api/v1/orders/:id | Customer | Own detail; 404 for absent or another customer's order |
| GET | /api/v1/admin/products | Admin | All statuses, paginated |
| GET | /api/v1/admin/products/:id | Admin | Editor detail including version |
| POST | /api/v1/admin/products | Admin | Create draft; 201 + Location |
| PATCH | /api/v1/admin/products/:id | Admin | Update metadata/price/status with expectedVersion |
| DELETE | /api/v1/admin/products/:id | Admin | Archive with expectedVersion JSON body; 204 |
| POST | /api/v1/admin/products/:id/inventory-adjustments | Admin | Delta + expectedVersion, return updated product |
| GET | /api/v1/admin/categories | Admin | All categories including unused ones |
| POST | /api/v1/admin/categories | Admin | Create; 201 |
| PATCH | /api/v1/admin/categories/:id | Admin | Name/slug update |
| DELETE | /api/v1/admin/categories/:id | Admin | 204 if unused; 409 CATEGORY_IN_USE otherwise |
| GET | /api/v1/admin/orders | Admin | Paginated store orders, status filter |
| GET | /api/v1/admin/orders/:id | Admin | Fulfillment detail |
| PATCH | /api/v1/admin/orders/:id/status | Admin | status + expectedVersion, return updated order |

“Customer” includes authenticated administrators shopping as themselves. Admin access is an additional permission checked on every administrative request. Auth responses/statuses follow the pinned library, not the application envelope below. Verify exact library routes and default schema during the auth milestone. [Email/password documentation](https://better-auth.com/docs/authentication/email-password).

## Query contract

`GET /products?q=keyboard&category=electronics&sort=price-asc&page=1&pageSize=20`

q max 100 chars; optional category slug; sorts newest/price-asc/price-desc/name; page integer 1–100000; pageSize 1–50 (default 20). Invalid/unknown/repeated parameters return 400 rather than silently expanding queries. Tie-break every sort by ascending ID. Response: `{ data: ProductSummary[], meta: { page, pageSize, totalItems, totalPages } }`. Search matches literal name/description substrings case-insensitively (LIKE wildcard characters are escaped). An empty/no-match/past-end page returns an empty array with accurate metadata. No advanced price/rating filter until a later milestone.

ProductSummary: id, slug, name, category summary, imagePath, priceMinor, currency, stockQuantity. Detail adds description. Public DTOs exclude internal roles, DB metadata and password/session fields. Admin DTO includes status/version.

## Mutation examples

Add: `{ "productId": "<uuid>", "quantity": 2 }`. PATCH quantity is absolute, not an increment; zero is invalid, use DELETE. Updated cart includes `{ id, revision, currency, items, totalQuantity, subtotalMinor }`; line has productId/name, current unitPriceMinor, quantity, lineTotalMinor, availableStock, availability.

Quote returns `{ data: { id, cartRevision, expiresAt, currency, items, totalMinor } }`. Persisted snapshot is not client-editable.

Place order: `Idempotency-Key: <client-generated UUID>` header and `{ "quoteId": "<uuid>", "shipping": { "recipientName": "Example Customer", "addressLine1": "Example address", "city": "Kuala Lumpur", "postalCode": "50000", "country": "MY" } }`.

Validate trimmed recipient 1–100, address 1–200, city 1–100, country exactly MY for the proposed Malaysia demo, postalCode five digits. These are demo input constraints, not a comprehensive delivery-address verification service. No client price, total, payment success flag, role or userId accepted. The response has immutable order items, shipping, status, version, createdAt, totalMinor, currency MYR and paymentMode SIMULATED. Never imply a real payment occurred.

Admin create product: name, slug, description, categoryId, trusted imagePath, priceMinor, initialStock. Initial stock integer ≥0; subsequent stock writes go through inventory adjustments. Status publication requires valid fields and positive stock. Product edits use expectedVersion and reject unknown/immutable fields. Status transitions only CONFIRMED → PROCESSING → SHIPPED → DELIVERED; no skips/backtracking. Reapplying current status with current version is a no-op.

## Errors and semantics

Success domain response `{ data: ... }` except paginated meta and 204. Domain error `{ error: { code, message, fieldErrors?, requestId } }`. Example: `{ "error": { "code": "STOCK_CONFLICT", "message": "An item no longer has the requested stock.", "requestId": "..." } }`. Machine code is stable; UI must not parse human wording.

| HTTP | Meaning / examples |
| --- | --- |
| 400 | Invalid JSON, unknown fields, malformed ID, validation, missing Idempotency-Key |
| 401 | Session missing/expired/revoked |
| 403 | Authenticated but wrong role; failed CSRF/origin check |
| 404 | Missing/hidden resource, including someone else's customer order |
| 409 | STOCK_CONFLICT, QUOTE_CHANGED/EXPIRED, CART_EMPTY, VERSION_CONFLICT, IDEMPOTENCY_CONFLICT, duplicate slug, category in use |
| 413 | Body too large |
| 429 | Rate limited, with Retry-After |
| 500/503 | Redacted unexpected failure or transient service unavailability |

Avoid caching private/session/cart/order responses (`Cache-Control: no-store`). No automatic retries for non-idempotent mutations. For uncertain checkout results retry the identical body/key; do not generate another key automatically. Use request IDs across logs without storing credentials/addresses. Serialize bounded money as JSON integers, not floating decimal currency or BigInt literals.

Maintain an OpenAPI document as routes are implemented; contract tests must verify representative response/error cases. The planning contract is not proof endpoints are available.
