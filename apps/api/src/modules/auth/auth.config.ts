export type AuthSettings = { secret: string; origin: string; secureCookies: boolean };

export function readAuthSettings(values: NodeJS.ProcessEnv): AuthSettings {
  const secret = values.BETTER_AUTH_SECRET ?? '';
  if (secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters. Run npm run auth:setup for local development.');
  const rawOrigin = values.APP_ORIGIN ?? (values.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:5173');
  let origin: URL;
  try { origin = new URL(rawOrigin); } catch { throw new Error('APP_ORIGIN must be an absolute HTTP(S) origin.'); }
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash
    || (values.NODE_ENV === 'production' && origin.protocol !== 'https:')) {
    throw new Error('APP_ORIGIN must be an origin without credentials/path, and use HTTPS in production.');
  }
  return { secret, origin: origin.origin, secureCookies: origin.protocol === 'https:' };
}
