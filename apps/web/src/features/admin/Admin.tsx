import { useCallback, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useSession } from '../auth/useSession';
import { requestJson } from '../../lib/http';
import { useRemote } from '../../lib/useRemote';
import { money } from '../../lib/money';
import { ErrorState, LoadingState } from '../../components/RequestState';

const category = z.object({ id: z.uuid(), name: z.string(), slug: z.string() });
const product = category.extend({
  categoryId: z.uuid(), description: z.string(), imagePath: z.string(), priceMinor: z.number(),
  stockQuantity: z.number(), status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']), version: z.number()
});
const statuses = ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;
const order = z.object({ id: z.uuid(), status: z.enum(statuses), totalMinor: z.number(), version: z.number(), createdAt: z.string() });
const orderDetail = order.extend({
  items: z.array(z.object({ productId: z.uuid(), name: z.string(), quantity: z.number(), unitPriceMinor: z.number() })),
  shipping: z.object({ recipientName: z.string(), addressLine1: z.string(), city: z.string(), postalCode: z.string(), country: z.string() })
});
const envelope = <T extends z.ZodType>(data: T) => z.object({ data });
const pagination = <T extends z.ZodType>(entry: T) => z.object({ items: z.array(entry), hasNext: z.boolean() });
const root = '/api/v1/admin/';
const button = 'rounded bg-emerald-900 px-4 py-2 font-semibold text-white disabled:opacity-50';
const input = 'w-full rounded border border-stone-400 bg-white p-2';

async function write(path: string, method: string, body: object) {
  const csrf = await requestJson('/api/v1/csrf', envelope(z.object({ token: z.string() })));
  return requestJson(root + path, z.unknown(), {
    method, body: JSON.stringify(body), headers: {
      'Content-Type': 'application/json', 'X-CSRF-Token': csrf.data.token
    }
  });
}

function useWrite(refresh: () => void) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function save(path: string, method: string, body: object) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await write(path, method, body);
      setMessage('Saved.');
      refresh();
      return { response };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save.');
      return null;
    } finally { setBusy(false); }
  }
  return { busy, save, feedback: <>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {message && <p role="status" className="text-emerald-900">{message}</p>}
  </> };
}

function Field({ label, name, value, type = 'text', min, maxLength }: {
  label: string; name: string; value?: string | number; type?: string; min?: number; maxLength?: number;
}) {
  return <label className="grid gap-1">{label}<input className={input} name={name} defaultValue={value}
    type={type} min={min} maxLength={maxLength} required /></label>;
}

