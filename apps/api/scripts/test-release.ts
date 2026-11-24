import { z } from 'zod';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../src/lib/database.js';
import { assertLocalDatabase } from './seed-safety.js';

const connection = process.env.TEST_DATABASE_URL;
if (!connection) throw new Error('Set TEST_DATABASE_URL to the isolated cartiva_test database.');
assertLocalDatabase(connection, 'test');
const database = createDatabase(connection);
const origin = 'https://cartiva.test';
const secret = randomBytes(32).toString('hex');
const suffix = randomUUID();
const customerEmail = 'release-customer-' + suffix + '@example.invalid';
const adminEmail = 'release-admin-' + suffix + '@example.invalid';
const orderIdResponse = z.object({ data: z.object({ id: z.uuid() }) });
const fixtureSlug = 'release-' + suffix;
const password = randomUUID();

const listener = createServer().listen(0, '127.0.0.1');
await once(listener, 'listening');
const address = listener.address();
assert(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));

let child: ReturnType<typeof spawn> | undefined;
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

async function call(path: string, status: number, options: RequestInit = {}) {
  const response = await fetch('http://127.0.0.1:' + port + path, { ...options, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, status, path);
  return response;
}

async function start() {
  child = spawn(process.execPath, [fileURLToPath(new URL('../dist/server.js', import.meta.url))], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), NODE_ENV: 'production',
      APP_ORIGIN: origin, DATABASE_URL: connection, BETTER_AUTH_SECRET: secret },
    stdio: 'inherit'
  });
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error('Built server exited before readiness.');
    try { await call('/api/v1/health/ready', 200); return; } catch { await delay(250); }
  }
  throw new Error('Built server did not become ready.');
}

function json(body: object, cookie?: string, extra: Record<string, string> = {}) {
  return { headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: JSON.stringify(body) };
}

async function auth(action: 'sign-up' | 'sign-in', email: string) {
  const response = await call('/api/auth/' + action + '/email', 200, {
    method: 'POST', ...json({ email, password, ...(action === 'sign-up' ? { name: 'Fictional Release User' } : {}) })
  });
  const cookies = response.headers.getSetCookie();
  const session = cookies.find(cookie => cookie.includes('session_token='));
  assert(session && /; Secure/i.test(session) && /; HttpOnly/i.test(session) && /; SameSite=Lax/i.test(session));
  return cookies.map(cookie => cookie.split(';')[0]).join('; ');
}

async function token(cookie: string): Promise<string> {
  const response = await call('/api/v1/csrf', 200, { headers: { Cookie: cookie } });
  return z.object({ data: z.object({ token: z.string() }) }).parse(await response.json()).data.token;
}

try {
  const category = await database.category.create({ data: { slug: fixtureSlug, name: 'Release fixture' } });
  const product = await database.product.create({ data: {
    slug: fixtureSlug, categoryId: category.id, name: 'Release fixture', description: 'Synthetic release test.',
    imagePath: '/assets/catalog-placeholder.svg', priceMinor: 1250, stockQuantity: 2, status: 'ACTIVE'
  } });
  await start();
  const html = await (await call('/products/' + fixtureSlug, 200)).text();
  const asset = html.match(/src="([^"]+\.js)"/)?.[1];
  assert(asset);
  await call(asset, 200);
  await call('/api/v1/no-such-route', 404, { headers: { Accept: 'text/html' } });
  const customer = await auth('sign-up', customerEmail);
  const admin = await auth('sign-up', adminEmail);
  await database.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });

  const item = { productId: product.id, quantity: 1 };
  await call('/api/v1/cart/items', 403, { method: 'POST', ...json(item, customer) });
  const customerCsrf = { 'X-CSRF-Token': await token(customer) };
  await call('/api/v1/cart/items', 403, { method: 'POST', ...json(item, customer, { ...customerCsrf, Origin: 'https://other.test' }) });
  await call('/api/v1/cart/items', 200, { method: 'POST', ...json(item, customer, customerCsrf) });
  const quote = await call('/api/v1/checkout/quotes', 201, { method: 'POST', ...json({}, customer, customerCsrf) });
  const placed = await call('/api/v1/orders', 201, {
    method: 'POST', ...json({ quoteId: orderIdResponse.parse(await quote.json()).data.id, shipping: {
      recipientName: 'Fictional Recipient', addressLine1: '1 Example Street', city: 'Ipoh', postalCode: '30000', country: 'MY'
    } }, customer, { ...customerCsrf, 'Idempotency-Key': randomUUID() })
  });
  const id = orderIdResponse.parse(await placed.json()).data.id;
  const path = '/api/v1/admin/orders/' + id + '/status';
  await call(path, 403, { method: 'PATCH', ...json({ status: 'PROCESSING', expectedVersion: 0 }, customer, customerCsrf) });
  const adminCsrf = { 'X-CSRF-Token': await token(admin) };
  for (const [expectedVersion, status] of ['PROCESSING', 'SHIPPED'].entries()) {
    await call(path, 200, { method: 'PATCH', ...json({ status, expectedVersion }, admin, adminCsrf) });
  }
  await call('/api/auth/sign-out', 200, { method: 'POST', ...json({}, customer) });
  await call('/api/v1/me', 401, { headers: { Cookie: customer } });
  await stop();
  await start();
  const restoredSession = await auth('sign-in', customerEmail);
  const order = await call('/api/v1/orders/' + id, 200, { headers: { Cookie: restoredSession } });
  assert.equal(z.object({ data: z.object({ status: z.string() }) }).parse(await order.json()).data.status, 'SHIPPED');
  assert.equal((await database.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 1);
  console.log('Release smoke passed: built SPA and API, secure cookie flags, CSRF, checkout, fulfillment, logout, and restart persistence.');
} finally {
  await stop();
  const emails = [customerEmail, adminEmail];
  try {
    await database.customerOrder.deleteMany({ where: { user: { email: { in: emails } } } });
    await database.user.deleteMany({ where: { email: { in: emails } } });
    await database.product.deleteMany({ where: { slug: fixtureSlug } });
    await database.category.deleteMany({ where: { slug: fixtureSlug } });
  } finally { await database.$disconnect(); }
}
