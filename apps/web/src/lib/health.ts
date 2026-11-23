export async function checkHealth(signal: AbortSignal): Promise<void> {
  const response = await fetch('/api/v1/health/live', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('The API did not respond successfully.');

  // A TS assertion cannot validate JSON returned over the network.
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('data' in body)
    || typeof body.data !== 'object' || body.data === null
    || !('status' in body.data) || body.data.status !== 'ok'
    || !('service' in body.data) || body.data.service !== 'cartiva-api') {
    throw new Error('The API returned an unexpected health response.');
  }
}
