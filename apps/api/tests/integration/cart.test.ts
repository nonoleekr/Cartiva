import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createDatabase } from '../../src/lib/database.js';
import { createApp } from '../../src/app.js';
import { createCartService } from '../../src/modules/cart/cart.service.js';
import { assertLocalDatabase } from '../../scripts/seed-safety.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL required');
assertLocalDatabase(url, 'test');
const database = createDatabase(url);
const independentDatabase = createDatabase(url);
const sql = new Pool({ connectionString: url });
const origin = 'http://127.0.0.1:5173';
const settings = { secret: 'cart-tests-only-secret-of-at-least-32-characters', origin, secureCookies: false };
const app = createApp({ database, authSettings: settings });
const categoryId = randomUUID();
const productId = randomUUID();
const users: Array<{ id: string; cookie: string; csrf: string }> = [];
const categorySlug = `cart-test-${randomUUID()}`;

beforeAll(async () => {
  await database.category.create({ data: { id: categoryId, name: 'Cart Test', slug: categorySlug } });
  await database.product.create({ data: { id: productId, categoryId, name: 'Cart Test Product', slug: `cart-${productId}`,
    description: 'Synthetic isolated cart fixture', imagePath: '/assets/catalog-placeholder.svg', priceMinor: 1101, stockQuantity: 10, status: 'ACTIVE' } });
  for (let index = 0; index < 2; index++) {
    const signup = await request(app).post('/api/auth/sign-up/email').set('Origin', origin)
      .send({ name: 'Fictional Cart Tester', email: `cart-${randomUUID()}@example.invalid`, password: randomUUID() }).expect(200);
    const cookie = (signup.headers['set-cookie'] as unknown as string[]).map((part) => part.split(';')[0]).join('; ');
    const token = await request(app).get('/api/v1/csrf').set('Cookie', cookie).expect(200);
    users.push({ id: signup.body.user.id, cookie, csrf: token.body.data.token });
  }
}, 15_000);

beforeEach(async () => {
  await database.cart.deleteMany({ where: { userId: { in: users.map((user) => user.id) } } });
  await database.product.update({ where: { id: productId }, data: { status: 'ACTIVE', priceMinor: 1101, stockQuantity: 10 } });
});
afterAll(async () => {
  await database.customerOrder.deleteMany({ where: { userId: { in: users.map(user => user.id) } } });
  await database.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  await database.product.deleteMany({ where: { categoryId } });
  await database.category.deleteMany({ where: { id: categoryId } });
  await database.$disconnect(); await independentDatabase.$disconnect(); await sql.end();
});

function mutation(method: 'post' | 'patch' | 'delete', path: string, user = users[0]!) {
  return request(app)[method](path).set('Cookie', user.cookie).set('Origin', origin).set('X-CSRF-Token', user.csrf);
}

