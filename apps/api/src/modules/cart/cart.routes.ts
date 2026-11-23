import express, { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../../lib/database.js';
import type { Auth } from '../auth/auth.js';
import type { AuthSettings } from '../auth/auth.config.js';
import { requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { ApiError } from '../../lib/errors.js';
import { createCartService } from './cart.service.js';

const quantity = z.number().int().min(1).max(99);
const addBody = z.strictObject({ productId: z.uuid(), quantity });
const replaceBody = z.strictObject({ quantity });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid cart request.');
  return result.data;
}

export function cartRoutes(auth: Auth, database: Database, settings: AuthSettings) {
  const router = Router();
  const cart = createCartService(database);
  router.use(requireSession(auth, database));
  router.get('/', async (_request, response) => { response.json(await cart.get(response.locals.identity.user.id as string)); });
  router.use(requireCsrf(settings.secret, settings.origin), express.json({ limit: '16kb' }));
  router.post('/items', async (request, response) => {
    const input = parse(addBody, request.body);
    response.json(await cart.add(response.locals.identity.user.id as string, input.productId, input.quantity));
  });
  router.patch('/items/:productId', async (request, response) => {
    const input = parse(replaceBody, request.body);
    response.json(await cart.replace(response.locals.identity.user.id as string, parse(z.uuid(), request.params.productId), input.quantity));
  });
  router.delete('/items/:productId', async (request, response) => {
    parse(z.strictObject({}), request.body);
    response.json(await cart.remove(response.locals.identity.user.id as string, parse(z.uuid(), request.params.productId)));
  });
  return router;
}
