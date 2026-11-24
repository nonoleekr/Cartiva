import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { authenticate } from './api';
import { useSession } from './useSession';

export function AccountPage() {
  const { user, status, refresh } = useSession();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (status === 'loading') return <p role="status" className="py-16">Checking your session…</p>;
  if (status === 'error') return <section className="py-16"><h1 className="text-3xl font-semibold">Account unavailable</h1><p className="mt-4">We could not verify your session.</p><button className="mt-4 underline" onClick={() => void refresh()}>Try again</button></section>;
  if (!user) return <Navigate to="/sign-in" replace />;

  async function logout() {
    setBusy(true); setError('');
    try { await authenticate('sign-out', {}); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign out failed.'); }
    finally { setBusy(false); }
  }

  return <section className="max-w-xl py-12 sm:py-20">
    <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
    <p role="status" className="mt-5 text-lg">Signed in as {user.name}.</p>
    <dl className="mt-8 grid gap-4 border-y border-stone-200 py-6"><div><dt className="text-sm text-stone-500">Email</dt><dd className="mt-1 break-words">{user.email}</dd></div><div><dt className="text-sm text-stone-500">Role</dt><dd className="mt-1">{user.role === 'ADMIN' ? 'Administrator' : 'Customer'}</dd></div></dl>
    <p className="mt-6 leading-7 text-stone-600">Email verification and password recovery are not available in this demo. Your cart is saved to your account. Checkout and orders are simulated.</p>
    <div className="mt-4 flex flex-wrap gap-4">
      {user.role === 'ADMIN' && <Link className="underline" to="/admin">Store administration</Link>}
    </div>
    {error && <p role="alert" className="mt-4 text-red-800">{error}</p>}
    <button disabled={busy} onClick={() => void logout()} className="mt-6 rounded-lg bg-emerald-900 px-5 py-3 font-medium text-white disabled:opacity-60">{busy ? 'Signing out…' : 'Sign out'}</button>
  </section>;
}
