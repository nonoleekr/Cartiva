import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export const localDatabaseUrl = 'postgresql://cartiva:cartiva_local_only@127.0.0.1:5434/cartiva_dev';

export function createDatabase(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 3000 }) });
}

export type Database = ReturnType<typeof createDatabase>;
