import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Product } from '../catalog/api';
import { useSession } from '../auth/useSession';
import { HttpError } from '../../lib/http';
import { mutateCart } from './api';

function AddForm({ product, withQuantity }: { product: Product; withQuantity: boolean }) {
  const { user, status, refresh } = useSession();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const returnTo = `/sign-in?returnTo=${encodeURIComponent(`/products/${product.slug}`)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(''); setError('');
    if (!user) { navigate(returnTo); return; }
    const desired = Number(quantity);
    if (!Number.isInteger(desired) || desired < 1 || desired > 99) { setError('Choose a whole quantity from 1 to 99.'); return; }
    setBusy(true);
    try { await mutateCart('add', product.id, desired); setNotice('Added to your cart.'); }
    catch (reason) {
      if (reason instanceof HttpError && reason.status === 401) { await refresh(); navigate(returnTo); }
      else setError(reason instanceof Error ? reason.message : 'Unable to add this item. Please try again.');
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} noValidate className="mt-2">
    {withQuantity && <label className="mb-4 grid max-w-32 gap-2 text-sm font-medium">Quantity<input type="number" min={1} max={99} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={busy || product.stockQuantity < 1} className="rounded border border-stone-400 px-3 py-2" /></label>}
    <button type="submit" aria-label={`Add ${product.name} to cart`} disabled={busy || status === 'loading' || product.stockQuantity < 1} className="w-full rounded bg-emerald-900 px-3 py-2 text-sm font-semibold leading-5 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Adding…' : product.stockQuantity > 0 ? 'Add to cart' : 'Out of stock'}</button>
    {notice && <p role="status" className="mt-2 text-sm text-emerald-900">{notice} <Link to="/cart" className="font-semibold underline">View cart</Link></p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
  </form>;
}

export function AddToCart({ product, withQuantity = false }: { product: Product; withQuantity?: boolean }) {
  const { user } = useSession();
  return <AddForm key={user?.id ?? 'guest'} product={product} withQuantity={withQuantity} />;
}
