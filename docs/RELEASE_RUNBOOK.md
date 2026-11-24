# Cartiva hosted release runbook

Candidate topology: one Render Node web service and one managed PostgreSQL database. The app serves the compiled UI and API under the service HTTPS origin. This keeps session cookies and CSRF checks on the same origin. Use the provider subdomain for the first candidate.

| Setting | Candidate value |
| --- | --- |
| Service root | Repository root |
| Node version | 24.11.1 |
| Build | npm install --global npm@11.17.0 && npm ci --include=dev && npm run build |
| Start | npm start |
| Health check | /api/v1/health/ready |
| Auto-deploy | Off for first release |
| NODE_ENV | production |
| APP_ORIGIN | Exact public HTTPS origin without a path |
| DATABASE_URL | Provider-managed runtime connection string with TLS |
| BETTER_AUTH_SECRET | Provider-generated secret of at least 32 characters |
| PORT | Provider-assigned |
| HOST | Production default 0.0.0.0 |

## Release and migrations

1. Review the exact commit, decide visibility and budget, and run the CI gate on that commit.
2. Create a dedicated database. Use the provider TLS settings, allow runtime access from the app, and use a direct connection with schema permissions for the release migration.
3. Take an encrypted or provider-managed backup of an existing database. Record its time and recovery point. Check that it is readable, then restore it to a separate test database when rehearsing a schema change.
4. Run npm run db:migrate once with DATABASE_URL set to the direct migration connection. Run this from a trusted release environment that has installed the pinned dependencies. A paid Render service can use its pre-deploy command if its environment supplies the migration URL. On a tier without that feature, run the migration separately before deploying the candidate. [Render deployment reference](https://render.com/docs/deploys)
5. Deploy the already reviewed commit and check readiness. Provision an administrator in the dedicated host database through the approved operator process before inserting catalog fixtures. The local admin and seed scripts deliberately enforce local database names and addresses. For the hosted bootstrap, register the operator account, verify its exact identity in the host database console, then assign ADMIN and revoke sessions in one reviewed transaction. Sign in again and create a category and fictional products through the admin UI.
6. Run browser and operations checks below. During a failed release, stop additional writes before any restore. Roll the application back only to a revision compatible with the migrated schema. Restore a backup to a separate database first and inspect it before switching traffic. A restore can discard writes made after the backup.

## Hosted acceptance checks

- Readiness responds successfully. A product deep link reloads, its assets load, and an unknown API URL returns JSON 404.
- Inspect browser session cookies over HTTPS. Verify logout invalidates the session and CSRF checks reject requests without the session-bound token.
- Check that the proxy preserves the public origin. Confirm rate limiting is appropriate for users behind the proxy. The current limiter groups by socket peer and is process-local.
- With fictional customers and a dedicated test product, verify browse, cart, checkout, customer order history, admin shipping, and customer status after an app restart. Verify keyboard navigation and mobile layouts on the built deployment.
- Record measured first idle request and warm readiness timing alongside the host tier. Review logs for accidental personal data. Keep recovery/verification email limitations visible and use fictional shipping data.
