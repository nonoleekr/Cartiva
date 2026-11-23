import { z } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requestJson<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
  const timeout = AbortSignal.timeout(10_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const response = await fetch(path, { ...options, credentials: 'same-origin', cache: 'no-store', signal });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = z.object({ error: z.object({ message: z.string() }) }).safeParse(body);
    throw new HttpError(response.status, problem.success ? problem.data.error.message : 'Unable to complete the request. Please try again.');
  }
  const result = schema.safeParse(body);
  if (!result.success) throw new Error('The server returned an unexpected response. Please try again.');
  return result.data;
}
