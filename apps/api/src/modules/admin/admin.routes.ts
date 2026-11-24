import express, { Router } from 'express';
import { z } from 'zod';
import type { Database } from '../../lib/database.js';
import type { Auth } from '../auth/auth.js';
import type { AuthSettings } from '../auth/auth.config.js';
import { requireAdmin, requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { ApiError } from '../../lib/errors.js';

const integer = z.number().int().min(0).max(2147483647);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const uuid = z.uuid();
const version = z.strictObject({ expectedVersion: integer });
const category = z.strictObject({ name: z.string().trim().min(1).max(100), slug: slug.max(120) });
const product = z.strictObject({
  name: z.string().trim().min(1).max(160), slug: slug.max(180), categoryId: uuid,
  description: z.string().trim().min(1).max(5000),
  imagePath: z.string().max(300).regex(/^\/assets\/[a-zA-Z0-9/_-]+\.(?:png|jpg|webp|svg)$/),
  priceMinor: z.number().int().min(1).max(100000000)
});
const stages = ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const pageSchema = z.string().regex(/^[1-9][0-9]{0,4}$/).transform(Number);
const orderSummary = { id: true, status: true, totalMinor: true, version: true, createdAt: true } as const;

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', result.error.issues.map(issue => {
    const label = issue.path.join('.');
    return label ? label + ': ' + issue.message : issue.message;
  }).join('; '));
  return result.data;
}
function defined<T extends object>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>
  };
}
function stale(): never {
  throw new ApiError(409, 'VERSION_CONFLICT', 'This record changed. Reload it and try again.');
}
function missing(): never {
  throw new ApiError(404, 'NOT_FOUND', 'Record not found.');
}
function pageResult<T>(rows: T[], page: number) {
  return { data: { items: rows.slice(0, 20), page, hasNext: rows.length > 20 } };
}
function databaseConflict(reason: unknown, deletingCategory = false): never {
  const code = typeof reason === 'object' && reason !== null && 'code' in reason ? reason.code : undefined;
  if (code === 'P2002') throw new ApiError(409, 'DUPLICATE_SLUG', 'That slug is already in use.');
  if (code === 'P2003') {
    if (deletingCategory) throw new ApiError(409, 'CATEGORY_IN_USE', 'Products still use this category.');
    throw new ApiError(409, 'CATEGORY_NOT_FOUND', 'Select an existing category.');
  }
  if (code === 'P2025') missing();
  throw reason;
}

