import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { verifyPassword } from 'better-auth/crypto';
import { createApp } from '../../src/app.js';
import { createDatabase } from '../../src/lib/database.js';
import { createAuth } from '../../src/modules/auth/auth.js';
import { requireAdmin, requireCsrf, requireSession } from '../../src/modules/auth/auth.middleware.js';
import { ApiError } from '../../src/lib/errors.js';
import { assertLocalDatabase } from '../../scripts/seed-safety.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL required');
assertLocalDatabase(url, 'test');
const database = createDatabase(url);
const origin = 'http://127.0.0.1:5173';
const settings = { secret: 'integration-only-secret-longer-than-32-characters', origin, secureCookies: false };
const app = createApp({ database, authSettings: settings });
const email = `m3-${randomUUID()}@example.invalid`;
const password = `test-${randomUUID()}`;
let cookie: string;
let userId: string;
const cookieOf = (response: { headers: Record<string, unknown> }) => (response.headers['set-cookie'] as unknown as string[]).map((item) => item.split(';')[0]).join('; ');

beforeAll(async () => {
  const response = await request(app).post('/api/auth/sign-up/email').set('Origin', origin).send({ name: 'Fictional Test', email, password, role: 'ADMIN' }).expect(200);
  cookie = cookieOf(response);
  userId = response.body.user.id;
}, 15_000);
afterAll(async () => { await database.user.deleteMany({ where: { email } }); await database.$disconnect(); });

