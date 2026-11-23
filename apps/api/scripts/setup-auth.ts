import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../.env', import.meta.url));
const existing = existsSync(file) ? readFileSync(file, 'utf8') : '';
if (/^BETTER_AUTH_SECRET=/m.test(existing)) {
  console.log('Local auth secret already configured; existing .env preserved.');
} else {
  appendFileSync(file, `\nBETTER_AUTH_SECRET=${randomBytes(48).toString('hex')}\n`);
  console.log('Created a random local auth secret in apps/api/.env (gitignored). Secret not printed.');
}