export function adminRoutes(auth: Auth, database: Database, settings: AuthSettings) {
  const router = Router();
  router.use(requireSession(auth, database), requireAdmin);
  const write = [requireCsrf(settings.secret, settings.origin), express.json({ limit: '32kb' })];

  router.get('/products', async (req, res) => {
    const page = parse(pageSchema, req.query.page ?? '1');
    const q = parse(z.string().trim().max(120), req.query.q ?? '');
    const status = parse(z.enum(['', 'DRAFT', 'ACTIVE', 'ARCHIVED']), req.query.status ?? '');
    const categoryId = parse(z.union([uuid, z.literal('')]), req.query.category ?? '');
    const stock = parse(z.enum(['', 'out', 'low', 'healthy']), req.query.stock ?? '');
    const sort = parse(z.enum(['name', 'price', 'stock', 'newest']), req.query.sort ?? 'name');
    const orderBy = sort === 'price' ? { priceMinor: 'asc' as const } : sort === 'stock'
      ? { stockQuantity: 'asc' as const } : sort === 'newest' ? { createdAt: 'desc' as const } : { name: 'asc' as const };
    const rows = await database.product.findMany({
      where: {
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { slug: { contains: q, mode: 'insensitive' } }] } : {}),
        ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}),
        ...(stock ? { stockQuantity: stock === 'out' ? 0 : stock === 'low' ? { gte: 1, lte: 5 } : { gt: 5 } } : {})
      },
      include: { category: { select: { name: true } } },
      orderBy: [orderBy, { id: 'asc' }], skip: (page - 1) * 20, take: 21
    });
    res.json(pageResult(rows, page));
  });
  router.get('/products/:id', async (req, res) => {
    const row = await database.product.findUnique({ where: { id: parse(uuid, req.params.id) } });
    res.json({ data: row ?? missing() });
  });
  router.post('/products', ...write, async (req, res) => {
    const { initialStock, ...data } = parse(product.extend({ initialStock: integer }), req.body);
    try {
      const row = await database.product.create({ data: { ...data, stockQuantity: initialStock } });
      res.location('/api/v1/admin/products/' + row.id).status(201).json({ data: row });
    } catch (reason) { databaseConflict(reason); }
  });
  router.patch('/products/:id', ...write, async (req, res) => {
    const id = parse(uuid, req.params.id);
    const { expectedVersion, ...data } = parse(product.partial().extend({
      expectedVersion: integer, status: z.enum(['DRAFT', 'ACTIVE']).optional()
    }), req.body);
    if (!Object.keys(data).length) throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a product change.');
    try {
      const row = await database.product.update({
        where: { id, version: expectedVersion, status: { not: 'ARCHIVED' },
          ...(data.status === 'ACTIVE' ? { stockQuantity: { gt: 0 } } : {}) },
        data: { ...defined(data), version: { increment: 1 } }
      });
      res.json({ data: row });
    } catch (reason) {
      if (typeof reason === 'object' && reason && 'code' in reason && reason.code === 'P2025') {
        const row = await database.product.findUnique({ where: { id } });
        if (!row) missing();
        if (row.version !== expectedVersion) stale();
        throw new ApiError(409, 'PRODUCT_STATE', 'Archived products are read-only and publishing requires positive stock.');
      }
      databaseConflict(reason);
    }
  });
  router.delete('/products/:id', ...write, async (req, res) => {
    const id = parse(uuid, req.params.id);
    const { expectedVersion } = parse(version, req.body);
    const result = await database.product.updateMany({
      where: { id, version: expectedVersion, status: { not: 'ARCHIVED' } },
      data: { status: 'ARCHIVED', version: { increment: 1 } }
    });
    if (!result.count) stale();
    res.status(204).end();
  });
  router.post('/products/:id/inventory-adjustments', ...write, async (req, res) => {
    const id = parse(uuid, req.params.id);
    const { expectedVersion, delta } = parse(version.extend({
      delta: z.number().int().min(-2147483647).max(2147483647).refine(value => value !== 0)
    }), req.body);
    const row = await database.product.findUnique({ where: { id } });
    if (!row) missing();
    if (row.version !== expectedVersion) stale();
    const stockQuantity = row.stockQuantity + delta;
    if (stockQuantity < 0 || stockQuantity > 2147483647 || row.status === 'ARCHIVED') {
      throw new ApiError(409, 'STOCK_CONFLICT', 'This inventory change is unavailable.');
    }
    try {
      const updated = await database.product.update({
        where: { id, version: expectedVersion }, data: { stockQuantity, version: { increment: 1 } }
      });
      res.json({ data: updated });
    } catch (reason) {
      if (typeof reason === 'object' && reason && 'code' in reason && reason.code === 'P2025') stale();
      throw reason;
    }
  });
  router.get('/categories', async (_req, res) => {
    res.json({ data: await database.category.findMany({ orderBy: { name: 'asc' } }) });
  });
  router.post('/categories', ...write, async (req, res) => {
    try { res.status(201).json({ data: await database.category.create({ data: parse(category, req.body) }) }); }
    catch (reason) { databaseConflict(reason); }
  });
  router.patch('/categories/:id', ...write, async (req, res) => {
    try {
      const data = parse(category.partial().refine(value => Object.keys(value).length > 0), req.body);
      res.json({ data: await database.category.update({ where: { id: parse(uuid, req.params.id) }, data: defined(data) }) });
    } catch (reason) { databaseConflict(reason); }
  });
  router.delete('/categories/:id', ...write, async (req, res) => {
    parse(z.strictObject({}), req.body);
    try { await database.category.delete({ where: { id: parse(uuid, req.params.id) } }); }
    catch (reason) { databaseConflict(reason, true); }
    res.status(204).end();
  });
  router.get('/orders', async (req, res) => {
    const page = parse(pageSchema, req.query.page ?? '1');
    const status = req.query.status === undefined ? undefined : parse(z.enum(stages), req.query.status);
    const q = parse(z.string().trim().max(120), req.query.q ?? '');
    const sort = parse(z.enum(['newest', 'oldest', 'total']), req.query.sort ?? 'newest');
    const orderBy = sort === 'total' ? { totalMinor: 'desc' as const } : { createdAt: sort === 'oldest' ? 'asc' as const : 'desc' as const };
    const id = uuid.safeParse(q);
    const [rows, counts] = await database.$transaction([
      database.customerOrder.findMany({
        where: { ...(status ? { status } : {}), ...(q ? { OR: [
          ...(id.success ? [{ id: id.data }] : []),
          { shipping: { path: ['recipientName'], string_contains: q, mode: 'insensitive' as const } }
        ] } : {}) }, select: orderSummary,
        orderBy: [orderBy, { id: 'desc' }], skip: (page - 1) * 20, take: 21
      }),
      database.customerOrder.groupBy({ by: ['status'], _count: { _all: true } })
    ], { isolationLevel: 'RepeatableRead' });
    res.json({ data: { ...pageResult(rows, page).data,
      counts: Object.fromEntries(stages.map(stage => [stage, counts.find(row => row.status === stage)?._count._all ?? 0])) } });
  });
  router.get('/orders/:id', async (req, res) => {
    const row = await database.customerOrder.findUnique({
      where: { id: parse(uuid, req.params.id) }, select: { ...orderSummary, items: true, shipping: true }
    });
    res.json({ data: row ?? missing() });
  });
  router.patch('/orders/:id/status', ...write, async (req, res) => {
    const id = parse(uuid, req.params.id);
    const { status, expectedVersion } = parse(version.extend({ status: z.enum(stages) }), req.body);
    const row = await database.customerOrder.findUnique({ where: { id }, select: orderSummary });
    if (!row) missing();
    if (row.version !== expectedVersion) stale();
    if (row.status === status) { res.json({ data: row }); return; }
    const nextIndex = stages.findIndex(stage => stage === row.status) + 1;
    if (stages[nextIndex] !== status) throw new ApiError(409, 'STATUS_CONFLICT', 'Choose the next fulfillment status.');
    try {
      res.json({ data: await database.customerOrder.update({
        where: { id, version: expectedVersion }, data: { status, version: { increment: 1 } }, select: orderSummary
      }) });
    } catch (reason) {
      if (typeof reason === 'object' && reason && 'code' in reason && reason.code === 'P2025') stale();
      throw reason;
    }
  });
  return router;
}
