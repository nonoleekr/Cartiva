import { createDatabase, localDatabaseUrl } from '../src/lib/database.js';
import { assertLocalDatabase } from './seed-safety.js';
import { seedCatalog } from './seed-data.js';

const url = process.env.DATABASE_URL ?? localDatabaseUrl;
assertLocalDatabase(url, 'seed');
const database = createDatabase(url);
try {
  await seedCatalog(database);
  console.log('Seeded 3 synthetic categories and 26 products (24 active, 1 draft, 1 archived).');
} finally {
  await database.$disconnect();
}
