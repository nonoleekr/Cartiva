import { CustomerOrderDetail, CustomerOrderHistory } from './CustomerOrders';
import { shippingSchema } from './shipping';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useSession } from '../auth/useSession';
import { HttpError, requestJson } from '../../lib/http';
import { money } from '../../lib/money';
import { useRemote } from '../../lib/useRemote';
import { ErrorState, LoadingState } from '../../components/RequestState';

const line = z.object({ productId: z.uuid(), name: z.string(), quantity: z.number().int(), unitPriceMinor: z.number().int() });
const quoteSchema = z.object({ id: z.uuid(), totalMinor: z.number().int(), items: z.array(line), expiresAt: z.string() });
const wrap = <T extends z.ZodType>(data: T) => z.object({ data });
type Shipping = z.infer<typeof shippingSchema>;
type Quote = z.infer<typeof quoteSchema>;
type Intent = { quoteId: string; shipping: Shipping; saveShipping: boolean; key: string };

async function post<T extends z.ZodType>(path: string, schema: T, body: object, key?: string) {
  const { data } = await requestJson('/api/v1/csrf', wrap(z.object({ token: z.string() })));
  return requestJson(path, wrap(schema), { method: 'POST', body: JSON.stringify(body), headers: {
    'Content-Type': 'application/json', 'X-CSRF-Token': data.token, ...(key ? { 'Idempotency-Key': key } : {})
  } });
}

function Items({ items }: { items: z.infer<typeof line>[] }) {
  return <ul className="divide-y divide-stone-200">{items.map(item =>
    <li key={item.productId} className="flex justify-between gap-4 py-3">
      <span>{item.name} × {item.quantity}</span><span>{money(item.unitPriceMinor * item.quantity)}</span>
    </li>)}</ul>;
}

const button = 'rounded bg-emerald-900 px-4 py-2 font-semibold text-white disabled:opacity-50';

const loadSavedShipping = (signal: AbortSignal) =>
  requestJson('/api/v1/checkout/saved-shipping', wrap(shippingSchema.nullable()), { signal });

function CheckoutShipping() {
  const [attempt, setAttempt] = useState(0);
  return <ShippingLoader key={attempt} retry={() => setAttempt(value => value + 1)} />;
}

function ShippingLoader({ retry }: { retry: () => void }) {
  const result = useRemote(loadSavedShipping);
  const [manual, setManual] = useState(false);
  if (result.status === 'loading') return <LoadingState message="Loading shipping details…" />;
  if (result.status === 'error' && !manual) return <section className="space-y-4 py-10">
    <ErrorState message="Saved shipping is unavailable." retry={retry} />
    <button className={button} onClick={() => setManual(true)}>Enter shipping manually</button>
  </section>;
  return <CheckoutForm saved={result.status === 'ready' ? result.data.data : null} />;
}

function CheckoutForm({ saved }: { saved: Shipping | null }) {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote>();
  const [intent, setIntent] = useState<Intent>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const shipping = {
      recipientName: String(form.get('recipientName')), addressLine1: String(form.get('addressLine1')),
      city: String(form.get('city')), postalCode: String(form.get('postalCode')), country: 'MY' as const
    };
    setBusy(true);
    setError('');
    try {
      const { data } = await post('/api/v1/checkout/quotes', quoteSchema, {});
      setQuote(data);
      setIntent({ quoteId: data.id, shipping, saveShipping: form.get('saveShipping') === 'on', key: crypto.randomUUID() });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to review checkout.');
    } finally { setBusy(false); }
  }

  async function place() {
    if (!intent || busy) return;
    setBusy(true);
    setError('');
    try {
      const { key, ...body } = intent;
      const { data } = await post('/api/v1/orders', z.object({ id: z.uuid() }), body, key);
      navigate('/orders/' + data.id, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to place the order.');
      if (reason instanceof HttpError && reason.status === 409) {
        setQuote(undefined);
        setIntent(undefined);
      }
    } finally { setBusy(false); }
  }

  return <section className="max-w-2xl space-y-5 py-10">
    <h1 className="text-3xl font-semibold">Simulated checkout</h1>
    <p>Use fictional shipping details. No payment is collected.</p>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    <form onSubmit={review} className="grid gap-3" hidden={Boolean(quote)}>
      <fieldset disabled={busy} className="grid gap-3">
        {Object.entries({ recipientName: 'Recipient', addressLine1: 'Address', city: 'City', postalCode: 'Postcode' } as const).map(([name, label]) =>
          <label key={name} className="grid gap-1">{label}<input name={name} defaultValue={saved?.[name as Exclude<keyof Shipping, 'country'>] ?? ''} required maxLength={name === 'postalCode' ? 5 : 120}
            pattern={name === 'postalCode' ? '[0-9]{5}' : undefined} className="rounded border border-stone-400 p-2" /></label>)}
        <p>Country: Malaysia</p>
        {saved && <p className="text-sm text-stone-600">Your saved shipping details are prefilled. You can edit them for this order.</p>}
        <label className="flex items-center gap-2"><input type="checkbox" name="saveShipping" /> Save this address for future orders</label>
        <button className={button}>Review order</button>
      </fieldset>
    </form>
    {quote && intent && <div className="space-y-4">
      <h2 className="text-xl font-semibold">Review your order</h2>
      <Items items={quote.items} />
      <p>{intent.shipping.recipientName}, {intent.shipping.addressLine1}, {intent.shipping.postalCode} {intent.shipping.city}, Malaysia</p>
      {intent.saveShipping && <p>This address will be saved when the order is placed.</p>}
      <p className="font-semibold">Total {money(quote.totalMinor)}</p>
      <p>Review expires at {new Date(quote.expiresAt).toLocaleTimeString()}.</p>
      <div className="flex flex-wrap gap-4">
        <button className={button} disabled={busy} onClick={() => void place()}>{busy ? 'Placing…' : 'Place simulated order'}</button>
        <button className="underline" disabled={busy} onClick={() => { setQuote(undefined); setIntent(undefined); setError(''); }}>Edit shipping</button>
      </div>
    </div>}
    <Link to="/cart" className="underline">Back to cart</Link>
  </section>;
}

export function CheckoutScreen({ mode }: { mode: 'checkout' | 'history' | 'order' }) {
  const { user, status, refresh } = useSession();
  const { id = '' } = useParams();
  if (status === 'loading') return <LoadingState message="Checking your account…" />;
  if (status === 'error') return <ErrorState message="Unable to check your account." retry={() => void refresh()} />;
  const path = mode === 'checkout' ? '/checkout' : mode === 'history' ? '/orders' : '/orders/' + id;
  if (!user) return <p className="py-10"><Link className="underline" to={'/sign-in?returnTo=' + encodeURIComponent(path)}>Sign in to continue</Link></p>;
  if (mode === 'checkout') return <CheckoutShipping key={user.id} />;
  if (mode === 'history') return <CustomerOrderHistory key={user.id} />;
  return <CustomerOrderDetail key={user.id + ':' + id} id={id} />;
}
