# M7 — Release verification and deployment handoff

M7 was authorized on 24 November 2026. The release candidate uses one Express process to serve the compiled React application and its API, with PostgreSQL outside the process.

1. Verify lint, types, HTTP tests, builds, isolated PostgreSQL tests and the production entry point. Record the checks in this guide, sync Obsidian and commit the CI checkpoint.
2. Rehearse restore locally and prepare a host configuration and release runbook. Record the remaining decisions, sync Obsidian and include the runbook in the local release checkpoint.
3. After the hosting budget and publication scope are confirmed, verify the hosted site and record its URL, browser results, persistence, logout and observed cold-start times.

## Local checks

The local release gate passed lint, typechecks, both builds, 23 HTTP/configuration tests and 48 PostgreSQL tests. The compiled-server smoke passed separately. M6 browser checks verified the admin and buyer journeys on the development server.

Use Node 24.11.1, npm 11.17.0, and a disposable local PostgreSQL test database.

```powershell
npm ci
docker compose --profile test up -d --wait
npm run check
$env:TEST_DATABASE_URL = 'postgresql://cartiva_test:cartiva_test_only@127.0.0.1:5435/cartiva_test'
npm run test:integration
npm run test:release
```

The GitHub workflow runs these checks in the same order after installing dependencies and starting a PostgreSQL service. The last step starts the compiled server over loopback with production settings. It checks the SPA deep link and built JavaScript, readiness, JSON API 404, Secure/HttpOnly/SameSite flags, CSRF rejection, checkout, admin fulfillment, logout and persisted order/stock after an app restart. It inserts and removes only known synthetic fixtures. The test supplies the cookie directly over local HTTP, so browser TLS and reverse-proxy behavior need hosted verification. Remote CI has no run recorded for this checkpoint.

Restore rehearsal used pg_dump custom format and pg_restore into a separate temporary database in the test container. Product (26), category (3), order (0) and migration (5) row counts matched, and the temporary archive and database were removed. This verifies schema and catalog restore. The restart smoke separately checks a placed and shipped order.

## Interview walkthrough

React asks Express for catalog and cart data. Express validates input and reads the session identity, and PostgreSQL holds durable carts, stock and orders. Checkout compares the quote to the current cart, locks the cart and product rows, and saves the order and stock changes in one transaction. Two requests for the last unit cannot both commit. A retry key returns the order from the original successful request. Fulfillment advances the same order row that the customer reads, with a version check on competing admin updates.

CI checks each proposed code change. Deployment promotes an approved build with separately configured runtime credentials. Readiness reports whether the API can reach the database. Rolling back application code and restoring stored data are separate operations with different effects on customer writes.

## Deployment handoff

[Hosted release runbook](RELEASE_RUNBOOK.md) records the proposed Render setup, migration and backup sequence, admin bootstrap and hosted acceptance checks. Hosting tier, database provider and publication scope require confirmation.

## First hosted verification

The public Render service is https://cartiva-demo.onrender.com/. HTTPS checks returned 200 for the storefront, admin sign-in deep link, database readiness, and product API. The product API returned zero records. An anonymous admin API request returned 401 and an unknown API route returned JSON 404. Hosted sign-in, admin provisioning, catalog setup, checkout and fulfillment still need verification with a dedicated demo account and fictional products.
