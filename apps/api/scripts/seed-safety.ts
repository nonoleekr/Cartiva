export function assertLocalDatabase(connectionString: string, purpose: 'seed' | 'test', nodeEnv = process.env.NODE_ENV) {
  const url = new URL(connectionString);
  const database = url.pathname.slice(1);
  const allowed = purpose === 'test' ? ['cartiva_test'] : ['cartiva_dev', 'cartiva_test'];
  if (nodeEnv === 'production' || !['postgres:', 'postgresql:'].includes(url.protocol)
    || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    || !allowed.includes(database) || [...url.searchParams.keys()].some((key) => key !== 'sslmode')) {
    throw new Error(`${purpose} requires an explicitly named local Cartiva development/test database outside production.`);
  }
}
