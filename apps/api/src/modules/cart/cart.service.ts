import { randomUUID } from 'node:crypto';
import type { Database } from '../../lib/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ApiError } from '../../lib/errors.js';

const include = { items: { include: { product: true }, orderBy: { productId: 'asc' as const } } };
type StoredCart = Prisma.CartGetPayload<{ include: typeof include }>;

function response(cart: StoredCart | null) {
  const items = (cart?.items ?? []).map(({ product, quantity }) => ({
    productId: product.id, slug: product.slug, productName: product.name, imagePath: product.imagePath,
    unitPriceMinor: product.priceMinor, quantity, lineTotalMinor: product.priceMinor * quantity,
    availableStock: product.stockQuantity,
    availability: product.status !== 'ACTIVE' ? 'UNAVAILABLE' : quantity > product.stockQuantity ? 'INSUFFICIENT_STOCK' : 'AVAILABLE'
  }));
  return { data: { id: cart?.id ?? null, revision: cart?.revision ?? 0, currency: 'MYR', items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalMinor: items.reduce((sum, item) => sum + item.lineTotalMinor, 0) } };
}

export function createCartService(database: Database) {
  async function mutate(userId: string, productId: string, operation: 'add' | 'replace' | 'remove', quantity = 1) {
    return database.$transaction(async (tx) => {
      // ON CONFLICT handles simultaneous first mutations without abort/retry races.
      await tx.$executeRaw`INSERT INTO cart (id, "userId", revision, "createdAt", "updatedAt")
        VALUES (${randomUUID()}::uuid, ${userId}, 0, now(), now()) ON CONFLICT ("userId") DO NOTHING`;
      await tx.$queryRaw`SELECT id FROM cart WHERE "userId" = ${userId} FOR UPDATE`;
      const cart = await tx.cart.findUniqueOrThrow({ where: { userId } });
      const existing = await tx.cartItem.findUnique({ where: { cartId_productId: { cartId: cart.id, productId } } });
      if (operation === 'remove') {
        if (existing) await tx.cartItem.delete({ where: { id: existing.id } });
      } else {
        // All writers lock cart before product; later checkout must use the same order.
        await tx.$queryRaw`SELECT id FROM product WHERE id = ${productId}::uuid FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product || product.status !== 'ACTIVE') throw new ApiError(409, 'PRODUCT_UNAVAILABLE', 'This product is no longer available.');
        if (operation === 'replace' && !existing) throw new ApiError(404, 'NOT_FOUND', 'Product is not in your cart.');
        const desired = operation === 'add' ? quantity + (existing?.quantity ?? 0) : quantity;
        if (!Number.isInteger(desired) || desired < 1 || desired > 99) throw new ApiError(409, 'QUANTITY_LIMIT', 'Each cart item must contain 1–99 units.');
        if (desired > product.stockQuantity) throw new ApiError(409, 'STOCK_CONFLICT', 'The combined quantity exceeds available stock.');
        if (!existing && await tx.cartItem.count({ where: { cartId: cart.id } }) >= 100) throw new ApiError(409, 'CART_LIMIT', 'Your cart can contain at most 100 different products.');
        await tx.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId } },
          create: { cartId: cart.id, productId, quantity: desired }, update: { quantity: desired } });
      }
      if (operation !== 'remove' || existing) {
        await tx.cart.update({ where: { id: cart.id }, data: { revision: { increment: 1 } } });
      }
      return response(await tx.cart.findUniqueOrThrow({ where: { id: cart.id }, include }));
    });
  }

  return {
    // GET never creates a row; batched relation reads share a consistent snapshot.
    get: (userId: string) => database.$transaction(async (tx) => response(await tx.cart.findUnique({ where: { userId }, include })), { isolationLevel: 'RepeatableRead' }),
    add: (userId: string, productId: string, quantity: number) => mutate(userId, productId, 'add', quantity),
    replace: (userId: string, productId: string, quantity: number) => mutate(userId, productId, 'replace', quantity),
    remove: (userId: string, productId: string) => mutate(userId, productId, 'remove')
  };
}
