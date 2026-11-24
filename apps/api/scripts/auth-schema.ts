import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';

// Schema-generation input ONLY. No handler, credentials or auth routes are mounted.
// The generator needs the adapter's schema metadata, not a live Prisma connection.
export const auth = betterAuth({
  baseURL: 'http://127.0.0.1:3001',
  database: prismaAdapter({}, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: { type: ['CUSTOMER', 'ADMIN'], defaultValue: 'CUSTOMER', input: false }
    }
  }
});
