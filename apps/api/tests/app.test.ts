import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

const webDirectory = mkdtempSync(path.join(tmpdir(), 'cartiva-spa-test-'));
writeFileSync(path.join(webDirectory, 'index.html'), '<!doctype html><title>Test SPA</title>');
afterAll(() => rmSync(webDirectory, { recursive: true, force: true }));

describe('HTTP foundation', () => {
  it('reports liveness without depending on a database', async () => {
    const response = await request(createApp()).get('/api/v1/health/live').expect(200);
    expect(response.body).toEqual({ data: { status: 'ok', service: 'cartiva-api' } });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it.each(['/api', '/api/missing', '/api/v1/missing', '/API/missing'])(
    'keeps %s JSON even when a browser requests HTML', async (url) => {
      const response = await request(createApp({ webDirectory })).get(url)
        .set('Accept', 'text/html').expect(404).expect('Content-Type', /json/);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }
  );

  it('serves the SPA for deep links but not missing assets or non-GET requests', async () => {
    const app = createApp({ webDirectory });
    await request(app).get('/about').set('Accept', 'text/html').expect(200).expect(/Test SPA/);
    await request(app).get('/missing.js').set('Accept', 'text/html').expect(404);
    await request(app).post('/about').expect(404);
  });

  it('fails clearly when production assets are missing', () => {
    expect(() => createApp({ webDirectory: path.join(webDirectory, 'absent') })).toThrow('Run npm run build');
  });
});