describe('owned cart on real PostgreSQL', () => {
  it('does not create a cart on GET and rejects anonymous requests', async () => {
    const response = await request(app).get('/api/v1/cart').set('Cookie', users[0]!.cookie).expect(200);
    expect(response.body.data).toMatchObject({ id: null, revision: 0, items: [], totalQuantity: 0, subtotalMinor: 0, currency: 'MYR' });
    expect(await database.cart.count({ where: { userId: users[0]!.id } })).toBe(0);
    await request(app).get('/api/v1/cart').expect(401);
    await request(app).post('/api/v1/cart/items').send({ productId, quantity: 1 }).expect(401);
  });

  it('merges by product ID, replaces absolute quantity and returns exact integer money', async () => {
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 2 }).expect(200);
    const added = await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 3 }).expect(200);
    expect(added.body.data.items).toHaveLength(1);
    expect(added.body.data).toMatchObject({ totalQuantity: 5, subtotalMinor: 5505, revision: 2 });
    const patched = await mutation('patch', `/api/v1/cart/items/${productId}`).send({ quantity: 2 }).expect(200);
    expect(patched.body.data).toMatchObject({ totalQuantity: 2, subtotalMinor: 2202, revision: 3 });
    expect((await database.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(10);
  });

  it('rejects cumulative stock overflow and preserves cart/revision on failure', async () => {
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 6 }).expect(200);
    const response = await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 6 }).expect(409);
    expect(response.body.error.code).toBe('STOCK_CONFLICT');
    const stored = await request(app).get('/api/v1/cart').set('Cookie', users[0]!.cookie).expect(200);
    expect(stored.body.data).toMatchObject({ totalQuantity: 6, revision: 1 });
  });

  it.each([0, -1, 100, 1.5, '2'])('rejects invalid quantity %j', async (quantity) => {
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity }).expect(400);
  });

  it('rejects malformed IDs, extra ownership/price fields, JSON and failed CSRF', async () => {
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 1, userId: users[1]!.id }).expect(400);
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 1, unitPriceMinor: 1 }).expect(400);
    await mutation('post', '/api/v1/cart/items').send({ productId: 'bad-id', quantity: 1 }).expect(400);
    await mutation('post', '/api/v1/cart/items').type('json').send('{invalid').expect(400);
    await request(app).post('/api/v1/cart/items').set('Cookie', users[0]!.cookie).set('Origin', origin).send({ productId, quantity: 1 }).expect(403);
    await request(app).post('/api/v1/cart/items').set('Cookie', users[0]!.cookie).set('Origin', 'https://evil.example').set('X-CSRF-Token', users[0]!.csrf).send({ productId, quantity: 1 }).expect(403);
    await mutation('post', '/api/v1/cart/items', { ...users[0]!, csrf: users[1]!.csrf }).send({ productId, quantity: 1 }).expect(403);
  });

  it('scopes every read/write to identity, including same product in separate carts', async () => {
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 2 }).expect(200);
    const other = await request(app).get('/api/v1/cart').set('Cookie', users[1]!.cookie).expect(200);
    expect(other.body.data.items).toEqual([]);
    await mutation('patch', `/api/v1/cart/items/${productId}`, users[1]!).send({ quantity: 1 }).expect(404);
    await mutation('delete', `/api/v1/cart/items/${productId}`, users[1]!).send({}).expect(200);
    const own = await request(app).get('/api/v1/cart').set('Cookie', users[0]!.cookie).expect(200);
    expect(own.body.data.totalQuantity).toBe(2);
  });

  it('handles concurrent first creation/adds through independent connections without lost quantities', async () => {
    const cart = createCartService(database), independentCart = createCartService(independentDatabase);
    await Promise.all([cart.add(users[0]!.id, productId, 2), independentCart.add(users[0]!.id, productId, 3)]);
    const stored = await cart.get(users[0]!.id);
    expect(stored.data).toMatchObject({ totalQuantity: 5, revision: 2 });
    expect(stored.data.items).toHaveLength(1);
    expect(await database.cart.count({ where: { userId: users[0]!.id } })).toBe(1);
  });

  it('allows only one of two concurrent requests that would together exceed stock', async () => {
    const results = await Promise.allSettled([
      createCartService(database).add(users[0]!.id, productId, 6),
      createCartService(independentDatabase).add(users[0]!.id, productId, 6)
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await createCartService(database).get(users[0]!.id)).data.totalQuantity).toBe(6);
  });

  it('shows current prices/availability, refuses inactive updates but allows removal', async () => {
    await mutation('post', '/api/v1/cart/items').send({ productId, quantity: 2 }).expect(200);
    await database.product.update({ where: { id: productId }, data: { priceMinor: 1200, stockQuantity: 1 } });
    const changed = await request(app).get('/api/v1/cart').set('Cookie', users[0]!.cookie).expect(200);
    expect(changed.body.data.subtotalMinor).toBe(2400);
    expect(changed.body.data.items[0].availability).toBe('INSUFFICIENT_STOCK');
    await database.product.update({ where: { id: productId }, data: { status: 'ARCHIVED' } });
    const hidden = await request(app).get('/api/v1/cart').set('Cookie', users[0]!.cookie).expect(200);
    expect(hidden.body.data.items[0].availability).toBe('UNAVAILABLE');
    await mutation('patch', `/api/v1/cart/items/${productId}`).send({ quantity: 1 }).expect(409);
    const removed = await mutation('delete', `/api/v1/cart/items/${productId}`).send({}).expect(200);
    expect(removed.body.data.items).toEqual([]);
    const again = await mutation('delete', `/api/v1/cart/items/${productId}`).send({}).expect(200);
    expect(again.body.data.revision).toBe(removed.body.data.revision);
  });

  it('enforces 100 distinct lines and SQL quantity/uniqueness constraints', async () => {
    const products = Array.from({ length: 101 }, () => { const id = randomUUID(); return { id, categoryId,
      slug: `cart-limit-${id}`, name: 'Cart limit fixture', description: 'Synthetic only', imagePath: '/assets/catalog-placeholder.svg',
      priceMinor: 1, stockQuantity: 1, status: 'ACTIVE' as const }; });
    await database.product.createMany({ data: products });
    const cart = await database.cart.create({ data: { userId: users[0]!.id,
      items: { create: products.slice(0, 100).map((product) => ({ productId: product.id, quantity: 1 })) } } });
    const failed = await mutation('post', '/api/v1/cart/items').send({ productId: products[100]!.id, quantity: 1 }).expect(409);
    expect(failed.body.error.code).toBe('CART_LIMIT');
    await expect(sql.query('UPDATE cart_item SET quantity = 0 WHERE "cartId" = $1', [cart.id])).rejects.toMatchObject({ code: '23514' });
    await expect(database.cartItem.create({ data: { cartId: cart.id, productId: products[0]!.id, quantity: 1 } })).rejects.toMatchObject({ code: 'P2002' });
  });
});

