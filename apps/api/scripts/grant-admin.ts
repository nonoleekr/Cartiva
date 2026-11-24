import { createDatabase, localDatabaseUrl } from '../src/lib/database.js';
import { assertLocalDatabase } from './seed-safety.js';

const url = process.env.DATABASE_URL ?? localDatabaseUrl;
assertLocalDatabase(url, 'seed');
const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv[3] !== '--confirm') throw new Error('Usage: npm run auth:grant-admin -- user@example.invalid --confirm (local database only; existing account required).');
const database = createDatabase(url);
try {
  await database.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email } });
    if (!user) throw new Error('Account not found. Register locally first.');
    await tx.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
    await tx.session.deleteMany({ where: { userId: user.id } });
  });
  console.log('Granted ADMIN locally and revoked previous sessions. Sign in again.');
} finally { await database.$disconnect(); }
