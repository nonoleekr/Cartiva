import { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../../lib/database.js';
import { ApiError } from '../../lib/errors.js';
import { catalogQuery, productSlug } from './catalog.schemas.js';
import { createCatalogService } from './catalog.service.js';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed.', z.flattenError(result.error).fieldErrors);
  return result.data;
}

export function catalogRoutes(database: Database) {
  const router = Router();
  const catalog = createCatalogService(database);
  router.get('/products', async (request, response) => {
    response.json(await catalog.list(parse(catalogQuery, request.query)));
  });
  router.get('/products/:slug', async (request, response) => {
    response.json(await catalog.detail(parse(productSlug, request.params.slug)));
  });
  router.get('/categories', async (_request, response) => {
    response.json(await catalog.categories());
  });
  return router;
}
