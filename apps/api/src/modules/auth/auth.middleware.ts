import type { RequestHandler } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Auth } from './auth.js';
import type { Database } from '../../lib/database.js';
import { ApiError } from '../../lib/errors.js';

export function requireSession(auth: Auth, database: Database): RequestHandler {
  return async (request, response, next) => {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers), query: { disableCookieCache: true } });
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
    const user = await database.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true } });
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED', 'Please sign in.');
    response.locals.identity = { user, sessionId: session.session.id, expiresAt: session.session.expiresAt };
    next();
  };
}

export const requireAdmin: RequestHandler = (_request, response, next) => {
  if (response.locals.identity?.user.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Administrator access is required.');
  next();
};

export function csrfToken(secret: string, sessionId: string) {
  return createHmac('sha256', secret).update(`cartiva-csrf-v1:${sessionId}`).digest('hex');
}

export function requireCsrf(secret: string, origin: string): RequestHandler {
  return (request, response, next) => {
    const token = request.get('X-CSRF-Token') ?? '';
    const expected = csrfToken(secret, response.locals.identity.sessionId as string);
    if (request.get('Origin') !== origin || !request.is('application/json')
      || !/^[a-f0-9]{64}$/.test(token) || !timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) {
      throw new ApiError(403, 'CSRF_REJECTED', 'Request verification failed.');
    }
    next();
  };
}
