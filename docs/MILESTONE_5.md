# M5 — Simulated checkout and customer orders

M5 is authorized. The backend checkpoint adds checkout quotes, simulated order placement and owned order reads. The customer interface is the next checkpoint.

1. Implement and verify the database migration and checkout API, sync these notes to Obsidian, then commit.
2. Connect shipping, review, placement and order history pages. Verify the customer flow, sync notes and commit.
3. Record remaining limitations and present M5 for review before M6.

A quote records the cart revision and exact reviewed product names, quantities and prices for ten minutes. It does not reserve stock. Checkout locks the cart first and then products in ID order, rechecks the quote and availability, and commits inventory, order snapshot and cart clearing together. An exception rolls back all writes. The order stores the request hash and a customer-scoped retry key, so a lost response can be retried with the same request. Order items and shipping are stored as JSON snapshots, with no live product relationship.

The new migration applied to the isolated test database. All 45 PostgreSQL integration tests passed, including concurrent last-unit placement, replay, changed-body rejection, owner-only reads and price snapshot preservation. Additional rollback, expiry and browser checks remain for the milestone handoff.
