# Release notes — Cartiva user-testing update

## Changes

- Clear Draft and Active controls with saved visibility and green publishing emphasis.
- Optional saved shipping for future checkouts. Historical order shipping is preserved.
- My Orders in storefront navigation, with a searchable, filterable table and detailed simulated order receipts.

## Deployment

The Render build applies migration 202611240004_saved_shipping. It adds a nullable JSONB column without rewriting orders or backfilling existing accounts. Back up the hosted database using the approved operator workflow before triggering a deploy of the reviewed commit. Verify the exact deployed revision and complete the hosted checkout and fulfillment walkthrough before marking the release complete.

The repository currently identifies builds by commit. The package manifests remain at 0.1.0.

## Verification

The candidate passed local lint, type checks, production builds, 23 HTTP/configuration tests, 49 PostgreSQL integration tests and the compiled release smoke. The screenshots in the README show representative local views. Hosted verification is tracked separately from GitHub publication.
