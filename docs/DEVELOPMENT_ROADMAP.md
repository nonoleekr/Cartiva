# Development roadmap — proposed

Current state: architecture/stack/roadmap approved on 19 November 2026. User's “next step” on 23 November authorized M3 after M2. **M1–M6 implemented. M7–M8 remain future work.** See [M6 record](MILESTONE_6.md). Implement only one milestone at a time. Each finishes with a demonstration, explanation, recorded checks/gaps, and user review before the next begins. Do not scaffold all future modules at once.

Dependencies: approval → M1 → M2 → M3 → M4 → M5 → M6 → M7. M8 optional work is deliberately not scheduled into MVP.

## Required documentation and commit actions in every development plan

The user explicitly requires documentation, note-making and organized Obsidian updates as visible work items. For every authorized milestone or substantial development task, include:

1. **Prepare the notes:** read project memory/current records; identify the owning technical documents and milestone guide to update.
2. **Write while developing:** explain concepts, reasons/trade-offs, request/data flow, implementation decisions and lessons learned in the milestone guide. Include concrete examples and code/module references where useful; distinguish working features from future design.
3. **Record verification and handoff:** update the relevant API/database/architecture/requirements documents, decision log, development log and compact project memory. Record actual commands/outcomes, remaining gaps and next actions.
4. **Organize in Obsidian:** sync the notes into `Projects/Cartiva/reference/`, update the project hub/navigation for new notes and milestone status, and preserve personal notes outside generated references.
5. **Verify documentation completion:** run the sync's dry run, apply and verify commands from [Obsidian workflow](OBSIDIAN_WORKFLOW.md). Check contents, links, provenance and user-edit conflicts before handoff.
6. **Commit each significant completed part:** after its relevant checks and documentation/Obsidian updates, review the diff, stage only the intended changes and create a descriptive local Git commit. Record/report its hash, purpose and verification. Repeat for each coherent part instead of deferring all commits to milestone end.

Documentation and verified Obsidian synchronization are part of the definition of done for all remaining milestones. Do not mark them complete merely because application tests pass. M4 was subsequently authorized on 24 November.

## Git checkpoints within milestones

Requested 24 November 2026. Each milestone action plan must place local commit actions after its significant verified parts. Use meaningful units such as schema/API service, frontend flow, or substantial bug fix; avoid both one commit per file and a single unreviewable milestone dump. Keep the relevant documentation with its implementation commit. Examples for M4: cart schema/service with DB checks; catalog/detail UI with browser verification; cart UI/integration with ownership/concurrency checks. M4 checkpoints are recorded in its milestone guide.

For each checkpoint: inspect status/diff, run checks appropriate to that part, finish explanatory notes and Obsidian sync, selectively stage the intended files, commit with a clear message, then report the actual hash. Preserve unrelated changes and exclude secrets/generated artifacts. Existing untracked M1–M3 work requires an intentional baseline review before any later checkpoint; do not silently include it in a new part. Local commits do not imply push, deployment or history rewriting. If a commit cannot be made, record the actual blocker rather than claim completion.

## M1 — Independent foundation and compatibility check

**Objective:** a reproducible blank full-stack shell, not a shop feature.

**Features/modules:** `apps/web` Vite/React/TS shell and router; `apps/api` Express app/server and liveness; `packages/contracts` only if needed; root npm workspaces/lockfile; minimal README setup and CI; `.env.example` without secrets.

**Learn first:** browser vs server runtime, ESM, TypeScript strict mode, package boundaries, HTTP request/response and Vite proxy. Explain why TS types disappear at runtime.

**Tasks:**
1. Reconfirm approved choices and supported Node version; pin compatible Express/Better Auth/Prisma versions, checking adapter compatibility before install.
2. Create minimal web/API workspaces, strict configs and scripts; keep business modules absent.
3. Add health endpoint, environment validation, development proxy, React loading/error example from health.
4. Add lint/typecheck/build checks and GitHub Actions clean-install workflow; document exact commands.
5. Explain a browser-to-health request and production SPA fallback boundary.

**Acceptance:** fresh install using lockfile; web reaches API through proxy; invalid configuration fails clearly; unknown API returns JSON 404. No legacy imports/data/assets.

**Verification:** API health/404 smoke test, typecheck/lint, both builds, browser check of shell. No unnecessary tests mirroring static markup.

**Done:** reproducible setup, checked versions and scripts, honest README, user can explain the request path; review before M2.

## M2 — PostgreSQL schema and synthetic catalog API

**Objective:** persist products and expose a browsable server catalog.

**Modules:** `apps/api/prisma`, database/config, catalog routes/service, contract schemas, PostgreSQL integration setup; plan auth schema generation now to avoid later ID-type mismatch.

**Learn first:** PK/FK, one-to-many, unique/check constraints, migrations vs seed, joins, pagination, SQL parameters, ORM-generated SQL.

