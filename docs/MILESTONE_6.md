# M6 — Administration and fulfillment

M6 was authorized on 24 November 2026.

1. Build the role-protected API, verify the migration and database behavior, write and sync this note, then commit.
2. Build the admin forms and fulfillment pages, verify the admin and customer journeys, update the documentation and Obsidian hub, then commit.

The API checks the current database role on every admin request. Customer order ownership still applies to customer routes. Every admin write also checks a session-bound CSRF token. Products are archived in place to preserve their identity, and the database foreign key prevents deleting categories still in use. Inventory changes carry a delta and the version the admin saw. A conditional write rejects stale edits even if checkout updated stock between reading and saving.

Orders keep the existing PLACED status from M5. The only subsequent stages are PROCESSING, SHIPPED and DELIVERED. The order version guards simultaneous updates. Customer pages and admin pages read the same order row.

The migration applied to the isolated test database. All 48 integration tests passed, including authorization on all 13 endpoints, missing CSRF, competing inventory updates, category restriction, archive and shipped status as seen by the customer.
