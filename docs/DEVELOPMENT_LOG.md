# Cartiva — development log

This log summarizes work already evidenced in the project records. Dates below describe those records, not fresh re-verification.

## 19 November 2026 — analysis, approval and M1

- Inspected both the legacy Swing assignment and its later Spring/React modernization. Created analysis and architecture/requirements/database/API/roadmap/decision documents. Legacy repository untouched.
- User approved architecture, stack and roadmap. Implemented independent React/Express workspaces and foundation UI, health API, config checks, API/SPA routing, lint/type/build scripts and CI.
- Recorded clean install, 15 passing tests, dev/production routing, desktop/mobile browser and retry/keyboard verification. No database or shopping features at M1.

## 19 November 2026 — M2

- User's “continue” authorized database/catalog API milestone.
- Added isolated PostgreSQL services, Prisma, generated auth-base schema (without auth workflows at this point), category/product migrations and constraints, synthetic seed and catalog endpoints.
- Added search/filter/sort/pagination, explicit public DTOs and readiness; measured bounded query count. Fixed the Windows development watch startup by using Node built-in watch with the tsx loader.
- Docker pause blocked initial verification; user approved resuming it. Final record: 42 passing tests, clean install/generation, build/lint/typechecks, real database and live API checks. No shopping UI/cart yet.

## 23 November 2026 — M3

- User's “next step” authorized authentication/sessions/authorization only.
- Added transactional Better Auth integration, random local secret setup, exact origin/JSON/body limits, cookie/session policies, sanitized identity, current-role and session-bound CSRF middleware.
- Added registration/sign-in/out/account UI with session restoration, timeout/cleanup/race handling. Added explicit local admin promotion with session revocation, no seeded password.
- Final record: 23 HTTP/config/safety plus 30 PostgreSQL tests, 53 total; lint/type/build passed. Chromium desktop/mobile flow checked including failed login, reload, logout, role changes and invalidated sessions. Removed synthetic browser-test account afterward.
- Remaining: hosted TLS/proxy/CI execution, other browsers, email recovery/verification, and all M4+ commerce workflows.

## 23 November 2026 — Obsidian documentation before M4

- User asked that all existing documentation be put into the added Obsidian vault and kept updated during development.
- Located `D:/Ronald/Documents/obsidian_vault`; followed its metadata/relative-link conventions. Prepared project hub, full versioned-document copies, compact handoff, chronology and learning/context notes plus existing screenshots.
- Added repository AGENTS instructions and repeatable sync/verification tooling. Sync protects independently edited vault files, backs up changed navigation externally, and excludes credentials/runtime/dependency/build files.
- This is documentation work only. No M4 implementation or publishing was authorized or performed. See the vault sync manifest for actual copied-file hashes and verification status.

## 23 November 2026 — documentation made explicit in action plans

- User clarified that each action plan must include writing documentation/learning notes and putting them into Obsidian in organized form.
- Added a mandatory plan checklist and explicit documentation/Obsidian tasks and completion gates to M4–M7; optional enhancements must include the same work.
- Documented note ownership, milestone-guide structure, hub/navigation updates and preservation of personal notes. Updated project instructions and compact memory so the requirement persists across chats.
- Documentation-only change; M4 remains unstarted. Vault sync verification is recorded by its manifest and maintenance log.

## 24 November 2026 — commit checkpoints added to action plans

- User requested a Git commit action after every significant completed part.
- Added explicit per-part local commit checkpoints after relevant checks, documentation and verified Obsidian updates. Plans must report real commit hashes and scope; no push or history rewriting implied.
- Existing untracked M1–M3 work must be reviewed deliberately before future commits, rather than silently bundled into another feature. This plan-only update creates no retrospective application commit and does not start M4.

## 24 November 2026 — M4 authorized, baseline checkpoint

- User requested moving onto the next step, authorizing M4 only, with documentation/Obsidian and local commit checkpoints.
- Deliberately reviewed the untracked M1–M3 source/config/docs; ignored secrets, generated client, dependencies, builds and backups are excluded.
- Fresh baseline verification: lint/typechecks/builds, 23 HTTP/config/safety tests and 30 PostgreSQL integration tests passed (53 total).
- Save the reviewed M1–M3 baseline in its own local commit before M4 changes; record the actual hash in the next update. No push.

