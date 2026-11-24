import { describe, expect, it } from 'vitest';
import { readEnvironment } from '../src/config/env.js';
import { localDatabaseUrl } from '../src/lib/database.js';

describe('startup environment', () => {
  it('uses local defaults and a production-compatible bind address', () => {
    expect(readEnvironment({})).toEqual({ nodeEnv: 'development', host: '127.0.0.1', port: 3001, databaseUrl: localDatabaseUrl });
    expect(readEnvironment({ NODE_ENV: 'production', DATABASE_URL: localDatabaseUrl }).host).toBe('0.0.0.0');
  });

  it.each(['', '0', '-1', '3001junk', '3.2', '65536'])('rejects invalid PORT %j', (port) => {
    expect(() => readEnvironment({ PORT: port })).toThrow('PORT must be');
  });

  it('rejects invalid modes and bind addresses', () => {
    expect(() => readEnvironment({ NODE_ENV: 'prod' })).toThrow('NODE_ENV must be');
    expect(() => readEnvironment({ HOST: 'http://localhost' })).toThrow('HOST must be');
  });
  it('requires an explicit production database and validates database URL shape', () => {
    expect(() => readEnvironment({ NODE_ENV: 'production' })).toThrow('DATABASE_URL');
    expect(() => readEnvironment({ DATABASE_URL: 'https://example.com' })).toThrow('DATABASE_URL');
  });
});