describe('database-backed authentication', () => {
  it('hashes passwords, ignores injected roles and returns a minimal current identity', async () => {
    const user = await database.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.role).toBe('CUSTOMER');
    const account = await database.account.findFirstOrThrow({ where: { userId } });
    expect(account.password).not.toBe(password);
    expect(await verifyPassword({ hash: account.password!, password })).toBe(true);
    const response = await request(app).get('/api/v1/me').set('Cookie', cookie).expect(200);
    expect(Object.keys(response.body.data.user).sort()).toEqual(['email','id','name','role']);
    expect(response.body.data.user.role).toBe('CUSTOMER');
    await request(app).get('/api/v1/products').expect(200);
  });

  it('restores identity from cookie and rejects missing identity', async () => {
    await request(app).get('/api/v1/me').set('Cookie', cookie).expect(200);
    await request(app).get('/api/v1/me').expect(401);
    const response = await request(app).get('/api/v1/csrf').set('Cookie', cookie).expect(200);
    expect(response.body.data.token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects missing/untrusted Origin, wrong content types and unavailable auth endpoints', async () => {
    for (const wrongOrigin of ['', 'https://evil.example']) {
      const mutation = request(app).post('/api/auth/sign-in/email');
      if (wrongOrigin) mutation.set('Origin', wrongOrigin);
      await mutation.send({ email, password }).expect(403);
    }
    await request(app).post('/api/auth/sign-in/email').set('Origin', origin).type('form').send({ email, password }).expect(403);
    await request(app).post('/api/auth/update-user').set('Origin', origin).send({ role: 'ADMIN' }).expect(404);
    await request(app).post('/api/auth/sign-up/email').set('Origin', origin).send({ name: 'x', email, password: 'x'.repeat(17000) }).expect(413);
  });

  it('checks fresh roles, admin permission and session-bound CSRF on middleware fixtures', async () => {
    const auth = createAuth(database, settings);
    const probe = express();
    probe.use(requireSession(auth, database));
    probe.get('/admin', requireAdmin, (_request, response) => { response.json({ allowed: true }); });
    probe.post('/mutation', requireCsrf(settings.secret, origin), (_request, response) => { response.sendStatus(204); });
    probe.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
      void _next;
      response.sendStatus(error instanceof ApiError ? error.status : 500);
    });
    await request(probe).get('/admin').expect(401);
    await request(probe).get('/admin').set('Cookie', cookie).expect(403);
    await database.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    await request(probe).get('/admin').set('Cookie', cookie).expect(200);
    await database.user.update({ where: { id: userId }, data: { role: 'CUSTOMER' } });
    await request(probe).get('/admin').set('Cookie', cookie).expect(403);
    const csrf = await request(app).get('/api/v1/csrf').set('Cookie', cookie).expect(200);
    await request(probe).post('/mutation').set('Cookie', cookie).set('Origin', origin).send({}).expect(403);
    await request(probe).post('/mutation').set('Cookie', cookie).set('Origin', origin).set('X-CSRF-Token', '0'.repeat(64)).send({}).expect(403);
    await request(probe).post('/mutation').set('Cookie', cookie).set('Origin', 'https://evil.example').set('X-CSRF-Token', csrf.body.data.token).send({}).expect(403);
    await request(probe).post('/mutation').set('Cookie', cookie).set('Origin', origin).set('X-CSRF-Token', csrf.body.data.token).send({}).expect(204);
  });

  it('rejects wrong credentials and then successfully signs in', async () => {
    await request(app).post('/api/auth/sign-in/email').set('Origin', origin).send({ email, password: 'incorrect-password' }).expect(401);
    const response = await request(app).post('/api/auth/sign-in/email').set('Origin', origin).send({ email, password }).expect(200);
    const setCookies = response.headers['set-cookie'] as unknown as string[];
    expect(setCookies.join(' ')).toMatch(/HttpOnly/i);
    expect(setCookies.join(' ')).toMatch(/SameSite=Lax/i);
    cookie = cookieOf(response);
  });

  it('enforces the server-side password minimum', async () => {
    await request(app).post('/api/auth/sign-up/email').set('Origin', origin)
      .send({ name: 'Fictional Test', email: `short-${email}`, password: 'short' }).expect(400);
    expect(await database.user.findUnique({ where: { email: `short-${email}` } })).toBeNull();
  });

  it('revokes logout sessions and rejects replay of the old cookie', async () => {
    const oldCookie = cookie;
    const oldCsrf = await request(app).get('/api/v1/csrf').set('Cookie', cookie).expect(200);
    await request(app).post('/api/auth/sign-out').set('Origin', origin).set('Cookie', cookie).send({}).expect(200);
    await request(app).get('/api/v1/me').set('Cookie', oldCookie).expect(401);
    const signin = await request(app).post('/api/auth/sign-in/email').set('Origin', origin).send({ email, password }).expect(200);
    cookie = cookieOf(signin);
    const newCsrf = await request(app).get('/api/v1/csrf').set('Cookie', cookie).expect(200);
    expect(newCsrf.body.data.token).not.toBe(oldCsrf.body.data.token);
    await database.session.updateMany({ where: { userId }, data: { expiresAt: new Date(0) } });
    await request(app).get('/api/v1/me').set('Cookie', cookie).expect(401);
  });

  it('uses secure cookies for an HTTPS production-like origin', async () => {
    const secureApp = createApp({ database, authSettings: { ...settings, origin: 'https://cartiva.example', secureCookies: true } });
    const response = await request(secureApp).post('/api/auth/sign-in/email').set('Origin', 'https://cartiva.example').send({ email, password }).expect(200);
    expect((response.headers['set-cookie'] as unknown as string[]).join(' ')).toMatch(/; Secure/i);
  });

  it('limits repeated sign-in attempts even with spoofed forwarding headers', async () => {
    let limited = false;
    for (let index = 0; index < 12; index++) {
      const response = await request(app).post('/api/auth/sign-in/email').set('Origin', origin)
        .set('X-Forwarded-For', `192.0.2.${index}`).set('X-Cartiva-Client-Ip', `192.0.2.${index}`)
        .send({ email, password: 'incorrect-password' });
      if (response.status === 429) { limited = true; break; }
    }
    expect(limited).toBe(true);
  }, 20_000);
});