## 24 November 2026 — M4 backend checkpoint

- Baseline committed locally as `66cc5d0`; preserved applied migration bytes despite its preexisting trailing blank line.
- Added cart/line schema migration, owned read/add/replace/remove endpoints, strict validation and session-bound CSRF, transactional cart/product locking, stock/line limits and server integer totals. No reservation or checkout.
- Initial backend checks passed: 23 HTTP/config/safety + 44 PostgreSQL integration tests (67); source/type/build/lint passed. Read-only GET snapshot refinement passed strict typechecks and all 44 integration tests before commit.
- Generated catalog visual concept and three illustrative category photos for the synthetic catalog. UI implementation/browser verification is still pending.

## 24 November 2026 — M4 catalog UI checkpoint

- Backend checkpoint saved as `a474544`; notes/API/schema records synced and verified first.
- Added responsive catalog and product detail pages, URL search/category/sort/page state, validated API responses, loading/error/retry/empty components and three original generated sample photos. Seeded records use those explicit image paths.
- Catalog browser checks confirm actual data, combined filter/sort and reload, text search, product deep link and empty state. Design comparison/spacing refinements recorded in DESIGN_NOTES. Cart controls and full mobile/error/cart flow verification remain the next M4 part.

## 24 November 2026 — M4 connected cart verification

- Catalog checkpoint committed as `6d7a409` after notes/sync. Connected authenticated add, absolute quantity update, remove, stock/conflict feedback and persistent cart display. Signup/sign-in preserve an allowlisted product/cart return path.
- Final full checks passed: lint/typecheck/build, 23 HTTP/config/safety tests and 44 PostgreSQL integration tests (67 total). Chromium verified signup return path, add/update/reload/remove, zero feedback, stock 409, out-of-stock controls, anonymous cart and induced catalog 503 with successful retry. Screenshots and 375px overflow checks cover catalog/product/cart; concepts compared explicitly.
- Updated owning API/database/architecture/requirements/decision notes and the M4 learning guide. Added generated cart concept and allowlisted final screenshots to organized Obsidian delivery; sync/commit recorded after final account switching/cleanup. Checkout remains M5; no push/deploy.

- Final browser checks: B’s cart empty, A’s saved product01 restored after re-login; missing-product feedback, Next pagination and keyboard skip navigation verified. Removed exactly two synthetic browser users and confirmed zero remain. Final page console reported zero errors/warnings. Legacy repository remains clean.
- Documentation delivery: 17 Markdown sources, safe environment example, two concepts, 11 historical/current screenshots and linked hub (32 managed files), with source/body/hash/link checks. The final cart/UI checkpoint commit includes these records; actual hash is reported in the handoff and Git log. No checkout work started.

## 24 November 2026 — M5 simulated checkout

- Backend checkpoint: 2fa57b5. Applied the checkout migration on local dev and test databases.
- Connected shipping, quote review, placement and order history. Chromium at 375 px verified signup through placement and order history after reload.
- Updated the learning guide and Obsidian hub before the customer-flow commit.

## 24 November 2026 — M6 administration and fulfillment

- Saved admin API and fulfillment migration as ff60b22 after the initial Obsidian sync.
- Connected product and category forms, inventory adjustments, paginated order filtering and detail, and sequential fulfillment. Browser verified publish, purchase, shipping and archive.
- The final checks passed with 23 HTTP/config tests and 48 PostgreSQL integration tests. Updated Obsidian before committing the customer and administration screens.

## 24 November 2026 — M7 local release preparation

- Passed lint, typechecks, builds, 23 HTTP/configuration tests, 48 PostgreSQL tests and the compiled-server smoke including order persistence after restart.
- Rehearsed dump and restore inside the isolated test container. Prepared the hosted release runbook and added the release smoke to CI.
- Synced the M7 guide and runbook to Obsidian. Remote CI and hosted acceptance are pending.

## 24 November 2026 — Admin portal polish

Added database-backed lists and order status counts in 3cd7e2d. Redesigned admin authentication, dashboard and work areas, and shared pagination with the catalog. Chromium verified role gating, lists, previews and management actions at desktop, tablet and mobile widths. See [admin portal notes](ADMIN_PORTAL_UX.md).
