import { describe, expect, it } from 'vitest';
import { assertLocalDatabase } from '../scripts/seed-safety.js';

describe('seed/test database isolation', () => {
  it('allows named local databases but never dev for integration tests', () => {
    expect(() => assertLocalDatabase('postgresql://localhost/cartiva_dev', 'seed', 'development')).not.toThrow();
    expect(() => assertLocalDatabase('postgresql://localhost/cartiva_dev', 'test', 'test')).toThrow();
  });
  it.each(['postgresql://remote.example/cartiva_test', 'postgresql://localhost/production', 'postgresql://localhost/cartiva_test?options=x'])('rejects unsafe target %s', (url) => {
    expect(() => assertLocalDatabase(url, 'test', 'test')).toThrow();
  });
  it('refuses any seed in production mode', () => {
    expect(() => assertLocalDatabase('postgresql://localhost/cartiva_dev', 'seed', 'production')).toThrow();
  });
});
