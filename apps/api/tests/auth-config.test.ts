import { describe, expect, it } from 'vitest';
import { readAuthSettings } from '../src/modules/auth/auth.config.js';

describe('auth configuration', () => {
  const secret = 'test-only-secret-of-at-least-32-characters';
  it('requires a secret without a production fallback', () => {
    expect(() => readAuthSettings({})).toThrow('BETTER_AUTH_SECRET');
    expect(() => readAuthSettings({ BETTER_AUTH_SECRET: secret, NODE_ENV: 'production' })).toThrow('APP_ORIGIN');
  });
  it('requires HTTPS for production and a precise origin', () => {
    for (const origin of ['http://example.com', 'https://example.com/path', 'https://user:pass@example.com', 'https://example.com?a=b']) {
      expect(() => readAuthSettings({ BETTER_AUTH_SECRET: secret, APP_ORIGIN: origin, NODE_ENV: 'production' })).toThrow();
    }
    expect(readAuthSettings({ BETTER_AUTH_SECRET: secret, APP_ORIGIN: 'https://shop.example', NODE_ENV: 'production' }).secureCookies).toBe(true);
  });
});