**Tasks:**
1. Run isolated local PostgreSQL; generate/review compatible auth base schema and domain user relationships, without implementing auth workflows yet.
2. Add category/product schema and SQL constraints; create fresh synthetic seed data (over 20 products for pagination verification).
3. Implement active-only list/detail/categories with bounded search/sort/page and explicit DTOs.
4. Add typed errors and request validation; document queries and example output.

**Acceptance:** empty DB migrates; repeatable seed; inactive items hidden; search reaches products beyond first page; invalid query bounds rejected.

**Verification:** real-DB integration tests for constraints, search/sort/filter/pagination and detail 404; inspect representative SQL/query count; all existing checks.

**Done:** schema/migration explained, contracts updated, deterministic data and tests; review before M3.

## M3 — Authentication, sessions, and authorization

**Objective:** prove identity, logout and admin boundary before protected commerce operations.

**Modules:** auth library adapter/config, auth middleware, CSRF, `/me`, role checks, local operator admin provisioning; web auth forms/session provider; auth migrations.

**Learn first:** hashing vs encryption, cookie session vs JWT, authentication vs authorization, XSS vs CSRF, server-trusted identity, middleware order.

**Tasks:**
1. Configure Better Auth handler before body parsing and configure password policy/rate limits/trusted origins.
2. Add signup/login/logout forms and session restore; all signup defaults CUSTOMER; no browser token persistence.
3. Implement current-role middleware and session-bound CSRF protection for domain mutations.
4. Provide explicit local admin setup without committing credentials; add a protected probe/test route only if useful, otherwise test role middleware directly.
5. Document demo-only missing recovery/verification flows and expiry behavior.

**Acceptance:** reload restores identity, logout invalidates it, expiry yields 401, customer cannot grant/administer roles, wrong origin/CSRF rejected, admin can pass role check.

**Verification:** HTTP integration for hashing/login/logout/revocation, invalid credentials, role injection, origin and CSRF; browser sign-in/out and reload; cookie flags checked in production-like environment.

**Done:** threat boundaries explainable, auth schema and error behavior documented, no secret/token in bundle; review before M4.

## M4 — Responsive catalog and persistent cart

**Objective:** discover products and maintain a correct account-owned cart.

**Modules:** web catalog/product/cart features, layout/UI primitives, API cart module and migrations, contracts.

**Learn first:** React props/state/effects, URL state, controlled forms, stable list keys, derived vs server state, row locks and uniqueness.

**Tasks:**
1. Build catalog/detail routes with API search/category/sort/pagination; show explicit loading/error/empty states.
2. Add cart schema and row-lock mutation strategy, line/quantity limits, cumulative stock checks and revision.
3. Build add/replace/remove UI from returned canonical cart; unavailable items remain removable.
4. Verify sign-in prompt, refresh persistence, account switching and keyboard/mobile controls.
5. Write `docs/MILESTONE_4.md` alongside implementation: React/URL/server state, cart ownership/locking/stock rules, request flow, examples and verified behavior. Update API/schema/decisions/memory/log as needed.
6. Organize and link the M4 notes in Obsidian; update the hub status and run sync dry-run/apply/verify before review.

**Acceptance:** adding 6 twice to stock 10 fails second add; PATCH replaces instead of increments; zero invalid; same product one line; other account cannot access it; no demos mask API errors.

**Verification:** unit quantity/money tests; DB concurrent adds/first-cart creation and ownership tests; component validation feedback; Playwright catalog→cart at 375px and 1440px.

**Done:** responsive path works with real API, no duplicate authority for totals; explanatory M4 notes and owning documents are current, linked in Obsidian and sync-verified; review before M5.

## M5 — Reliable simulated checkout and customer orders

**Objective:** complete a safe customer purchase journey with no actual payment.

**Modules:** checkout quotes, idempotency and order schema/services/routes; checkout/history/detail pages; real-DB concurrency tests.

**Learn first:** ACID transactions, race conditions, lock order, immutable snapshots, idempotency vs disabling a button, transaction rollback.

**Tasks:**
1. Add order/item, quote and deduplication migrations and API contracts.
2. Implement quote expiry/revision/price validation and transactional checkout from DATABASE_DESIGN.
3. Build shipping/review/submit with one retry key per intent; display “simulated” throughout.
4. Add paginated owned history/detail and handle changed price/stock by requiring review.
5. Demonstrate rollback and simultaneous buyers, explaining why client checks alone fail.
6. Write `docs/MILESTONE_5.md` with transaction/lock ordering, quotes, snapshots, idempotency, rollback examples and actual race-test evidence. Update API/schema/decisions/memory/log.
7. Organize and link the M5 notes in Obsidian, update hub status and verify synchronization before review.

**Acceptance:** empty/unavailable/stale cart rejected; last unit sold once; same-cart parallel checkout creates one order; identical key replay returns it; changed body/key conflict handled; failed transaction preserves stock/cart; product edits do not change history.

**Verification:** use two real DB connections for races; inject failure after stock decrement to verify rollback; quote expired/ownership/price-change tests; Playwright purchase, reload history, double-click/retry and failure feedback.

**Done:** all invariants tested, customer path demonstrated, API docs accurate; explanatory M5 notes and handoff are organized in Obsidian and sync-verified; review before M6.

