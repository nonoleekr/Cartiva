# M6 — Administration and fulfillment

M6 was authorized on 24 November 2026.

1. Build the role-protected API, verify the migration and database behavior, write and sync this note, then commit.
2. Build the admin forms and fulfillment pages, verify the admin and customer journeys, update the documentation and Obsidian hub, then commit.

The API checks the current database role on every admin request. Customer order ownership still applies to customer routes. Every admin write also checks a session-bound CSRF token. Products are archived in place to preserve their identity, and the database foreign key prevents deleting categories still in use. Inventory changes carry a delta and the version the admin saw. A conditional write rejects stale edits even if checkout updated stock between reading and saving.

Orders keep the existing PLACED status from M5. The only subsequent stages are PROCESSING, SHIPPED and DELIVERED. The order version guards simultaneous updates. Customer pages and admin pages read the same order row.

The migration applied to the isolated test database. All 48 integration tests passed, including authorization on all 13 endpoints, missing CSRF, competing inventory updates, category restriction, archive and shipped status as seen by the customer.

## Admin walkthrough and verification

Sign in with an explicitly provisioned administrator account and open Store administration from Account. Create a category, create a draft product, then set it Active with positive stock. Edit metadata separately from inventory. For example, an editor who saw version 4 cannot add two units after checkout advances the version to 5. Reload the product and decide whether that adjustment is still appropriate. Archived products are read-only. A category referenced by a product remains protected even after the product is archived.

Open Orders, filter by status if desired, and use the next fulfillment action from the detail page. The customer sees the saved status after revisiting the order. The initial status stays PLACED to preserve existing orders and the M5 contract.

Chromium verified category and draft creation, product publication, a customer role denial, purchase, processing and shipping, the updated status on customer reload, and archive hiding the product. The 375 px product editor had no horizontal overflow. Temporary fictional browser records were cleaned up. The migration applied to local development and test databases. All 71 automated tests passed, including 48 PostgreSQL integration tests.

Backend checkpoint ff60b22. The subsequent local commit contains the admin screens and final notes. The Obsidian hub contains a linked copy of this guide. M7 is release verification and deployment review.
