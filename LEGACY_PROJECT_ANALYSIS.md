# Reference project analysis

Inspected 19 November 2026. Reference checkout: `D:/Coding_Projects/simple-ecommerce-cart-system`, HEAD `30fca8607be5a456a846b76c051642c7e243f76c`. Working tree was clean at inspection. No legacy files were edited and no runtime data files were read or copied.

## Evidence and limits

This is a static implementation review of source, manifests, SQL migrations, configuration, and test sources. Application launch, Maven tests, browser workflows, database migrations, and deployment were not executed. “Implemented” below means a concrete code path exists, not that it has passed runtime verification. The assignment PDF/DOCX and concept PNG are historical artifacts, not evidence of runtime behavior; their content was not used for feature claims.

All paths below are relative to the reference repository. Java web package paths abbreviated as `B/` mean `backend/src/main/java/io/github/nonoleekr/cartiva/`. SQL lives under `backend/src/main/resources/db/migration/`. Open these paths in the reference repository, not the new Cartiva directory.

## Purpose and actual structure

The original assignment demonstrates data structures through a desktop shop: authenticate, browse local products, build a cart, simulate payment, enqueue orders, and view saved orders. The checkout now also contains a separate web modernization. Ignoring it would incorrectly report many existing features as missing.

| Location | Responsibility |
| --- | --- |
| `src/App.java` | Swing event-thread entry point, opens `LoginFrame` |
| `src/ui/LoginFrame.java`, `MainFrame.java` | Desktop UI, authentication forms, catalog/cart/payment/history dialogs |
| `src/model/` | Mutable models, custom linked cart, custom queue, text-file managers |
| `src/benchmark/PerformanceBenchmarks.java` | Opt-in educational timings, separate from app startup |
| `tests/model/` | JUnit cart, FIFO queue, and serialization examples |
| `backend/` | Independent Spring Boot application, feature modules, JPA repositories, REST controllers |
| `backend/src/test/` | Mockito service tests, token test, system controller test |
| `frontend/` | React/Vite SPA, hand-written CSS, API adapter, local demo product data/assets |
| `compose.yaml` | PostgreSQL service and named volume, not an app deployment |
| `data/`, `bin/`, `target/`, `lib/` | Local data/build/support directories; directory presence is not a deployable feature |
| `DSA Assignment Report.*`, `docs/design/` | Assignment documentation and storefront concept |

Desktop flow: `App.main → LoginFrame → UserManager → MainFrame → Cart/OrderQueue/OrderManager → text files`. UI handlers also perform validation and orchestration. There is no desktop HTTP backend or database.

Web flow: `frontend/src/App.tsx → api.ts → /api/v1 → Spring Security → feature controller → service → JPA repository → PostgreSQL`. Vite's development proxy forwards `/api` to port 8080. Root Maven and `backend/pom.xml` are separate builds, not a root multi-module reactor.

## Verified technologies

- Desktop: Java, Swing/AWT, standard Java I/O, custom singly linked nodes (`CartItem.next`, `OrderQueue.Node`), `ArrayList`, `Date`, `double`. The cart is not `java.util.LinkedList` despite README wording. Root Maven targets Java 25 and declares JUnit Jupiter 5.11.4.
- Web backend: Java 25 target, Spring Boot 4.1.2 declared in its POM; Web/MVC, Validation, Security, OAuth2 resource server/JWT, Data JPA/Hibernate, Actuator; PostgreSQL JDBC; Flyway; springdoc OpenAPI 3.2.0; JUnit/Mockito via Boot tests. These are declared versions, not independently verified installed compatibility.
- Database: Compose declares `postgres:17-alpine`. V1–V7 migrations define identity/roles, catalog, cart, orders, wishlist, reviews, and seller fulfillment. JPA validates schema instead of creating it; Flyway applies migrations.
- Frontend: React, React DOM, TypeScript, Vite, React Vite plugin; plain CSS, browser fetch, localStorage, Intl. `frontend/package.json` uses `latest` ranges and has dev/build/preview scripts. There is a lockfile, but no frontend test/lint scripts or Tailwind dependency.
- No Node/Express business backend, Prisma, Drizzle, real payment SDK, or verified hosted deployment in the reviewed source. No `.github/workflows` directory was found.

## Feature status matrix

