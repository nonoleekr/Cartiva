import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Database } from './lib/database.js';
import { ApiError } from './lib/errors.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { toNodeHandler } from 'better-auth/node';
import type { AuthSettings } from './modules/auth/auth.config.js';
import { createAuth } from './modules/auth/auth.js';
import { identityRoutes } from './modules/auth/auth.routes.js';
import { checkoutRoutes } from './modules/checkout/checkout.routes.js';
import { cartRoutes } from './modules/cart/cart.routes.js';

type AppOptions = { webDirectory?: string; database?: Database; authSettings?: AuthSettings };

// Separating app composition from listen() makes HTTP behavior testable.
export function createApp({ webDirectory, database, authSettings }: AppOptions = {}) {
  if (webDirectory && !existsSync(path.join(webDirectory, 'index.html'))) {
    throw new Error('Built web assets are missing. Run npm run build before npm start.');
  }

  const app = express();
  app.disable('x-powered-by');

  app.use((request, response, next) => {
    response.locals.requestId = randomUUID();
    response.setHeader('X-Request-Id', response.locals.requestId as string);
    // API responses should never be mistaken for cached SPA content.
    if (/^\/api(?:\/|$)/i.test(request.path)) response.setHeader('Cache-Control', 'no-store');
    next();
  });

  if (database && authSettings) {
    const auth = createAuth(database, authSettings);
    // Keep the request stream intact for Better Auth; no express.json before it.
    app.all('/api/auth/*splat', (request, response, next) => {
      const allowed = (request.method === 'GET' && request.path === '/api/auth/get-session')
        || (request.method === 'POST' && ['/api/auth/sign-up/email', '/api/auth/sign-in/email', '/api/auth/sign-out'].includes(request.path));
      if (!allowed) { response.status(404).json({ error: { code: 'NOT_FOUND', message: 'Auth route not available.' } }); return; }
      if (request.method === 'POST') {
        if (request.get('Origin') !== authSettings.origin || !request.is('application/json')) throw new ApiError(403, 'ORIGIN_REJECTED', 'Request origin or content type is not allowed.');
        const length = Number(request.get('Content-Length'));
        if (!Number.isInteger(length) || length < 1 || length > 16384) throw new ApiError(413, 'BODY_LIMIT', 'A JSON body of at most 16KB is required.');
      }
      request.headers['x-cartiva-client-ip'] = request.socket.remoteAddress ?? 'unknown';
      next();
    }, toNodeHandler(auth));
    app.use('/api/v1', identityRoutes(auth, database, authSettings));
    app.use('/api/v1/cart', cartRoutes(auth, database, authSettings));
    app.use('/api/v1', checkoutRoutes(auth, database, authSettings));
  }

  app.get('/api/v1/health/live', (_request, response) => {
    response.json({ data: { status: 'ok', service: 'cartiva-api' } });
  });

  app.get('/api/v1/health/ready', async (_request, response) => {
    try {
      if (!database) throw new Error('Database not configured');
      await database.$queryRaw`SELECT 1`;
      response.json({ data: { status: 'ready' } });
    } catch {
      response.status(503).json({ error: { code: 'NOT_READY', message: 'Service is not ready.', requestId: response.locals.requestId } });
    }
  });
  if (database) app.use('/api/v1', catalogRoutes(database));

  // Reserve the complete API namespace BEFORE static assets and SPA fallback.
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: {
      code: 'NOT_FOUND', message: 'API route not found.', requestId: response.locals.requestId
    } });
  });

  if (webDirectory) {
    app.use(express.static(webDirectory, { index: false }));
    app.get('/{*path}', (request, response, next) => {
      // Missing assets must remain 404 instead of receiving index.html.
      if (path.extname(request.path) || !request.accepts('html')) return next();
      response.setHeader('Cache-Control', 'no-cache');
      response.sendFile(path.join(webDirectory, 'index.html'));
    });
  }

  app.use((_request, response) => {
    response.status(404).json({ error: {
      code: 'NOT_FOUND', message: 'Resource not found.', requestId: response.locals.requestId
    } });
  });

  const handleError: ErrorRequestHandler = (error: unknown, _request, response, next) => {
    if (response.headersSent) return next(error);
    if (typeof error === 'object' && error !== null && 'type' in error
      && (error.type === 'entity.parse.failed' || error.type === 'entity.too.large')) {
      response.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: {
        code: 'INVALID_BODY', message: 'Provide a valid JSON body of at most 16KB.', requestId: response.locals.requestId
      } });
      return;
    }
    if (error instanceof ApiError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}), requestId: response.locals.requestId } });
      return;
    }
    console.error('Request failed', { requestId: response.locals.requestId,
      type: error instanceof Error ? error.name : 'UnknownError' });
    response.status(500).json({ error: {
      code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId: response.locals.requestId
    } });
  };
  app.use(handleError);

  return app;
}
