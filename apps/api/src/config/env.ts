import { localDatabaseUrl } from '../lib/database.js';

export type Environment = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  databaseUrl: string;
};

// Runtime checks are necessary: process.env values are untrusted strings.
export function readEnvironment(values: NodeJS.ProcessEnv): Environment {
  const nodeEnv = values.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production.');
  }

  const rawPort = values.PORT ?? '3001';
  const port = Number(rawPort);
  if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const host = values.HOST ?? (nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1');
  if (host.trim() === '' || /\s|[/\\]/.test(host)) {
    throw new Error('HOST must be a hostname or IP address without whitespace or slashes.');
  }

  const databaseUrl = values.DATABASE_URL ?? (nodeEnv === 'production' ? '' : localDatabaseUrl);
  try {
    const url = new URL(databaseUrl);
    if (!['postgresql:', 'postgres:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a hostname and database name.');
  }
  return { nodeEnv, host, port, databaseUrl };
}
