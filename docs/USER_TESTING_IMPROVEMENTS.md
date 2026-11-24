# User testing improvements

## Publication and navigation

The Draft and Active controls select a pending change. The status message describes the last saved visibility and explains the effect of saving. New products remain drafts, and the existing server stock/version checks still decide whether publication succeeds. My Orders now lives in the signed-in storefront navigation and stays selected on order detail.

## Customer orders

The customer list retains its original page contract and adds itemCount, exact order ID search and fulfillment filtering. Both list and detail retain the session owner predicate. Counts sum purchased quantities from immutable line snapshots. The new responsive table reuses shared pagination, and detail presents shipping and a simulated payment breakdown. Type checks and all 48 PostgreSQL tests passed, including full-ID lookup scoped to the owner.

## Saved shipping and release handoff

A nullable savedShipping field on the user stores one validated Malaysian address. Checkout reads only the current session owner and offers an unchecked save option. On successful placement the order keeps its own shipping snapshot and an opt-in saves the account address in the same transaction. Replays return before the address write. Historical clients that omit the save flag keep the previous request hash and behavior.

Locally, run npm run db:migrate before starting the updated API. The migration adds a nullable JSONB column. Existing accounts begin with no saved address, and historical orders need no rewrite. The hosted schema must be upgraded before the new API serves traffic. An application rollback can retain the unused column.

Chromium verified keyboard publish and unpublish, saved status after refresh, My Orders navigation and filtering, a simulated checkout, prefill after sign-out/sign-in and refresh, an unchecked save option on revisit, and a blank address for a separate account. The order table fit the page at 375, 768 and 1440 px. Synthetic accounts and products were removed after verification.

Final local gates passed lint, type checks, both builds, 23 HTTP/configuration tests, 49 PostgreSQL integration tests and the production-build smoke. The integration suite upgraded the existing test schema and confirmed opt-in, opt-out, account isolation, replay after a newer save and unchanged historical shipping.

The status description now emphasizes Unpublished and the green publish action, with a green Active indicator and a contrast-aware dark-mode description. The publication workflow and wording are unchanged.

The status description inherits its panel background. OS dark preference no longer recolors the light portal. Explicit dark surfaces use readable slate and emerald text. Both saved status labels use the same semibold weight. The web build and Chromium computed-style checks passed.