function Remote<T>({ path, schema, children }: { path: string; schema: z.ZodType<T>; children: (data: T, refresh: () => void) => ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  return <RemoteContent key={path + ':' + attempt} path={path} schema={schema} refresh={() => setAttempt(value => value + 1)}>{children}</RemoteContent>;
}
function RemoteContent<T>({ path, schema, children, refresh }: {
  path: string; schema: z.ZodType<T>; children: (data: T, refresh: () => void) => ReactNode; refresh: () => void;
}) {
  const load = useCallback((signal: AbortSignal) => requestJson(root + path, envelope(schema), { signal }), [path, schema]);
  const result = useRemote(load);
  if (result.status === 'loading') return <LoadingState message="Loading records…" />;
  if (result.status === 'error') return <ErrorState message={result.message} retry={refresh} />;
  return children(result.data.data, refresh);
}

type Category = z.infer<typeof category>;
type Product = z.infer<typeof product>;
const categoriesSchema = z.array(category);
const productsPage = pagination(product);
const ordersPage = pagination(order);

function ProductEditor({ item, categories, refresh }: { item?: Product; categories: Category[]; refresh: () => void }) {
  const navigate = useNavigate();
  const { busy, save, feedback } = useWrite(refresh);
  const path = item ? 'products/' + item.id : 'products';
  const archived = item?.status === 'ARCHIVED';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      name: String(form.get('name')), slug: String(form.get('slug')), categoryId: String(form.get('categoryId')),
      description: String(form.get('description')), imagePath: String(form.get('imagePath')), priceMinor: Number(form.get('priceMinor'))
    };
    if (item) {
      const status = String(form.get('status'));
      await save(path, 'PATCH', { ...data, expectedVersion: item.version, ...(status === item.status ? {} : { status }) });
    } else {
      const result = await save(path, 'POST', { ...data, initialStock: Number(form.get('initialStock')) });
      if (result) {
        const created = envelope(product).safeParse(result.response);
        if (created.success) navigate('/admin/products/' + created.data.data.id);
      }
    }
  }
  return <div className="max-w-2xl space-y-4">
    <h2 className="text-xl font-semibold">{item ? item.name : 'New draft product'}</h2>
    {categories.length === 0 && <p>Create a category before adding a product.</p>}
    {feedback}
    <form onSubmit={submit}>
      <fieldset disabled={busy || archived || !categories.length} className="grid gap-3">
        <Field label="Name" name="name" value={item?.name ?? ''} maxLength={160} />
        <Field label="Slug" name="slug" value={item?.slug ?? ''} maxLength={180} />
        <label className="grid gap-1">Category<select className={input} name="categoryId" aria-label="Category" required defaultValue={item?.categoryId ?? ''}>
          <option value="" disabled>Select a category</option>
          {categories.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select></label>
        <label className="grid gap-1">Description<textarea className={input} name="description" required maxLength={5000} defaultValue={item?.description} /></label>
        <Field label="Image path" name="imagePath" value={item?.imagePath ?? '/assets/catalog-placeholder.svg'} />
        <Field label="Price (sen)" name="priceMinor" type="number" min={0} value={item?.priceMinor ?? 0} />
        {item ? <label className="grid gap-1">Status<select name="status" aria-label="Status" className={input} defaultValue={item.status}>
          <option value="DRAFT">Draft</option><option value="ACTIVE">Active</option>
          {archived && <option value="ARCHIVED">Archived</option>}
        </select></label> : <Field label="Initial stock" name="initialStock" type="number" min={0} value={0} />}
        {!archived && <button className={button}>{item ? 'Save product' : 'Create draft'}</button>}
      </fieldset>
    </form>
    {item && <p>Stock {item.stockQuantity} · Version {item.version}</p>}
    {item && !archived && <>
      <form className="space-y-2 border-t border-stone-200 pt-4" onSubmit={event => {
        event.preventDefault();
        const delta = Number(new FormData(event.currentTarget).get('delta'));
        void save(path + '/inventory-adjustments', 'POST', { delta, expectedVersion: item.version });
      }}>
        <Field label="Stock change (positive or negative)" name="delta" type="number" />
        <button className={button} disabled={busy}>Adjust stock</button>
      </form>
      <button type="button" disabled={busy} className="text-red-800 underline" onClick={() => {
        if (window.confirm('Archive this product and remove it from the shop?')) {
          void save(path, 'DELETE', { expectedVersion: item.version });
        }
      }}>Archive product</button>
    </>}
  </div>;
}

function CategoryEditor({ entry, refresh }: { entry?: Category; refresh: () => void }) {
  const { busy, save, feedback } = useWrite(refresh);
  const path = entry ? 'categories/' + entry.id : 'categories';
  return <div className="space-y-2 border-t border-stone-200 py-4">
    <h2 className="font-semibold">{entry?.name ?? 'New category'}</h2>
    {feedback}
    <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void save(path, entry ? 'PATCH' : 'POST', { name: String(form.get('name')), slug: String(form.get('slug')) });
    }}>
      <Field label="Name" name="name" value={entry?.name ?? ''} maxLength={100} />
      <Field label="Slug" name="slug" value={entry?.slug ?? ''} maxLength={120} />
      <button disabled={busy} className={button}>{entry ? 'Save category' : 'Create category'}</button>
    </form>
    {entry && <button disabled={busy} className="text-red-800 underline" onClick={() => {
      if (window.confirm('Delete this category?')) void save(path, 'DELETE', {});
    }}>Delete category</button>}
  </div>;
}

function Fulfillment({ record, refresh }: { record: z.infer<typeof orderDetail>; refresh: () => void }) {
  const { busy, save, feedback } = useWrite(refresh);
  const next = statuses[statuses.indexOf(record.status) + 1];
  const address = record.shipping;
  return <div className="max-w-2xl space-y-4">
    <h2 className="break-all text-xl font-semibold">Order {record.id}</h2>
    <p>{record.status} · {money(record.totalMinor)}</p>
    <p>{address.recipientName}, {address.addressLine1}, {address.postalCode} {address.city}, {address.country}</p>
    <ul>{record.items.map(item => <li key={item.productId}>{item.name} × {item.quantity} · {money(item.unitPriceMinor * item.quantity)}</li>)}</ul>
    {feedback}
    {next && <button disabled={busy} className={button} onClick={() => void save('orders/' + record.id + '/status', 'PATCH', {
      status: next, expectedVersion: record.version
    })}>Mark {next.toLowerCase()}</button>}
  </div>;
}

