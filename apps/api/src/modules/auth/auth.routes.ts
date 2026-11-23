import { Router } from 'express';
import type { Auth } from './auth.js';
import type { AuthSettings } from './auth.config.js';
import type { Database } from '../../lib/database.js';
import { csrfToken, requireSession } from './auth.middleware.js';

export function identityRoutes(auth: Auth, database: Database, settings: AuthSettings) {
  const router = Router();
  const authenticate = requireSession(auth, database);
  router.get('/me', authenticate, (_request, response) => {
    response.json({ data: { user: response.locals.identity.user, expiresAt: response.locals.identity.expiresAt } });
  });
  router.get('/csrf', authenticate, (_request, response) => {
    response.json({ data: { token: csrfToken(settings.secret, response.locals.identity.sessionId as string) } });
  });
  return router;
}
