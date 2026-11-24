# Cartiva 2026 closure and 2027 handoff

The user accepted the portfolio demo and closed the 2026 development phase on 24 November 2026. The application baseline is ff4a8ab on the codex/m4-catalog-cart branch. Render reported that revision successfully deployed. GitHub Actions run 45346823199 passed on the same revision, including the clean build and database-backed release smoke. Previous hosted checks confirmed readiness, storefront and route responses, including the authentication boundary for saved shipping. The closure commit adds documentation only.

- [Live demo](https://cartiva-demo.onrender.com/)
- [Application baseline](https://github.com/nonoleekr/Cartiva/commit/ff4a8ab)
- [Release CI](https://github.com/nonoleekr/Cartiva/actions/runs/45346823199)
- [Operating runbook](RELEASE_RUNBOOK.md)
- [Commercial roadmap](DEVELOPMENT_ROADMAP.md#2027--commercial-store-resumption)

## Known limitations and technical debt

| Area | Current state | 2027 follow-up |
| --- | --- | --- |
| Payments and stock | Checkout is simulated and deducts stock when the simulated order commits. Carts and quotes do not reserve inventory. | Design payment confirmation, reservation expiry, refunds and idempotent reconciliation before connecting live payments. |
| Shipping and fulfillment | The demo stores one optional Malaysian shipping address and an order snapshot. Fulfillment uses manual status updates. | Define actual delivery zones, rates, tracking, returns and customer notifications. |
| Accounts and abuse controls | The demo lacks email verification and self-service password recovery. Authentication rate limits are process-local and depend on the socket peer behind the proxy. | Review recovery, administrator protection and trusted proxy handling. Add monitoring and consistent rate limits before commercial traffic. |
| Hosting and recovery | Render Free can cold-start. Usage limits and Neon restore retention are provider-dependent. The repository records a local restore rehearsal. | Review current plans, backup retention, alerts and restore times. Rehearse a hosted recovery with an isolated database. |
| Verification | CI covers builds, HTTP, PostgreSQL and compiled-server smoke. Browser checks have primarily used Chromium. Signed-in saved-address and publication behavior passed locally for the later revision. | Add release browser checks for payment, mobile, accessibility and cross-browser regressions. Keep synthetic test data separate from customers. |
| Release operations | Render uses manual deployment and build-time migrations. | Keep an additive migration discipline. Review dedicated migration execution, staging and rollback before commercial launches. |
| Maintenance | CI reported Node 20 action-runtime deprecation for checkout/setup-node v4. | Review supported action versions and dependency notices when development resumes. |
| Commercial readiness | The demo is configured for fictional shipping and simulated payments. | Review applicable consumer and data obligations, tax, retention, product listings and support policies before accepting real orders. |

Start 2027 by validating the existing checkout and order state model against the chosen provider's sandbox flow. Preserve historic order snapshots and distinguish payment, inventory and fulfillment states.

Portfolio handoff: the server owns authorization and totals, PostgreSQL serializes conflicting checkout writes, and request keys let a client safely retry. A commercial release needs independent payment event verification and reconciliation alongside those existing controls.
