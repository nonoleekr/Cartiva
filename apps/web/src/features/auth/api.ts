export type User = { id: string; name: string; email: string; role: 'CUSTOMER' | 'ADMIN' };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function message(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (record(body)) {
    if (typeof body.message === 'string') return body.message;
    if (record(body.error) && typeof body.error.message === 'string') return body.error.message;
  }
  return response.status === 429 ? 'Too many attempts. Please wait a minute before trying again.' : 'Unable to complete the request. Please try again.';
}

export async function fetchIdentity(signal?: AbortSignal): Promise<User | null> {
  const timeout = AbortSignal.timeout(10_000);
  const response = await fetch('/api/v1/me', { credentials: 'same-origin', cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await message(response));
  const body: unknown = await response.json();
  if (!record(body) || !record(body.data) || !record(body.data.user)) throw new Error('Invalid session response.');
  const user = body.data.user;
  if (typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string'
    || (user.role !== 'CUSTOMER' && user.role !== 'ADMIN')) throw new Error('Invalid account response.');
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function authenticate(action: 'sign-in/email' | 'sign-up/email' | 'sign-out', input: Record<string, string>) {
  const response = await fetch(`/api/auth/${action}`, { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!response.ok) throw new Error(await message(response));
  // Ignore library response tokens: the browser sends the HttpOnly session cookie.
}
