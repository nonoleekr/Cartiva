# Milestone 3 — authentication, sessions and authorization

Completed and locally verified 23 November 2026. User's “next step” authorized this milestone after M2. M4 has not started. No catalog shopping screens, cart, checkout, orders or admin management UI were added.

## Concepts before implementation

**Hashing vs encryption:** encryption is reversible using a key. Password hashing is designed for checking a candidate without recovering the original password. Better Auth owns scrypt hashing and verification; the application never stores plaintext passwords or writes its own hashing algorithm.

**Cookie session vs JWT:** this application uses an opaque session identifier in an HttpOnly cookie. The browser sends it automatically; the server verifies its database record and expiry. No auth token is stored in localStorage/sessionStorage. Cookie caching and rolling refresh are disabled, giving a seven-day absolute lifetime and immediate server revocation. Library-native auth responses may include token fields; the frontend ignores those bodies and retrieves sanitized identity through `/api/v1/me`.

**Authentication vs authorization:** an authenticated CUSTOMER still cannot perform admin actions. `requireSession` validates the session and fetches current user fields; `requireAdmin` checks the current database role. Client routing and displayed role are conveniences, never authorization evidence.

**XSS vs CSRF:** HttpOnly prevents scripts reading the cookie but does not make script injection harmless. React renders ordinary text, not HTML. CSRF exploits automatic cookie submission; auth POSTs require exact configured Origin and JSON, and later domain mutations additionally require a session-bound token. Different protections address different threats.

## Request flow and module map

```text
Sign-up/sign-in form
 → same-origin /api/auth/* POST, JSON, browser Origin
 → Express request checks (without consuming request stream)
 → Better Auth → Prisma transaction → PostgreSQL user/account/session
 → Set-Cookie (HttpOnly, SameSite=Lax; Secure over HTTPS)
 → frontend GET /api/v1/me → current safe user fields
 → session context renders account
```

`src/modules/auth/auth.ts` configures the library; `auth.config.ts` validates secret/origin; `auth.middleware.ts` owns identity, current admin role and session-bound CSRF; `auth.routes.ts` exposes `/me` and `/csrf`. The auth handler is mounted before any JSON parser, per [Express integration guidance](https://better-auth.com/docs/integrations/express).

Frontend `features/auth/` separates HTTP parsing, context/provider, hooks, forms and account page. Session restoration has a ten-second timeout, abort cleanup and response revision checks so stale responses cannot replace a newer identity. Focus revalidates identity. Form controls have associated labels, autocomplete and pending/error states.

## Implemented policies

- Passwords: 12–128 characters. Names trimmed, 1–100 characters; email capped at 254. All public signup defaults and hooks enforce CUSTOMER, even if ADMIN is submitted.
- Only sign-up/email, sign-in/email, sign-out and get-session library endpoints are exposed. Recovery, verification, profile changes, OAuth and public role mutation endpoints are unavailable.
- Auth POSTs require exact APP_ORIGIN, JSON, and Content-Length of 1–16384 bytes; streaming/chunked auth submissions are not supported by this browser-focused interface. No permissive CORS.
- Auth session: database-backed, seven-day absolute lifetime, no cookie cache or rolling refresh. Logout revokes database session and clears cookie. Every admin check reloads the role; local role provisioning revokes all sessions too.
- `/api/v1/me` is authenticated and returns id/name/email/role plus expiry, no password/session token. `/api/v1/csrf` is authenticated, non-cacheable and returns HMAC bound to the current session ID. Future mutation middleware order must be session → role if needed → CSRF → validation/action. M3 tests this with a test-only probe; no production cart/admin mutation was invented.
- Rate limits enabled locally and in production: signup 5/minute, sign-in 10/minute, general auth 100/minute. Express overwrites the rate-limit IP header from the socket, defeating supplied forwarding headers. Behind Vite/proxies this conservatively groups requests by proxy peer. This in-memory, single-instance policy must be revisited with the actual hosting proxy and scaling in M7; it is not a distributed abuse-control system.
- Production startup requires explicit strong secret, PostgreSQL URL and HTTPS public origin. SameSite=Lax, HttpOnly, host-scoped cookies; Secure enabled for HTTPS. No secret defaults in source. [Session guidance](https://better-auth.com/docs/concepts/session-management), [security guidance](https://better-auth.com/docs/reference/security).

## Setup and learning exercise

After existing database setup, run from repository root:

```powershell
npm run auth:setup
npm run dev
```

Open `http://127.0.0.1:5173/sign-up`. Setup writes a random local secret to gitignored `apps/api/.env` without printing it. It preserves existing secrets. `.env.example` documents APP_ORIGIN and other settings. Changing secrets invalidates existing signed cookies, so do not regenerate them on every startup.

For administrator learning, create an account first, then explicitly run:

```powershell
npm run auth:grant-admin -- your-account@example.invalid --confirm
```

This local-only operator command refuses remote/production targets, updates the existing role in a transaction and revokes all sessions. Sign in again. It does not create a password or seed a public admin account. Admin management features remain M6.

## Verification and limits

- `npm run check`: lint, strict source/test/script/web typechecks, **23 HTTP/config/safety tests**, both production builds passed.
- `npm run test:integration`: **30 real-PostgreSQL tests** passed (21 catalog and 9 auth); total **53**. Auth cases include hashing and hash verification, role injection, safe identity, restoration, anonymous rejection, password minimum, wrong credentials, logout replay, expiry, new-session CSRF token, current role promotion/demotion, session-bound CSRF/origin rejection, JSON/body limits, Secure/HttpOnly/SameSite attributes and rate limiting despite spoofed forwarding headers.
- No new migration required: M2's generated auth schema matches the enabled configuration. Auth writes use the Prisma adapter's transaction support. Test files run serially; fixtures are removed by user ID/email and tests never use development DB.
- Browser plugin unavailable; used Playwright Chromium at 1440×900 and 375×812. Signup → Customer account → reload restored identity → logout → sign-in page persisted on reload. Wrong credentials displayed an alert. Correct login after operator promotion displayed Administrator; re-provisioning revoked the active session, verified on reload.
- Mobile scrollWidth matched width=375. Keyboard Tab reached skip navigation; form controls had labels. No framework overlay or JavaScript exceptions. Console contained expected HTTP 401 resource messages for anonymous `/me` checks and deliberately wrong login, with no unrelated warnings/errors.
- Local/session storage were empty. Desktop account, mobile account and mobile sign-in screenshots were visually inspected and saved outside the repository. Synthetic browser account and related credentials/sessions were removed afterward. No real account or default admin credential remains.
- CI is configured but not remotely executed. HTTPS cookie flags were checked with a production-like origin; actual hosted TLS/proxy/browser behavior remains M7. Firefox/Safari and real email delivery are unverified. No recovery/verification controls are shown, and the demo does not claim verified email ownership or public production readiness.

## Review prompts

1. What does the cookie contain, and where is the password hash?
2. Why can't a signup body grant ADMIN?
3. What makes logout effective even if an old cookie is replayed?
4. Why read the role on every administrative action?
5. Why does application CSRF middleware need both a valid session and origin check?
6. Which settings change when the app moves behind a real HTTPS proxy?

Next after review: M4 responsive catalog and persistent cart only.
