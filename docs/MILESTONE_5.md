# M5 — Simulated checkout and customer orders

M5 implements checkout quotes, simulated order placement, and customer order history and detail. The backend checkpoint is 2fa57b5.

1. Implement and verify the database migration and checkout API, sync these notes to Obsidian, then commit.
2. Connect shipping, review, placement and order history pages. Verify the customer flow, sync notes and commit.
3. Record remaining limitations and present M5 for review before M6.

A quote records the cart revision and exact reviewed product names, quantities and prices for ten minutes. It does not reserve stock. Checkout locks the cart first and then products in ID order, rechecks the quote and availability, and commits inventory, order snapshot and cart clearing together. An exception rolls back all writes. The order stores the request hash and a customer-scoped retry key, so a lost response can be retried with the same request. Order items and shipping are stored as JSON snapshots, with no live product relationship.

The new migration applied to the isolated test database. All 45 PostgreSQL integration tests passed, including concurrent last-unit placement, replay, changed-body rejection, owner-only reads and price snapshot preservation. The completed checks below extend that backend checkpoint.

## Customer flow and verification

From the cart, enter fictional Malaysian shipping details and review the current total. Submit the simulated order, then open order history. The review holds one retry key in memory. A failed network response can be retried from the same review, and a conflict prompts fresh review. Reloading discards the form and retry key, while saved orders remain accessible through history.

Chromium at 375 × 812 verified signup, product add, checkout review without horizontal overflow, order placement, and saved history after reload. Build, lint, typechecks and 23 automated HTTP/configuration checks passed. All 46 PostgreSQL integration tests passed (69 automated tests overall). They cover price changes, quote expiry, same-cart concurrent placement, and a forced order insert failure after stock decrement. The rollback test confirmed that stock stayed at 10 and the cart retained its line.

The demo uses zero tax and shipping fees and a Malaysia-only address form. Automated replay is covered at the API boundary. Browser verification covered the normal purchase and history path.
