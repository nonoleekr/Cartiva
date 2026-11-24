import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import { Pagination } from '../../components/Pagination';
import { ErrorState, LoadingState } from '../../components/RequestState';
import { requestJson } from '../../lib/http';
import { money } from '../../lib/money';
import { useRemote } from '../../lib/useRemote';
import { shippingSchema } from './shipping';

const stages = ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const date = (value: string) => new Date(value).toLocaleDateString();
const summary = z.object({ id: z.uuid(), totalMinor: z.number().int(), status: z.enum(stages), createdAt: z.string() });
const history = z.object({ data: z.object({ items: z.array(summary.extend({ itemCount: z.number().int() })), page: z.number().int(), hasNext: z.boolean() }) });
const detail = z.object({ data: summary.extend({
  shipping: shippingSchema,
  items: z.array(z.object({ productId: z.uuid(), name: z.string(), quantity: z.number().int(), unitPriceMinor: z.number().int() }))
}) });
const statusColors = { PLACED: 'bg-blue-100 text-blue-900', PROCESSING: 'bg-amber-100 text-amber-900',
  SHIPPED: 'bg-indigo-100 text-indigo-900', DELIVERED: 'bg-emerald-100 text-emerald-900' };
const badge = 'inline-block rounded-full px-3 py-1 text-xs font-semibold';
const action = 'inline-flex rounded border border-emerald-700 px-3 py-2 font-semibold text-emerald-900 hover:bg-emerald-50';
function Status({ value }: { value: typeof stages[number] }) {
  return <span className={badge + ' ' + statusColors[value]}>{value[0] + value.slice(1).toLowerCase()}</span>;
}
function Payment() { return <span className={badge + ' bg-slate-100 text-slate-800'}>Simulated · No charge</span>; }

export function CustomerOrderHistory() {
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState('');
  return <section className="space-y-5 py-10">
    <h1 className="text-3xl font-semibold">My Orders</h1>
    <form key={params.toString()} className="flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const q = String(form.get('q')).trim();
      if (q && !z.uuid().safeParse(q).success) { setError('Enter the full order ID from your order details.'); return; }
      setError('');
      const query = new URLSearchParams();
      if (q) query.set('q', q);
      const status = String(form.get('status'));
      if (status) query.set('status', status);
      setParams(query);
    }}>
      <label className="grid flex-1 gap-1 sm:flex-none">Order ID<input name="q" type="search" maxLength={36}
        defaultValue={params.get('q') ?? ''} aria-describedby={error ? 'order-search-error' : undefined}
        className="min-w-0 rounded border border-stone-400 p-2" /></label>
      <label className="grid gap-1">Status<select aria-label="Status" name="status" defaultValue={params.get('status') ?? ''}
        className="rounded border border-stone-400 p-2"><option value="">All statuses</option>
        {stages.map(stage => <option key={stage} value={stage}>{stage[0] + stage.slice(1).toLowerCase()}</option>)}</select></label>
      <button className={action}>Apply filters</button>
      {(params.has('q') || params.has('status')) && <button type="button" className={action} onClick={() => { setError(''); setParams({}); }}>Clear filters</button>}
    </form>
    {error && <p id="order-search-error" role="alert" className="text-red-800">{error}</p>}
    <HistoryResults key={params.toString()} query={params.toString()} update={setParams} />
  </section>;
}

function HistoryResults({ query, update }: { query: string; update: (params: URLSearchParams) => void }) {
  const [attempt, setAttempt] = useState(0);
  return <HistoryPage key={attempt} query={query} update={update} retry={() => setAttempt(value => value + 1)} />;
}
function HistoryPage({ query, update, retry }: { query: string; update: (params: URLSearchParams) => void; retry: () => void }) {
  const load = useCallback((signal: AbortSignal) => requestJson('/api/v1/orders?' + query, history, { signal }), [query]);
  const result = useRemote(load);
  if (result.status === 'loading') return <LoadingState message="Loading orders…" />;
  if (result.status === 'error') return <ErrorState message={result.message} retry={retry} />;
  const { items, page, hasNext } = result.data.data;
  const params = new URLSearchParams(query);
  return <>
    {!items.length ? <p role="status">{params.has('q') || params.has('status') ? 'No orders match these filters.' : 'No orders on this page.'}</p> :
      <div className="overflow-x-auto rounded border border-stone-200" tabIndex={0} role="region" aria-label="Order history results">
        <table className="w-full whitespace-nowrap text-left text-sm [&_td]:border-t [&_td]:border-stone-200 [&_td]:p-3 [&_th]:p-3">
          <thead className="bg-stone-100"><tr>{['Order ID', 'Order date', 'Items', 'Total amount', 'Payment status', 'Order status', 'Actions'].map(name =>
            <th key={name} scope="col">{name}</th>)}</tr></thead>
          <tbody>{items.map(order => <tr key={order.id}>
            <td className="font-mono" title={order.id}>#{order.id.slice(0, 8)}</td><td>{date(order.createdAt)}</td>
            <td>{order.itemCount}</td><td>{money(order.totalMinor)}</td><td><Payment /></td><td><Status value={order.status} /></td>
            <td><Link className={action} to={'/orders/' + order.id}>View Details</Link></td>
          </tr>)}</tbody>
        </table>
      </div>}
    <Pagination label="Order pages" page={page} hasNext={hasNext && page < 99999} change={next => {
      params.set('page', String(next)); update(params);
    }} />
  </>;
}

export function CustomerOrderDetail({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  return <OrderDetail key={attempt} id={id} retry={() => setAttempt(value => value + 1)} />;
}
function OrderDetail({ id, retry }: { id: string; retry: () => void }) {
  const load = useCallback((signal: AbortSignal) => requestJson('/api/v1/orders/' + encodeURIComponent(id), detail, { signal }), [id]);
  const result = useRemote(load);
  if (result.status === 'loading') return <LoadingState message="Loading order…" />;
  if (result.status === 'error') return <ErrorState message={result.message} retry={retry} />;
  const order = result.data.data;
  const shipping = order.shipping;
  return <section className="max-w-3xl space-y-5 py-10">
    <Link className={action} to="/orders">← My Orders</Link>
    <h1 className="text-3xl font-semibold">Order details</h1>
    <p className="break-all font-mono">{order.id}</p>
    <div className="flex flex-wrap items-center gap-3"><time dateTime={order.createdAt}>{date(order.createdAt)}</time>
      <Status value={order.status} /><Payment /></div>
    <h2 className="text-xl font-semibold">Items purchased</h2>
    <ul className="divide-y divide-stone-200">{order.items.map(item =>
      <li key={item.productId} className="flex justify-between gap-3 py-2"><span>{item.name} × {item.quantity}</span>
        <span>{money(item.unitPriceMinor * item.quantity)}</span></li>)}</ul>
    <h2 className="text-xl font-semibold">Shipping address</h2>
    <p>{shipping.recipientName}, {shipping.addressLine1}, {shipping.postalCode} {shipping.city}, Malaysia</p>
    <dl className="grid grid-cols-[1fr_auto] gap-2 rounded border border-stone-200 p-4">
      <dt>Subtotal</dt><dd>{money(order.totalMinor)}</dd><dt>Shipping</dt><dd>{money(0)}</dd>
      <dt>Tax</dt><dd>{money(0)}</dd><dt className="font-bold">Total</dt><dd className="font-bold">{money(order.totalMinor)}</dd>
    </dl>
  </section>;
}
