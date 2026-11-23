import { useEffect, useState } from 'react';
import { checkHealth } from '../lib/health';

type Connection = 'checking' | 'connected' | 'unavailable';

export function FoundationPage() {
  const [connection, setConnection] = useState<Connection>('checking');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let active = true;

    checkHealth(controller.signal)
      .then(() => { if (active) setConnection('connected'); })
      .catch(() => { if (active) setConnection('unavailable'); })
      .finally(() => clearTimeout(timeout));

    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [attempt]);

  function retry() {
    setConnection('checking');
    setAttempt((previous) => previous + 1);
  }

  return <section className="py-16 sm:py-24" aria-labelledby="foundation-title">
    <h1 id="foundation-title" className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">A fresh start for Cartiva.</h1>
    <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">The foundation is taking shape. Shopping features will arrive one milestone at a time.</p>
    <div className="mt-12 max-w-xl border-y border-stone-200 py-7">
      <h2 className="text-lg font-semibold">Connection check</h2>
      <p role="status" aria-live="polite" className="mt-3 text-stone-700">
        {connection === 'checking' ? 'Checking connection…' : connection === 'connected' ? 'API connected. The app is ready for its next milestone.' : 'Unable to reach the API. Please try again.'}
      </p>
      <button type="button" onClick={retry} disabled={connection === 'checking'} className="mt-5 rounded-lg bg-emerald-900 px-5 py-3 font-medium text-white hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">
        {connection === 'checking' ? 'Checking…' : 'Check again'}
      </button>
    </div>
  </section>;
}