| Feature | Swing assignment | Web modernization |
| --- | --- | --- |
| Registration/login | Implemented: `LoginFrame.handleRegister/handleLogin`, `UserManager.registerUser/loginUser`; plaintext passwords | Implemented: `RegistrationService.registerCustomer/registerSeller`, `AuthenticationService.login`; BCrypt and expiring JWT |
| Logout | `MainFrame.logout` opens login frame; session cart discarded | Client deletes localStorage session in `App`; no server token revocation/logout route found |
| Catalog/details | File-loaded product table, no dedicated detail screen | Public browse/details/categories endpoints in `CatalogController`; detail modal in `ProductDialog` |
| Search/sort/filter | Missing | API text/category/sort/page support; UI filters/sorts only the first fetched 20 products; advanced filters missing |
| Cart add/edit/remove/total | Implemented, memory only | Implemented, customer-owned database cart; server totals |
| Stock | Per-entry UI validation only; checkout does not deduct | Cumulative add validation and transactional checkout deduction, product row locks |
| Checkout/payment | Timer-based simulated success | Shipping-address request and simulated confirmed order; no money movement |
| Order history | `OrderManager.getUserOrders`, history/details dialogs | Customer history endpoint and `OrdersDialog` |
| Fulfillment/status | Custom FIFO methods exist; processing UI action is not wired | Seller queue and allowed transitions; customer aggregate status not synchronized |
| Product management | Product constructor/parser; no management UI or save-products flow | Seller draft/create/update/publish/archive; no physical delete endpoint |
| Categories | Missing | Seeded categories/listing/filter; no category CRUD endpoint found |
| Wishlist/reviews | Missing | Services/controllers and UI exist; one review per customer/product, not purchase-verified |
| Admin | Missing | ADMIN role seeded, but no admin workflow or dashboard found; seller role is not equivalent |
| Responsive UI | Desktop fixed starting sizes | Responsive CSS/React source exists; mobile accessibility not browser-verified |
| Testing/CI | Three JUnit classes | Ten backend test classes; no frontend tests or Actions workflow found |

The web layer is partially integrated: it has many real endpoints, but demo fallbacks, partial catalog consumption, status inconsistencies, and deployment/test gaps prevent calling it a completed production system.

## Desktop cart and checkout rules

`Cart.addItem(Product,int)` scans by product ID, merges matching quantities, otherwise prepends a `CartItem` node. Duplicate adds are O(n), insertion after the scan is O(1); adding n distinct items is O(n²). `removeItem(String)` unlinks the matching head/interior node, O(n). `calculateTotal()` sums price × quantity in O(n). `getHead()` exposes mutable internals; model methods do not enforce positive quantities or stock.

`MainFrame.addSelectedProductToCart()` checks only the requested increment against product stock. With stock 10, adding 6 twice produces 12: the aggregate is never checked. `showCartDialog()` validates edited quantities, then removes/re-adds the line. It locates selected entries by product name rather than ID; duplicate names can change/remove the wrong item.

`showPaymentDialog(Cart)` totals the cart and offers credit/debit/PayPal/COD labels. Confirm starts a two-second Swing timer, constructs `Order`, calls `OrderQueue.placeOrder` and `OrderManager.saveOrder`, then replaces the active cart and displays success. This is payment simulation; the selected method is not persisted. There is no shipping, tax, discount, inventory decrement, or payment provider. Confirm is not disabled while timers are pending, allowing duplicate submissions. `Order` holds the supplied mutable cart reference rather than an immutable snapshot.

`OrderQueue.placeOrder/processNextOrder` implement O(1) FIFO enqueue/dequeue with front/rear pointers. The queue is per frame and lost on restart; saved history does not restore pending queue state. `MainFrame.processNextOrder()` exists but the constructor attaches no processing button/listener, so the advertised processing workflow is only partly exposed.

`OrderManager.saveOrder()` adds to memory then appends `Order.toString()` to disk. `loadOrders/processOrder` parse that human-readable format; timestamp text is read but not restored, so reloaded orders receive the current time and history ordering is unreliable. `Order.toFileString/fromFileString` define another format but are not used by the manager.

## Web business logic and important improvements

- `B/catalog/CatalogService.browse` normalizes query/category, allowlists sorts, caps page size at 100; `ProductRepository.searchCatalog` filters active products. Seller mutation uses `findByIdAndSellerId`, enforcing ownership.
- `B/cart/CartService.addItem` checks merged quantity against active stock; `updateItem/removeItem` work within the authenticated customer's cart. Request records use `@Min(1)`. V3 enforces positive quantities and unique cart/product pairs. `CartResponse.from` computes decimal totals from current product prices; a cart does not reserve stock.
- `B/order/OrderService.checkout` is transactional, rejects missing/empty carts, locks each product using `ProductRepository.findByIdForUpdate`, rechecks active status and stock, decrements inventory, snapshots names/prices in `OrderItem`, saves the order, clears the cart. V4 adds product versioning. This is substantially stronger than the desktop workflow.
- `B/order/Order.addItem` creates one fulfillment per seller; `SellerOrderResponse.from` filters lines by seller. `SellerOrderService.updateStatus` enforces confirmed → processing → shipped → delivered, with cancellation before shipping.
- `B/wishlist/WishlistService` hides inactive products and treats sequential duplicate saves as a no-op. V5 supplies a unique constraint. `B/review/ReviewService.create` rejects a second review; V6 constrains ratings to 1–5. There is no purchased-item eligibility check.

## Findings and limitations, prioritized

