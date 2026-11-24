import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { APIError } from 'better-auth/api';
import type { Database } from '../../lib/database.js';
import type { AuthSettings } from './auth.config.js';

export function createAuth(database: Database, settings: AuthSettings) {
  return betterAuth({
    database: prismaAdapter(database, { provider: 'postgresql', transaction: true }),
    secret: settings.secret,
    baseURL: settings.origin,
    trustedOrigins: [settings.origin],
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, disableSessionRefresh: true, cookieCache: { enabled: false } },
    advanced: {
      useSecureCookies: settings.secureCookies,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: settings.secureCookies, path: '/' },
      // Express overwrites this header from the socket; never trust a client-supplied XFF.
      ipAddress: { ipAddressHeaders: ['x-cartiva-client-ip'] }
    },
    rateLimit: { enabled: true, storage: 'memory', window: 60, max: 100,
      customRules: { '/sign-in/email': { window: 60, max: 10 }, '/sign-up/email': { window: 60, max: 5 } } },
    user: { additionalFields: { role: { type: ['CUSTOMER', 'ADMIN'], defaultValue: 'CUSTOMER', input: false } } },
    databaseHooks: { user: { create: { before: async (user) => {
      const name = user.name.trim();
      if (!name || name.length > 100 || user.email.length > 254) throw new APIError('BAD_REQUEST', { message: 'Name must contain 1–100 characters and email at most 254.' });
      return { data: { ...user, name, role: 'CUSTOMER' } };
    } } } }
  });
}

export type Auth = ReturnType<typeof createAuth>;