describe('simulated checkout on PostgreSQL', () => {
  it('sells the final unit once and replays the winning request after the cart clears', async () => {
    for (const user of users) await mutation('post', '/api/v1/cart/items', user).send({ productId, quantity: 1 }).expect(200);
    const quotes = await Promise.all(users.map(user => mutation('post', '/api/v1/checkout/quotes', user).send({}).expect(201)));
    await database.product.update({ where: { id: productId }, data: { stockQuantity: 1 } });
    const keys = users.map(() => randomUUID());
    const shipping = { recipientName: 'Fictional Customer', addressLine1: 'Demo Street', city: 'Kuala Lumpur', postalCode: '50000', country: 'MY' };
    const place = (index: number, address = shipping) => mutation('post', '/api/v1/orders', users[index]!)
      .set('Idempotency-Key', keys[index]!).send({ quoteId: quotes[index]!.body.data.id, shipping: address });
    const results = await Promise.all([place(0), place(1)]);
    expect(results.map(result => result.status).sort()).toEqual([201, 409]);
    const winner = results.findIndex(result => result.status === 201);
    const id = results[winner]!.body.data.id;
    expect((await place(winner).expect(200)).body.data.id).toBe(id);
    await place(winner, { ...shipping, city: 'Ipoh' }).expect(409);
    await request(app).get('/api/v1/orders/' + id).set('Cookie', users[1 - winner]!.cookie).expect(404);
    await database.product.update({ where: { id: productId }, data: { priceMinor: 9999 } });
    const order = await request(app).get('/api/v1/orders/' + id).set('Cookie', users[winner]!.cookie).expect(200);
    expect(order.body.data.totalMinor).toBe(1101);
    const list = await request(app).get('/api/v1/orders').set('Cookie', users[winner]!.cookie)
      .query({ q: id, status: 'PLACED' }).expect(200);
    expect(list.body.data.items).toEqual([expect.objectContaining({ id, itemCount: 1 })]);
    const other = await request(app).get('/api/v1/orders').set('Cookie', users[1 - winner]!.cookie)
      .query({ q: id }).expect(200);
    expect(other.body.data.items).toEqual([]);

    expect((await database.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(0);
  });
  it('saves shipping only on successful opt-in and isolates it from other accounts and old orders', async () => {
    const owner = users[0]!;
    const other = users[1]!;
    const first = { recipientName: 'Fictional Buyer', addressLine1: '10 Demo Street', city: 'Ipoh', postalCode: '30000', country: 'MY' };
    const second = { ...first, addressLine1: '20 Demo Street' };
    const saved = '/api/v1/checkout/saved-shipping';
    await request(app).get(saved).expect(401);
    expect((await request(app).get(saved).set('Cookie', owner.cookie).expect(200)).body.data).toBeNull();
    async function prepare(shipping: typeof first, saveShipping: boolean) {
      await mutation('post', '/api/v1/cart/items', owner).send({ productId, quantity: 1 }).expect(200);
      const quote = await mutation('post', '/api/v1/checkout/quotes', owner).send({}).expect(201);
      const key = randomUUID();
      return () => mutation('post', '/api/v1/orders', owner).set('Idempotency-Key', key)
        .send({ quoteId: quote.body.data.id, shipping, saveShipping });
    }
    const placeFirst = await prepare(first, true);
    const initial = await placeFirst().expect(201);
    expect((await request(app).get(saved).set('Cookie', owner.cookie).expect(200)).body.data).toEqual(first);
    expect((await request(app).get(saved).set('Cookie', other.cookie).expect(200)).body.data).toBeNull();
    await (await prepare(second, false))().expect(201);
    expect((await request(app).get(saved).set('Cookie', owner.cookie).expect(200)).body.data).toEqual(first);
    await (await prepare(second, true))().expect(201);
    await placeFirst().expect(200);
    expect((await request(app).get(saved).set('Cookie', owner.cookie).expect(200)).body.data).toEqual(second);
    const original = await request(app).get('/api/v1/orders/' + initial.body.data.id).set('Cookie', owner.cookie).expect(200);
    expect(original.body.data.shipping).toEqual(first);
  });

  it('rejects expired and repriced quotes and creates one order for parallel requests from the same cart', async () => {
    const user = users[0]!;
    await mutation('post', '/api/v1/cart/items', user).send({ productId, quantity: 1 }).expect(200);
    const quote = async () => (await mutation('post', '/api/v1/checkout/quotes', user).send({}).expect(201)).body.data.id as string;
    const shipping = { recipientName: 'Fictional Customer', addressLine1: 'Demo Street', city: 'Kuala Lumpur', postalCode: '50000', country: 'MY' };
    const place = (quoteId: string) => mutation('post', '/api/v1/orders', user)
      .set('Idempotency-Key', randomUUID()).send({ quoteId, shipping });

    const expired = await quote();
    await database.checkoutQuote.update({ where: { id: expired }, data: { expiresAt: new Date(0) } });
    await place(expired).expect(409);
    const oldPrice = await quote();
    await database.product.update({ where: { id: productId }, data: { priceMinor: 1199 } });
    await place(oldPrice).expect(409);
    const current = await quote();
    // Force the order insert to fail after checkout has already decremented stock.
    await sql.query('ALTER TABLE customer_order ADD CONSTRAINT checkout_rollback_fixture CHECK ("totalMinor" <> 1199)');
    try {
      await place(current).expect(500);
      expect((await database.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(10);
      expect(await database.cartItem.count({ where: { productId } })).toBe(1);
    } finally {
      await sql.query('ALTER TABLE customer_order DROP CONSTRAINT checkout_rollback_fixture');
    }
    const pair = await Promise.all([place(current), place(current)]);
    expect(pair.map(result => result.status).sort()).toEqual([201, 409]);
    expect((await database.product.findUniqueOrThrow({ where: { id: productId } })).stockQuantity).toBe(9);
  });

});

describe('administrator catalog and fulfillment', () => {
  const root = '/api/v1/admin';
  it('requires an administrator for every read and mutation', async () => {
    const routes = [
      ['get', '/products'], ['get', '/products/' + productId], ['post', '/products'],
      ['patch', '/products/' + productId], ['delete', '/products/' + productId],
      ['post', '/products/' + productId + '/inventory-adjustments'],
      ['get', '/categories'], ['post', '/categories'], ['patch', '/categories/' + categoryId],
      ['delete', '/categories/' + categoryId], ['get', '/orders'], ['get', '/orders/' + productId],
      ['patch', '/orders/' + productId + '/status']
    ] as const;
    for (const [method, pathname] of routes) {
      await request(app)[method](root + pathname).expect(401);
      await request(app)[method](root + pathname).set('Cookie', users[0]!.cookie).expect(403);
    }
  });

  it('rejects stale inventory, protects used categories and exposes fulfillment to the customer', async () => {
    const admin = users[0]!;
    const customer = users[1]!;
    await database.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    try {
      await mutation('delete', root + '/categories/' + categoryId, admin).send({}).expect(409);
      const product = await database.product.findUniqueOrThrow({ where: { id: productId } });
      const listed = await request(app).get(root + '/products').set('Cookie', admin.cookie)
        .query({ q: product.slug, category: categoryId, status: 'ACTIVE', stock: 'healthy', sort: 'price' }).expect(200);
      expect(listed.body.data.items).toEqual([expect.objectContaining({ id: productId, category: expect.objectContaining({ name: expect.any(String) }) })]);
      const noStock = await request(app).get(root + '/products').set('Cookie', admin.cookie)
        .query({ q: product.slug, stock: 'out' }).expect(200);
      expect(noStock.body.data.items).toEqual([]);
      const inventory = root + '/products/' + productId + '/inventory-adjustments';
      await request(app).post(inventory).set('Cookie', admin.cookie).send({ delta: 1, expectedVersion: product.version }).expect(403);
      const writes = await Promise.all([1, 2].map(delta => mutation('post', inventory, admin).send({ delta, expectedVersion: product.version })));
      expect(writes.map(result => result.status).sort()).toEqual([200, 409]);

      await mutation('post', '/api/v1/cart/items', customer).send({ productId, quantity: 1 }).expect(200);
      const quote = await mutation('post', '/api/v1/checkout/quotes', customer).send({}).expect(201);
      const placed = await mutation('post', '/api/v1/orders', customer).set('Idempotency-Key', randomUUID())
        .send({ quoteId: quote.body.data.id, shipping: { recipientName: 'Fictional Customer', addressLine1: 'Demo Street', city: 'Ipoh', postalCode: '30000', country: 'MY' } }).expect(201);
      const orderId = placed.body.data.id as string;
      const statusPath = root + '/orders/' + orderId + '/status';
      await mutation('patch', statusPath, admin).send({ status: 'SHIPPED', expectedVersion: 0 }).expect(409);
      await mutation('patch', statusPath, admin).send({ status: 'PROCESSING', expectedVersion: 0 }).expect(200);
      await mutation('patch', statusPath, admin).send({ status: 'SHIPPED', expectedVersion: 0 }).expect(409);
      await mutation('patch', statusPath, admin).send({ status: 'SHIPPED', expectedVersion: 1 }).expect(200);
      const filtered = await request(app).get(root + '/orders').set('Cookie', admin.cookie)
        .query({ q: 'fictional customer', status: 'SHIPPED', sort: 'total' }).expect(200);
      expect(filtered.body.data.items).toEqual([expect.objectContaining({ id: orderId })]);
      expect(filtered.body.data.counts.SHIPPED).toBe(1);
      const latest = await database.product.findUniqueOrThrow({ where: { id: productId } });
      await mutation('delete', root + '/products/' + productId, admin).send({ expectedVersion: latest.version }).expect(204);
      const detail = await request(app).get('/api/v1/orders/' + orderId).set('Cookie', customer.cookie).expect(200);
      expect(detail.body.data.status).toBe('SHIPPED');
      expect(detail.body.data.totalMinor).toBe(1101);
    } finally {
      await database.user.update({ where: { id: admin.id }, data: { role: 'CUSTOMER' } });
    }
  });
});
