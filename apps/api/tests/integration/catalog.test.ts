import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { createApp } from '../../src/app.js';
import { assertLocalDatabase } from '../../scripts/seed-safety.js';
import { seedCatalog } from '../../scripts/seed-data.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('Use npm run test:integration with TEST_DATABASE_URL.');
assertLocalDatabase(url, 'test');
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }), log: [{ emit: 'event', level: 'query' }] });
const queries: string[] = [];
database.$on('query', (event) => queries.push(event.query));
const sql = new Pool({ connectionString: url, max: 2 });
const app = createApp({ database });

beforeAll(async () => { await seedCatalog(database); }, 30_000);
afterAll(async () => { await database.$disconnect(); await sql.end(); });

describe('real PostgreSQL public catalog', () => {
  it('seeds repeatably without duplicating categories/products or creating users', async () => {
    await seedCatalog(database);
    expect(await database.product.count()).toBe(26);
    expect(await database.category.count()).toBe(3);
    expect(await database.user.count()).toBe(0);
  });

  it('paginates active products with no overlap and explicit public DTOs', async () => {
    const first = await request(app).get('/api/v1/products').expect(200);
    const second = await request(app).get('/api/v1/products?page=2').expect(200);
    expect(first.body.meta).toEqual({ page: 1, pageSize: 20, totalItems: 24, totalPages: 2 });
    expect(second.body.data).toHaveLength(4);
    const ids = [...first.body.data, ...second.body.data].map((item: { id: string }) => item.id);
    expect(new Set(ids).size).toBe(24);
    expect(Object.keys(first.body.data[0]).sort()).toEqual(['category','currency','id','imagePath','name','priceMinor','slug','stockQuantity'].sort());
    expect(first.body.data[0].currency).toBe('MYR');
  });

  it('finds case-insensitive names/descriptions outside the first sorted page', async () => {
    const first = await request(app).get('/api/v1/products?sort=price-asc').expect(200);
    expect(first.body.data.some((item: { slug: string }) => item.slug === 'sample-item-25')).toBe(false);
    const result = await request(app).get('/api/v1/products?q=AMBER%20TELESCOPE&sort=price-asc').expect(200);
    expect(result.body.data.map((item: { slug: string }) => item.slug)).toEqual(['sample-item-25']);
    const name = await request(app).get('/api/v1/products?q=sample%20desk').expect(200);
    expect(name.body.data.length).toBeGreaterThan(0);
  });

  it('filters category, sorts by price and breaks equal-price ties by ID', async () => {
    const result = await request(app).get('/api/v1/products?category=desk&sort=price-desc').expect(200);
    expect(result.body.data.every((item: { category: { slug: string } }) => item.category.slug === 'desk')).toBe(true);
    const prices = result.body.data.map((item: { priceMinor: number }) => item.priceMinor);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => b - a));
    const tied = await request(app).get('/api/v1/products?sort=price-asc&pageSize=2').expect(200);
    expect(tied.body.data.map((item: { slug: string }) => item.slug)).toEqual(['sample-item-01', 'sample-item-02']);
    const alphabetic = await request(app).get('/api/v1/products?sort=name').expect(200);
    const names = alphabetic.body.data.map((item: { name: string }) => item.name);
    expect(names).toEqual([...names].sort());
  });

  it('returns only active details, while out-of-stock active products stay visible', async () => {
    const active = await request(app).get('/api/v1/products/sample-item-03').expect(200);
    expect(active.body.data.stockQuantity).toBe(0);
    expect(active.body.data.description).toContain('Fictional');
    for (const slug of ['sample-item-24','sample-item-26','unknown']) {
      await request(app).get(`/api/v1/products/${slug}`).expect(404);
    }
  });

  it('returns clean empty results and treats wildcard text literally', async () => {
    for (const query of ['q=no-such-thing','category=unknown','q=%25','q=%27%20OR%201%3D1--']) {
      const result = await request(app).get(`/api/v1/products?${query}`).expect(200);
      expect(result.body.data).toEqual([]);
      expect(result.body.meta.totalItems).toBe(0);
    }
    const pastEnd = await request(app).get('/api/v1/products?page=100').expect(200);
    expect(pastEnd.body.data).toEqual([]);
  });

  it.each(['page=0','page=-1','page=1.5','page=100001','pageSize=51','pageSize=0','sort=unsafe','page=1&page=2','extra=x','q='+ 'x'.repeat(101)])('rejects invalid query %s', async (query) => {
    const result = await request(app).get(`/api/v1/products?${query}`).expect(400);
    expect(result.body.error.code).toBe('VALIDATION_ERROR');
    expect(result.body.error.requestId).toBeTruthy();
  });

  it('lists categories, verifies readiness, and leaves auth routes absent', async () => {
    const response = await request(app).get('/api/v1/categories').expect(200);
    expect(response.body.data.map((category: { slug: string }) => category.slug)).toEqual(['desk', 'home', 'travel']);
    await request(app).get('/api/v1/health/ready').expect(200);
    await request(createApp()).get('/api/v1/health/ready').expect(503);
    await request(app).post('/api/auth/sign-in/email').expect(404);
  });

  it('reports unavailable database readiness without exposing connection details', async () => {
    const unavailable = new PrismaClient({ adapter: new PrismaPg({ connectionString: 'postgresql://localhost:1/cartiva_test', connectionTimeoutMillis: 100 }) });
    try {
      const response = await request(createApp({ database: unavailable })).get('/api/v1/health/ready').expect(503);
      expect(response.body.error.code).toBe('NOT_READY');
      expect(JSON.stringify(response.body)).not.toContain('postgresql');
    } finally {
      await unavailable.$disconnect();
    }
  });

  it('enforces SQL checks, enum values, unique slugs and category foreign keys', async () => {
    for (const [column, value, code] of [
      ['priceMinor', 0, '23514'], ['priceMinor', 100000001, '23514'],
      ['stockQuantity', -1, '23514'], ['version', -1, '23514'],
      ['name', '', '23514'], ['status', 'UNKNOWN', '22P02'],
      ['slug', 'sample-item-02', '23505'],
      ['categoryId', '10000000-0000-4000-8000-000000000099', '23503']
    ] as const) {
      // Column names above are fixed test literals; all values remain parameters.
      await expect(sql.query(`UPDATE product SET "${column}" = $1 WHERE slug = 'sample-item-01'`, [value])).rejects.toMatchObject({ code });
    }
    await expect(sql.query('DELETE FROM category WHERE slug = $1', ['desk'])).rejects.toMatchObject({ code: '23503' });
  });

  it('uses a bounded query count instead of one category query per product', async () => {
    queries.length = 0;
    await request(app).get('/api/v1/products?pageSize=1').expect(200);
    const small = queries.filter((query) => /^SELECT/i.test(query.trim())).length;
    queries.length = 0;
    await request(app).get('/api/v1/products?pageSize=50').expect(200);
    const large = queries.filter((query) => /^SELECT/i.test(query.trim())).length;
    expect(large).toBe(small);
    expect(large).toBeLessThanOrEqual(3);
    console.log(`Catalog SELECT count: pageSize=1: ${small}; pageSize=50: ${large}`);
    const plan = await sql.query('EXPLAIN SELECT id FROM product WHERE status = $1 ORDER BY "createdAt" DESC, id LIMIT 20', ['ACTIVE']);
    console.log('Synthetic catalog plan:', plan.rows.map((row) => row['QUERY PLAN']).join('\n'));
  });

  it('applies the catalog migration over an existing auth-schema fixture without losing rows', async () => {
    const connection = await sql.connect();
    try {
      await connection.query('BEGIN');
      await connection.query('CREATE SCHEMA cartiva_upgrade_fixture');
      await connection.query('SET LOCAL search_path TO cartiva_upgrade_fixture');
      const authSql = readFileSync(new URL('../../prisma/migrations/202611190001_auth_base/migration.sql', import.meta.url), 'utf8');
      const catalogSql = readFileSync(new URL('../../prisma/migrations/202611190002_catalog/migration.sql', import.meta.url), 'utf8');
      await connection.query(authSql);
      await connection.query('INSERT INTO "user" (id,name,email,"updatedAt") VALUES ($1,$2,$3,now())', ['fixture', 'Fictional User', 'fixture@example.invalid']);
      await connection.query(catalogSql);
      const result = await connection.query('SELECT id,role FROM "user"');
      expect(result.rows).toEqual([{ id: 'fixture', role: 'CUSTOMER' }]);
      await expect(connection.query('UPDATE "user" SET role = $1', ['OWNER'])).rejects.toMatchObject({ code: '23514' });
    } finally {
      await connection.query('ROLLBACK');
      connection.release();
    }
  });
});
