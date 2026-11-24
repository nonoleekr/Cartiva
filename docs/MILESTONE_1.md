# Milestone 1 — foundation and learning guide

Approved scope: independent blank full-stack shell only. No PostgreSQL, identity workflows, product/cart/order features or legacy migration. Implementation and local verification completed 19 November 2026. Review this milestone before starting M2.

## Concepts introduced

**Two runtimes:** React executes in the browser; Express executes on Node. Browser code can call an HTTP endpoint but cannot import server/database functions. `apps/web` and `apps/api` make this boundary explicit.

**ES modules:** `"type": "module"` enables import/export. The API uses NodeNext resolution and `.js` import specifiers so compiled JavaScript runs directly on Node. Vite resolves browser TypeScript imports and bundles them. `tsx` executes TS during API development; `tsc` emits production API JavaScript.

**TypeScript strict mode:** catches unsafe values before execution, including optional fields and array lookups. Types are erased at runtime. `checkHealth` treats parsed JSON as unknown and checks its shape before reporting connection success.

**npm workspaces:** one repository and lockfile install two independently named packages. Root scripts coordinate their commands. A shared-contracts package is intentionally absent until there is meaningful reuse.

**React state/effects:** the health component stores checking/connected/unavailable state. An effect starts the request; cleanup aborts it on unmount/retry, and a five-second timeout prevents an endless spinner. A stale request cannot overwrite the next attempt. The retry button creates a new request; changing appearance alone never indicates success.

**Liveness vs readiness:** liveness means the API process responds. It says nothing about a future database or checkout readiness. No readiness endpoint pretending to test a nonexistent DB has been added.

## Follow one request

```text
Browser http://127.0.0.1:5173
  → FoundationPage effect
  → fetch('/api/v1/health/live')
  → Vite development proxy
  → Express http://127.0.0.1:3001
  → GET handler sends JSON { data: { status: 'ok', service: 'cartiva-api' } }
  → runtime response validation
  → React renders the connected state
```

In production, Express serves both built Vite assets and `/api` from one origin. A reload of `/about` returns index.html, then React Router renders the About page. `/api/missing` returns JSON 404 before any SPA fallback; `/missing.js` also stays 404. This avoids HTML masquerading as an API or missing JavaScript asset.

## File map

| File | Purpose |
| --- | --- |
| `package.json`, `package-lock.json` | Workspace orchestration and exact dependency tree |
| `tsconfig.base.json`, `eslint.config.js` | Shared strict checks and React rules |
| `apps/api/src/app.ts` | HTTP middleware/routes, static serving, API boundary, errors |
| `apps/api/src/server.ts` | Environment, listen, shutdown; separate from app for tests |
| `apps/api/src/config/env.ts` | Runtime startup checks for NODE_ENV/HOST/PORT |
| `apps/api/tests/` | Health, API/SPA boundary and invalid configuration verification |
| `apps/web/vite.config.ts` | React/Tailwind build plugins and development proxy |
| `apps/web/src/app/` | Router/layout and connection screen |
| `apps/web/src/lib/health.ts` | HTTP request and runtime shape validation |
| `.github/workflows/ci.yml` | Clean install, lint/typecheck/test/build on push/PR |

## Versions and compatibility

Selected Node 24 LTS, currently installed 24.11.1, npm 11.17.0. Exact versions are in manifests and lockfile. Registry engines for Vite 8.3.8, Express 5.3.0, Vitest 5.1.1 and future Prisma 7.10.1 support this runtime. TypeScript 6.0.3 stays within typescript-eslint 8.73.0's declared range. This is a tested set, not a recommendation to install every newest major.

Future auth/database version targets are recorded in DECISIONS; no auth/ORM package is installed. The [Better Auth adapter docs](https://better-auth.com/docs/adapters/prisma) currently exclude Prisma 8. The [Express 5 guide](https://expressjs.com/en/guide/migrating-5/) explains named wildcard syntax used by the SPA fallback. The [Node release schedule](https://nodejs.org/en/about/previous-releases) confirms major 24 remains LTS. Recheck these constraints when introducing the actual database and authentication packages.

## Verification record

| Check | Outcome |
| --- | --- |
| `npm ci` | Passed clean lockfile install; npm audit reported zero vulnerabilities at inspection |
| `npm run check` | Passed lint, API/test/web strict typechecks, all 15 tests in two files, API compilation and Vite production build |
| `npm ls --depth=0` | Passed; pinned direct dependencies resolved |
| Invalid startup | `PORT=not-a-port` rejected with clear message and exit 1 before listening |
| Development browser | http://127.0.0.1:5173 rendered correct title/content; proxy health succeeded, retry worked; About navigation/reload passed |
| Failure/recovery | Playwright intercepted health with HTTP 503; visible unavailable state appeared; removed interception and retry returned connected |
| Production | Built SPA/API on http://127.0.0.1:3002; Home health, direct `/about` load and reload passed |
| API/SPA boundary | Actual built server returned `/api` and `/api/v1/missing` JSON 404 with HTML Accept header; missing JS 404; `/about` HTML 200 |
| Desktop/mobile | Screenshots inspected at 1440×900 and 375×812; readable controls/no clipping; mobile scrollWidth=375 matched viewport |
| Keyboard | Tab focused Skip to content; Enter focused main and updated fragment |
| Console/overlay | Normal dev and production pages had zero warnings/errors; no framework overlay. Deliberate HTTP 503 produced the expected browser resource error during failure simulation only |
| Repository hygiene | `git diff --check` passed; reference repo clean and unchanged; screenshots/CLI state outside repository |

Tests cover actual HTTP behavior, API namespace reservation, deep-link/assets/method boundaries, missing build output, defaults and invalid environment inputs. They do not claim commerce/auth/database coverage. A sandbox-only run initially failed local socket connections with EACCES; the complete successful run used permitted local socket access. The reinstall interrupted an earlier check; only the subsequent sequential clean install/check results above count.

Screenshots: `cartiva-desktop.png` and `cartiva-mobile.png`, stored outside the repository under the session visualization directory. They show the working connected state. Browser interaction used Playwright CLI navigation/snapshot/click/resize/screenshot, network interception, and keyboard commands. The browser check is manual CLI verification, not a committed automated browser test suite yet.

CI is configured only; no remote workflow result is claimed. Browser plugin unavailable; browser verification used Playwright Chromium. Firefox/Safari, hosted deployment and all later features remain untested. No screenshots or temporary scripts are committed. The Browser plugin is an optional future improvement for in-app inspection.

## Interview/review prompts

1. Where does React run, and why can't it read database credentials?
2. Why is `unknown` safer than casting arbitrary response JSON to a type?
3. What does Vite proxy in development, and what replaces it in production?
4. Why are `createApp()` and `listen()` separate?
5. What breaks if SPA fallback is registered before `/api`?
6. What can a passing health check prove, and what can it not prove?

Next milestone after review: PostgreSQL schema, synthetic seed, public catalog API (M2). Do not begin it automatically.
