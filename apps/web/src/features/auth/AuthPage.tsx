import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { authenticate } from './api';
import { useSession } from './useSession';

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { user, status, refresh } = useSession();
  const [params] = useSearchParams();
  const requested = params.get('returnTo') ?? '';
  const returnTo = requested === '/cart' || /^\/products\/[a-z0-9-]+$/.test(requested) ? requested : '/account';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'sign-up';
  if (user) return <Navigate to={returnTo} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const input = { email: String(values.get('email')).trim(), password: String(values.get('password')),
        ...(signup ? { name: String(values.get('name')).trim() } : {}) };
      await authenticate(signup ? 'sign-up/email' : 'sign-in/email', input);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to continue.'); }
    finally { setBusy(false); }
  }

  return <section className="max-w-md py-12 sm:py-20">
    <h1 className="text-3xl font-semibold tracking-tight">{signup ? 'Create your account' : 'Welcome back'}</h1>
    <p className="mt-4 leading-7 text-stone-600">{signup ? 'Create a customer account to save your Cartiva cart.' : 'Sign in to your Cartiva account.'}</p>
    {status === 'error' && <p role="alert" className="mt-4 text-red-800">Session check unavailable. You can still try signing in.</p>}
    <form onSubmit={submit} className="mt-8 grid gap-5">
      {signup && <label className="grid gap-2 font-medium">Name<input name="name" autoComplete="name" required maxLength={100} className="rounded-lg border border-stone-300 px-3 py-3 font-normal" /></label>}
      <label className="grid gap-2 font-medium">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className="rounded-lg border border-stone-300 px-3 py-3 font-normal" /></label>
      <label className="grid gap-2 font-medium">Password<input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 12 : 1} maxLength={128} aria-describedby={signup ? 'password-help' : undefined} className="rounded-lg border border-stone-300 px-3 py-3 font-normal" /></label>
      {signup && <p id="password-help" className="text-sm text-stone-600">Use 12–128 characters. This demo does not offer password recovery yet.</p>}
      {error && <p role="alert" className="text-red-800">{error}</p>}
      <button disabled={busy || status === 'loading'} className="rounded-lg bg-emerald-900 px-5 py-3 font-medium text-white disabled:opacity-60">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
    </form>
    <p className="mt-6 text-sm"><Link className="font-medium text-emerald-900 underline underline-offset-4" to={`${signup ? '/sign-in' : '/sign-up'}?returnTo=${encodeURIComponent(returnTo)}`}>{signup ? 'Already registered? Sign in' : 'New here? Create an account'}</Link></p>
  </section>;
}
