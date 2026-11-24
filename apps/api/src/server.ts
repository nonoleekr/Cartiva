import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readEnvironment } from './config/env.js';
import { createDatabase } from './lib/database.js';
import { readAuthSettings } from './modules/auth/auth.config.js';

try {
  const environment = readEnvironment(process.env);
  const database = createDatabase(environment.databaseUrl);
  const app = createApp({ database, authSettings: readAuthSettings(process.env), ...(environment.nodeEnv === 'production'
    ? { webDirectory: fileURLToPath(new URL('../../web/dist/', import.meta.url)) }
    : {}) });

  const server = app.listen(environment.port, environment.host, () => {
    console.log(`Cartiva API listening on http://${environment.host}:${environment.port} (${environment.nodeEnv})`);
  });
  server.on('error', (error) => {
    console.error('Cartiva failed to listen:', error.message);
    process.exitCode = 1;
  });

  function shutdown() {
    server.close(async (error) => {
      await database.$disconnect();
      if (error) console.error('Shutdown failed:', error.message);
      process.exit(error ? 1 : 0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch (error) {
  console.error('Cartiva startup failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
}