| Priority | Finding and source | Implication / lesson for new project |
| --- | --- | --- |
| High | `src/model/User.toString`, `UserManager.loginUser` serialize/compare raw passwords | Never reuse plaintext credentials; let an auth library own hashing/sessions |
| High | `UserManager.saveUsers`, `OrderManager.appendOrderToFile` catch write errors; callers still report success | Persistence failures must fail the operation; transaction boundary belongs in services |
| High | `MainFrame.addSelectedProductToCart/showPaymentDialog` aggregate stock bug and no deduction | Validate merged quantities and atomically revalidate at checkout |
| High | `B/security/SecurityConfiguration` accepts a checked-in fallback HMAC secret from `application.yml` | Unsafe if deployed unchanged; production must fail startup without real secrets |
| Medium | Web session stored in localStorage (`App` state/effect), logout only deletes client copy | XSS can expose bearer tokens; stolen tokens remain valid until expiry. No refresh/revocation flow found |
| Medium | `AuthenticationService.login` checks active status only at login; JWT security uses token claims thereafter | Suspending/changing roles may not invalidate already-issued tokens before expiry |
| Medium | `OrderService.checkout` lacks an idempotency key or explicit cart-row lock; locks products in cart order | Duplicate/concurrent requests and reverse product lock ordering need real DB tests; duplicate checkout/deadlock risk is inferred, not reproduced |
| Medium | `SellerOrderService.updateStatus` only updates fulfillment, while `Order.getStatus` returns unchanged parent state | Customer history can stay CONFIRMED after shipping; cancellation does not restore inventory in this path |
| Medium | Frontend `App` initially uses `featuredProducts`, suppresses catalog load errors, retains demos on empty result | API outage/empty store looks like a populated catalog, demo IDs cannot be bought; show explicit states |
| Medium | `api.fetchProducts` requests size=20; `App.visibleProducts` searches/sorts locally | Products outside that page are undiscoverable from UI; integrate server query and pagination |
| Medium | No rate-limit configuration in reviewed security chain; public seller signup; reviews need no purchase | Public abuse controls and business roles require explicit design; these are review gaps, not exploit tests |
| Medium | `CatalogService` throws `IllegalArgumentException`; exception advice has no dedicated mapping for it or DB uniqueness races | Some invalid/duplicate concurrent requests may return generic errors; design stable typed errors |
| Low | Swing uses `double`, delimiter splitting, locale-dependent formatted money, millisecond order IDs | Rounding, commas in names, malformed numerics, locale parsing, and ID collisions need deliberate handling |
| Low | `Product.fromString` numeric parse errors escape; `UserManager.loadUsers` stops at blank lines | One bad record can disrupt loading; schema validation should be explicit |
| Low | `frontend/src/App.tsx` contains nearly all UI/state/operations, compressed into large lines | Feature modules and routed pages improve comprehension and targeted tests |
| Low | `Dialog` declares aria-modal but has no focus trap/Escape handling in source | Accessibility needs keyboard tests, not only ARIA labels |
| Low | `ProductDialog.submit` and `SellerDialog.submit` use `event.currentTarget.reset()` after awaiting | Capture the form before the await; currentTarget may no longer refer to the form, creating apparent post-success errors |
| Low | Manifest `latest` ranges; no CI/frontend tests; default image lookup tied to slugs | Pin compatible dependencies, verify fresh installs, use explicit product image fields |

The desktop README's broad persistence/processing claims exceed actual behavior. Tests in `tests/model/SerializationTest` cover Product/User formats, not OrderManager timestamp restoration or failure handling. Web tests mostly mock repositories: `OrderServiceTest.checksOutWithSnapshotsDeductsStockAndClearsCart` verifies orchestration but cannot prove real row locks, rollback, or concurrency. No passing-test count is claimed here.

## What to reuse conceptually

Keep product IDs as identity; merge cart lines; calculate totals on the server; keep historical price/name snapshots; scope customer and administrative queries; recheck stock at checkout; enforce explicit status transitions; preserve a customer order history. Retain FIFO as an educational example, not a production ordering guarantee or required infrastructure queue.

Do not copy the custom nodes, raw text persistence, credentials, JWT configuration, demo fallback behavior, seller marketplace complexity, or existing assets. Build fresh, synthetic seed data only.

## Learning takeaways

Explain the difference between a data structure exercise and a concurrent web system. UI checks improve feedback; service rules and SQL constraints protect correctness. A transaction makes stock, order, and cart changes succeed or fail together. A mocked unit test does not prove a database invariant. A feature label or screenshot does not prove integration. Prefer one complete customer-to-admin vertical slice over many partial screens.

Next: evaluate the independent [requirements](docs/PROJECT_REQUIREMENTS.md), [architecture](docs/SYSTEM_ARCHITECTURE.md), and [roadmap](docs/DEVELOPMENT_ROADMAP.md), then approve or revise the proposal before implementation.