## M6 — Administration and fulfillment

**Objective:** store owner can manage inventory/catalog and fulfill customer orders.

**Modules:** admin API routes/services, admin layout/product/category/order pages, optimistic version checks; existing commerce tables.

**Learn first:** RBAC vs ownership, archive vs delete, optimistic concurrency, finite state machines, referential integrity.

**Tasks:**
1. Implement protected product creation/edit/archive and category CRUD with used-category restriction.
2. Implement inventory delta adjustments/version conflict detection; avoid overwriting checkout stock changes.
3. Add paginated admin order list/detail and strict status transitions using the same order row customers read.
4. Build forms with field errors/confirmation for archive; maintain customer/admin route separation.
5. Write `docs/MILESTONE_6.md` explaining role/ownership checks, archive semantics, inventory/version conflicts, status transitions and verification evidence. Update API/schema/decisions/memory/log.
6. Organize and link the M6 notes in Obsidian, update hub status and verify synchronization before review.

**Acceptance:** customer gets 403 for every admin mutation; archive hides listing but preserves orders; category-in-use delete returns 409; concurrent stale edit rejected; customer sees shipped status after admin update.

**Verification:** HTTP authorization matrix across all admin routes, DB version/update races, status unit cases, Playwright admin edit→customer catalog and purchase→admin fulfill→customer status.

**Done:** full single-store MVP journey works and roles are server-enforced; explanatory M6 notes and handoff are organized in Obsidian and sync-verified; review before M7.

## M7 — Release verification, deployment and interview walkthrough

**Objective:** reproducible, honestly documented portfolio release.

**Modules:** CI workflow with DB/build/E2E, hosting config, environment examples, readiness/logging, README/demo guide, operations/restore notes.

**Learn first:** CI vs CD, build-time vs runtime secrets, same-origin cookies, deployment migrations, health/readiness, rollback vs data restore.

**Tasks:**
1. Complete CI gates, isolate test DB and run against production builds; fix actual accessibility/error gaps.
2. Confirm budget/host/domain choice; configure one-origin static/API hosting and managed PostgreSQL, TLS/pooling/secrets.
3. Back up and apply migrations through a single release step; verify readiness, restart persistence and synthetic restore procedure.
4. Run deployed cookie/logout/CSRF tests and full customer/admin flow; record measured limitations/cold starts.
5. Update README with implemented-only features, screenshots, real setup commands, architecture and interview explanation.
6. Write `docs/MILESTONE_7.md` with release checks, deployment/TLS/proxy decisions, migration/backup/restore procedures, limitations and interview walkthrough. Update technical documents and project memory/log from actual evidence.
7. Organize and link release/operations/learning notes in Obsidian, update hub status and verify synchronization before the final release handoff.

**Acceptance:** CI passes from clean checkout; deployed purchase/status journey works; no secrets/PII exposed; restart retains DB data; no unsupported production/payment claims.

**Verification:** build/type/lint/unit/DB/E2E gates, manual keyboard/mobile checks, deployed smoke tests, restore rehearsal. Do not rerun unrelated suites without a reason after passing gates.

**Done:** verified release evidence and known limitations recorded, user can explain React→API→DB and checkout concurrency; release/operations/learning notes are organized in Obsidian and sync-verified. Publishing requires the user's then-current authorization; this plan creates no hosting resources now.

## 2027 — Commercial store resumption

The 2026 portfolio phase is closed. Resume by reviewing the [closure handoff](PROJECT_CLOSURE.md), the deployed baseline, and current provider terms. Scope the commercial storefront to products sold and fulfilled by the operator.

1. **Define store operations.** Decide supported markets, stock and shipping rules, customer support, cancellations, returns and refunds. Confirm the applicable privacy, consumer and tax obligations before collecting real customer information.
2. **Design and verify payments in a sandbox.** Choose a provider after comparing availability, fees, settlement, refund support and hosted checkout. Define payment state separately from fulfillment. Verify signed payment events, persist and deduplicate event IDs, reconcile delayed or repeated events, and establish when inventory is reserved and released. Fulfillment starts only after payment is confirmed.
3. **Prepare commercial fulfillment.** Add workflows for shipment references, customer notifications, refunds and operational reconciliation. Exercise failed payments, out-of-order events, duplicate submissions and fulfillment exceptions.
4. **Run a launch rehearsal.** Choose hosting and database capacity, verify backups and restoration, configure monitoring and account recovery, and use a separate staging environment. Review the launch checklist before accepting live payments.

Reviews, wishlists, and other portfolio enhancements remain optional. Prepare a separate implementation plan for each commercial stage, including checks, Git checkpoints and Obsidian updates.

## Universal review record

For each milestone record: objective, changed files, concepts explained, commands/checks and outcomes, demo evidence, unresolved limitations, next actions, user review decision, actual Obsidian note locations/sync-verification result, and actual local commit hashes/scopes for significant parts. “Done” requires passing relevant checks, understandable notes, verified vault organization and completed commit checkpoints (or explicitly recorded blockers); code generation alone is not completion.
