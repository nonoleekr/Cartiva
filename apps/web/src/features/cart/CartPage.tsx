import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { useSession } from '../auth/useSession';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { HttpError } from '../../lib/http';
import { money } from '../../lib/money';
import { useRemote } from '../../lib/useRemote';
import { fetchCart, mutateCart } from './api';
import type { Cart, CartItem } from './api';

type Change = (action: 'replace' | 'remove', id: string, quantity?: number) => Promise<void>;

function CartLine({ item, busy, change }: { item: CartItem; busy: boolean; change: Change }) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [error, setError] = useState('');
  const unavailable = item.availability === 'UNAVAILABLE';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const next = Number(quantity);
    if (!Number.isInteger(next) || next < 1 || next > 99) { setError('Choose a whole quantity from 1 to 99.'); return; }
    await change('replace', item.productId, next);
  }
  return <article className="grid gap-4 border-t border-stone-200 py-6 sm:grid-cols-[144px_1fr]">
    <img src={item.imagePath} alt={item.productName} width={192} height={144} className="aspect-4/3 w-32 bg-stone-100 object-cover sm:w-36" />
    <div className="min-w-0"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-semibold text-emerald-950">{unavailable ? item.productName : <Link to={`/products/${item.slug}`} className="underline underline-offset-3">{item.productName}</Link>}</h2><strong>{money(item.lineTotalMinor)}</strong></div>
      <p className="mt-1 text-sm text-stone-600">{money(item.unitPriceMinor)} each</p>
      <p className={`mt-2 text-sm ${item.availability === 'AVAILABLE' ? 'text-emerald-800' : 'text-red-800'}`}>{unavailable ? 'No longer available. You can remove this item.' : item.availability === 'INSUFFICIENT_STOCK' ? `Only ${item.availableStock} available. Reduce the quantity or remove this item.` : 'In stock'}</p>
      <form onSubmit={submit} noValidate className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Quantity<input aria-label={`Quantity for ${item.productName}`} type="number" min={1} max={99} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={busy || unavailable || item.availableStock === 0} className="w-20 rounded border border-stone-400 px-3 py-2" /></label>
        <button disabled={busy || unavailable || item.availableStock === 0} className="rounded bg-emerald-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Update</button>
        <button type="button" aria-label={`Remove ${item.productName}`} disabled={busy} onClick={() => void change('remove', item.productId)} className="px-2 py-2 text-sm font-medium text-emerald-900 underline underline-offset-4 disabled:opacity-40">Remove</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
    </div>
  </article>;
}

function CartEditor({ initial, retry }: { initial: Cart; retry: () => void }) {
  const [cart, setCart] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { refresh } = useSession();
  const change: Change = async (action, productId, quantity = 1) => {
    setBusy(true); setError(''); setNotice('');
    try { setCart((await mutateCart(action, productId, quantity)).data); setNotice(action === 'remove' ? 'Item removed.' : 'Cart updated.'); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update cart.');
      if (reason instanceof HttpError && reason.status === 401) await refresh();
      else if (reason instanceof HttpError && reason.status === 409) {
        try { setCart((await fetchCart()).data); } catch { /* Keep the original error and let the user refresh explicitly. */ }
      }
    } finally { setBusy(false); }
  };
  return <>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-emerald-900">{busy ? 'Updating cart…' : notice}</p><button onClick={retry} disabled={busy} className="text-sm underline underline-offset-4 disabled:opacity-40">Refresh cart</button></div>
    {error && <p role="alert" className="mt-3 border-l-4 border-red-700 py-2 pl-4 text-red-800">{error}</p>}
    {!cart.items.length ? <div className="py-12"><h2 className="text-xl font-semibold">Your cart is empty</h2><p className="mt-3 text-stone-600">Find something for your desk, home or next trip.</p></div>
      : <div className="mt-6 grid items-start gap-8 lg:grid-cols-[2fr_1fr]">
        <div>{cart.items.map((item) => <CartLine key={`${item.productId}:${item.quantity}:${item.availableStock}:${item.availability}`} item={item} busy={busy} change={change} />)}</div>
        <aside aria-label="Cart summary" className="rounded border border-stone-300 p-6"><div className="flex justify-between gap-4 text-xl font-semibold"><h2>Subtotal</h2><p>{money(cart.subtotalMinor)}</p></div><p className="mt-2 text-sm text-stone-600">{cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'}</p><p className="mt-6 border-t border-stone-200 pt-5 text-sm leading-7 text-stone-600">Prices and availability may change. Items are not reserved.</p><Link to="/checkout" className="mt-4 inline-block rounded bg-emerald-900 px-4 py-2 font-semibold text-white">Simulated checkout</Link></aside>
      </div>}
    <Link to="/" className="my-8 inline-block rounded border border-emerald-900 px-5 py-3 font-semibold text-emerald-900">Continue shopping</Link>
  </>;
}

function CartContents({ retry }: { retry: () => void }) {
  const load = useCallback((signal: AbortSignal) => fetchCart(signal), []);
  const state = useRemote(load);
  if (state.status === 'loading') return <LoadingState message="Loading your cart…" />;
  if (state.status === 'error') return <ErrorState message={state.message} retry={retry} />;
  return <CartEditor initial={state.data.data} retry={retry} />;
}

export function CartPage() {
  const { user, status, refresh } = useSession();
  const [attempt, setAttempt] = useState(0);
  return <section className="py-8 sm:py-10"><h1 className="text-3xl font-bold tracking-tight text-emerald-950 sm:text-[40px]">Your cart</h1><p className="mt-3 leading-7 text-stone-600">Review quantities before your next step.</p>
    {status === 'loading' ? <LoadingState message="Checking your account…" /> : status === 'error' ? <ErrorState message="Unable to check your account. Please try again." retry={() => void refresh()} />
      : !user ? <div className="py-10"><h2 className="text-xl font-semibold">Sign in to view your cart</h2><p className="mt-3 text-stone-600">Your cart is saved to your account.</p><Link to="/sign-in?returnTo=%2Fcart" className="mt-6 inline-block rounded bg-emerald-900 px-5 py-3 font-semibold text-white">Sign in</Link></div>
        : <CartContents key={`${user.id}:${attempt}`} retry={() => setAttempt((value) => value + 1)} />}
  </section>;
}
