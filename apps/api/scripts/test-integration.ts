import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertLocalDatabase } from './seed-safety.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error('Set TEST_DATABASE_URL to the isolated cartiva_test database.');
assertLocalDatabase(databaseUrl, 'test');
const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: databaseUrl };

// Run with Node directly for Windows/Linux parity, avoiding shell quoting.
for (const [relativePath, args] of [
  ['../../../node_modules/prisma/build/index.js', ['migrate', 'deploy', '--config', 'prisma7.config.ts']],
  ['../../../node_modules/vitest/vitest.mjs', ['run', '--no-file-parallelism', 'tests/integration/catalog.test.ts', 'tests/integration/auth.test.ts', 'tests/integration/cart.test.ts']]
] as const) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(relativePath, import.meta.url)), ...args], { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
