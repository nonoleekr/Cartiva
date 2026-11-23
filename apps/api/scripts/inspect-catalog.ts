import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { localDatabaseUrl } from '../src/lib/database.js';
import { createCatalogService } from '../src/modules/catalog/catalog.service.js';
import { assertLocalDatabase } from './seed-safety.js';

const url = process.env.DATABASE_URL ?? localDatabaseUrl;
assertLocalDatabase(url, 'seed');
const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }), log: [{ level: 'query', emit: 'event' }] });
const queries: string[] = [];
database.$on('query', (event) => queries.push(event.query));
try {
  for (const pageSize of [1, 50]) {
    queries.length = 0;
    const start = performance.now();
    await createCatalogService(database).list({ sort: 'newest', page: 1, pageSize });
    console.log(`pageSize=${pageSize}: ${queries.filter((query) => /^SELECT/i.test(query.trim())).length} SELECT statements; ${(performance.now() - start).toFixed(1)} ms (local diagnostic only)`);
  }
  console.log('Representative parameterized SQL (no parameter values):');
  for (const query of queries.filter((query) => /^SELECT/i.test(query.trim()))) console.log(query);
  const plan = await database.$queryRaw<Array<{ 'QUERY PLAN': string }>>`EXPLAIN SELECT id FROM product WHERE status = 'ACTIVE' ORDER BY "createdAt" DESC, id LIMIT 20`;
  console.log(plan.map((row) => row['QUERY PLAN']).join('\n'));
} finally {
  await database.$disconnect();
}