function Pages({ page, hasNext, status }: { page: number; hasNext: boolean; status?: string }) {
  function url(target: number) {
    const query = new URLSearchParams({ page: String(target) });
    if (status) query.set('status', status);
    return '?' + query;
  }
  return <nav aria-label="Admin pages" className="mt-4 flex gap-4">
    {page > 1 && <Link className="underline" to={url(page - 1)}>Previous</Link>}
    <span>Page {page}</span>
    {hasNext && page < 99999 && <Link className="underline" to={url(page + 1)}>Next</Link>}
  </nav>;
}

type Mode = 'products' | 'product' | 'create' | 'categories' | 'orders' | 'order';
function AdminContent({ mode }: { mode: Mode }) {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page') ?? '1';
  const page = /^[1-9][0-9]{0,4}$/.test(rawPage) ? Number(rawPage) : 1;
  const status = z.enum(statuses).safeParse(params.get('status')).data ?? '';

  if (mode === 'categories') return <Remote path="categories" schema={categoriesSchema}>{(items, refresh) => <>
    <CategoryEditor refresh={refresh} />
    {items.map(entry => <CategoryEditor key={entry.id} entry={entry} refresh={refresh} />)}
  </>}</Remote>;
  if (mode === 'create' || mode === 'product') return <Remote path="categories" schema={categoriesSchema}>{(categories, refresh) =>
    mode === 'create' ? <ProductEditor categories={categories} refresh={refresh} /> :
      <Remote path={'products/' + encodeURIComponent(id)} schema={product}>{(item, reload) =>
        <><button className="mb-3 underline" onClick={reload}>Reload product</button><ProductEditor item={item} categories={categories} refresh={reload} /></>
      }</Remote>
  }</Remote>;
  if (mode === 'products') return <>
    <Link className="underline" to="/admin/products/new">New product</Link>
    <Remote path={'products?page=' + page} schema={productsPage}>{data => <>
      {!data.items.length && <p>No products on this page.</p>}
      <ul className="mt-4 divide-y divide-stone-200">{data.items.map(item => <li key={item.id} className="py-2">
        <Link className="underline" to={'/admin/products/' + item.id}>{item.name}</Link> · {item.status} · {item.stockQuantity} in stock
      </li>)}</ul>
      <Pages page={page} hasNext={data.hasNext} />
    </>}</Remote>
  </>;
  if (mode === 'order') return <Remote path={'orders/' + encodeURIComponent(id)} schema={orderDetail}>{(record, refresh) =>
    <><button className="mb-3 underline" onClick={refresh}>Reload order</button><Fulfillment record={record} refresh={refresh} /></>
  }</Remote>;
  return <>
    <label className="grid max-w-xs gap-1">Status filter<select className={input} aria-label="Status filter" value={status} onChange={event => {
      setParams(event.target.value ? { status: event.target.value } : {});
    }}>
      <option value="">All statuses</option>
      {statuses.map(stage => <option key={stage}>{stage}</option>)}
    </select></label>
    <Remote path={'orders?page=' + page + (status ? '&status=' + status : '')} schema={ordersPage}>{data => <>
      {!data.items.length && <p className="mt-4">No orders on this page.</p>}
      <ul className="mt-4 divide-y divide-stone-200">{data.items.map(item => <li key={item.id} className="py-2">
        <Link className="underline" to={'/admin/orders/' + item.id}>{new Date(item.createdAt).toLocaleString()}</Link> · {item.status} · {money(item.totalMinor)}
      </li>)}</ul>
      <Pages page={page} hasNext={data.hasNext} status={status} />
    </>}</Remote>
  </>;
}

export function Admin({ mode }: { mode: Mode }) {
  const { user, status, refresh } = useSession();
  if (status === 'loading') return <LoadingState message="Checking your account…" />;
  if (status === 'error') return <ErrorState message="Unable to check your account." retry={() => void refresh()} />;
  if (!user) return <p className="py-10"><Link className="underline" to="/sign-in?returnTo=%2Fadmin">Sign in as an administrator</Link></p>;
  if (user.role !== 'ADMIN') return <p role="alert" className="py-10">Administrator access is required.</p>;
  return <section className="space-y-5 py-10">
    <h1 className="text-3xl font-semibold text-emerald-950">Store administration</h1>
    <nav aria-label="Administration" className="flex flex-wrap gap-4">
      <Link className="underline" to="/admin/products">Products</Link>
      <Link className="underline" to="/admin/categories">Categories</Link>
      <Link className="underline" to="/admin/orders">Orders</Link>
    </nav>
    <AdminContent key={user.id + ':' + mode} mode={mode} />
  </section>;
}
