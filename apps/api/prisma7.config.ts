import { defineConfig } from 'prisma/config';

// The npm scripts load .env; CI can supply DATABASE_URL directly.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://cartiva:cartiva_local_only@127.0.0.1:5434/cartiva_dev'
  }
});
