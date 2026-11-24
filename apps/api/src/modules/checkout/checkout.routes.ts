import express, { Router } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '../../lib/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Auth } from '../auth/auth.js';
import type { AuthSettings } from '../auth/auth.config.js';
import { requireCsrf, requireSession } from '../auth/auth.middleware.js';
import { ApiError } from '../../lib/errors.js';

const field = z.string().trim().min(1).max(120);
const inputSchema = z.strictObject({
  quoteId: z.uuid(),
  shipping: z.strictObject({
    recipientName: field, addressLine1: field, city: field,
    postalCode: z.string().trim().regex(/^\d{5}$/), country: z.literal('MY')
  })
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid checkout request.');
  return result.data;
}

function conflict(message: string): never {
  throw new ApiError(409, 'CHECKOUT_CONFLICT', message);
}

async function lockCart(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM cart WHERE "userId" = ${userId} FOR UPDATE`;
  return tx.cart.findUnique({ where: { userId } });
}

async function snapshot(tx: Prisma.TransactionClient, cartId: string) {
  const lines = await tx.cartItem.findMany({ where: { cartId }, orderBy: { productId: 'asc' } });
  if (!lines.length) conflict('Your cart is empty.');
  // Keep the cart-first lock order and acquire product locks in ascending ID order.
  await tx.$queryRaw`
    SELECT p.id FROM product p JOIN cart_item i ON i."productId" = p.id
    WHERE i."cartId" = ${cartId}::uuid ORDER BY p.id FOR UPDATE OF p
  `;
  const products = await tx.product.findMany({ where: { id: { in: lines.map(line => line.productId) } } });
  const byId = new Map(products.map(product => [product.id, product]));
  return lines.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product || product.status !== 'ACTIVE' || quantity > product.stockQuantity) {
      conflict('Availability changed. Update your cart and review again.');
    }
    return { productId, quantity, name: product.name, unitPriceMinor: product.priceMinor };
  });
}

type Line = Awaited<ReturnType<typeof snapshot>>[number];
function total(items: Line[]) {
  const amount = items.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0);
  if (amount > 2_147_483_647) conflict('This order exceeds the demo total limit.');
  return amount;
}

const summary = { id: true, totalMinor: true, status: true, createdAt: true } as const;
const detail = { ...summary, items: true, shipping: true } as const;

export function checkoutRoutes(auth: Auth, database: Database, settings: AuthSettings) {
  const router = Router();
  const session = requireSession(auth, database);
  const mutation = [session, requireCsrf(settings.secret, settings.origin), express.json({ limit: '16kb' })];

  router.post('/checkout/quotes', ...mutation, async (request, response) => {
    parse(z.strictObject({}), request.body);
    const userId = response.locals.identity.user.id as string;
    const quote = await database.$transaction(async tx => {
      const cart = await lockCart(tx, userId);
      if (!cart) conflict('Your cart is empty.');
      const items = await snapshot(tx, cart.id);
      const totalMinor = total(items);
      await tx.checkoutQuote.deleteMany({ where: { userId, expiresAt: { lte: new Date() } } });
      const expiresAt = new Date(Date.now() + 10 * 60_000);
      const saved = await tx.checkoutQuote.create({ data: { userId, cartId: cart.id, revision: cart.revision, items, expiresAt } });
      return { id: saved.id, items, totalMinor, expiresAt };
    });
    response.status(201).json({ data: quote });
  });

  router.post('/orders', ...mutation, async (request, response) => {
    const userId = response.locals.identity.user.id as string;
    const retryKey = parse(z.uuid(), request.get('Idempotency-Key')).toLowerCase();
    const input = parse(inputSchema, request.body);
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const result = await database.$transaction(async tx => {
      const cart = await lockCart(tx, userId);
      const existing = await tx.customerOrder.findUnique({ where: { userId_retryKey: { userId, retryKey } } });
      if (existing) {
        if (existing.requestHash !== requestHash) conflict('This retry key belongs to a different request.');
        return { id: existing.id, replay: true };
      }
      const quote = await tx.checkoutQuote.findFirst({ where: { id: input.quoteId, userId } });
      if (!cart || !quote || quote.cartId !== cart.id || quote.revision !== cart.revision) {
        conflict('Your cart or quote changed. Review checkout again.');
      }
      const items = await snapshot(tx, cart.id);
      // JSONB can reorder object keys, so compare values by field.
      const reviewed = quote.items as Line[];
      if (quote.expiresAt.getTime() <= Date.now() || reviewed.length !== items.length ||
          reviewed.some((line, index) => {
            const current = items[index]!;
            return line.productId !== current.productId || line.quantity !== current.quantity ||
              line.unitPriceMinor !== current.unitPriceMinor || line.name !== current.name;
          })) {
        conflict('Your quote expired or product details changed. Review checkout again.');
      }
      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity }, version: { increment: 1 } } });
      }
      const order = await tx.customerOrder.create({ data: { userId, retryKey, requestHash, items, shipping: input.shipping, totalMinor: total(items) } });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { revision: { increment: 1 } } });
      return { id: order.id, replay: false };
    });
    response.status(result.replay ? 200 : 201).json({ data: { id: result.id } });
  });

  router.get('/orders', session, async (request, response) => {
    const userId = response.locals.identity.user.id as string;
    const page = parse(z.string().regex(/^[1-9]\d{0,4}$/).transform(Number), request.query.page ?? '1');
    const items = await database.customerOrder.findMany({
      where: { userId }, select: summary, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 20, take: 21
    });
    response.json({ data: { items: items.slice(0, 20), page, hasNext: items.length > 20 } });
  });

  router.get('/orders/:id', session, async (request, response) => {
    const userId = response.locals.identity.user.id as string;
    const id = parse(z.uuid(), request.params.id);
    const order = await database.customerOrder.findFirst({ where: { id, userId }, select: detail });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'Order not found.');
    response.json({ data: order });
  });
  return router;
}
