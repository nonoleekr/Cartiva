import { ProductStatusControl } from './ProductStatusControl';
import { Pagination } from '../../components/Pagination';
import { useCallback, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, NavLink, useNavigate, useParams, useSearchParams } from 'react-router';
import { z } from 'zod';
import { useSession } from '../auth/useSession';
import { requestJson } from '../../lib/http';
import { useRemote } from '../../lib/useRemote';
import { money } from '../../lib/money';
import { ErrorState, LoadingState } from '../../components/RequestState';

const category = z.object({ id: z.uuid(), name: z.string(), slug: z.string() });
const product = category.extend({
  categoryId: z.uuid(), category: z.object({ name: z.string() }).optional(), description: z.string(), imagePath: z.string(), priceMinor: z.number(),
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
const button = 'admin-primary';
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

function Field({ label, name, value, type = 'text', min, max, maxLength }: {
  label: string; name: string; value?: string | number; type?: string; min?: number; max?: number; maxLength?: number;
}) {
  return <label className="grid gap-1">{label}<input className={input} name={name} defaultValue={value}
    type={type} min={min} max={max} maxLength={maxLength} required /></label>;
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
const ordersPage = pagination(order).extend({ counts: z.record(z.enum(statuses), z.number().int()) });
const fallbackImage = '/assets/catalog-placeholder.svg';

function assetPath(value: string) {
  try {
    const url = new URL(value.trim(), location.origin);
    return url.origin === location.origin && !url.search && !url.hash &&
      /^\/assets\/[a-zA-Z0-9/_-]+\.(svg|png|jpg|webp)$/.test(url.pathname) ? url.pathname : '';
  } catch { return ''; }
}

function ImagePreview({ value, compact = false }: { value: string; compact?: boolean }) {
  const path = assetPath(value);
  const [failed, setFailed] = useState(false);
  const invalid = Boolean(value.trim()) && !path;
  return <figure className={compact ? 'admin-thumbnail' : 'space-y-2'}>
    <div className={compact ? 'admin-image-box admin-thumb-box' : 'admin-image-box'}>
      <img src={path && !failed ? path : fallbackImage} alt={compact ? '' : 'Product image preview'}
        onError={() => { if (path && !failed) setFailed(true); }} />
    </div>
    {!compact && <figcaption aria-live="polite" className={invalid || failed ? 'text-sm text-red-800' : 'text-sm text-slate-600'}>
      {invalid ? 'Enter a supported asset path or a URL on this storefront.' : failed ? 'This image could not be loaded.' : path ? 'Product image preview' : 'No image entered. The catalog placeholder will be used.'}
    </figcaption>}
  </figure>;
}

const labels: Record<string, string> = {
  PLACED: 'Placed', PROCESSING: 'Processing', SHIPPED: 'Shipped', DELIVERED: 'Delivered',
  DRAFT: 'Draft', ACTIVE: 'Active', ARCHIVED: 'Archived', out: 'Out of stock', low: 'Low stock', healthy: 'In stock'
};

function Badge({ status }: { status: string }) {
  return <span className="admin-badge" data-status={status}>{labels[status] ?? status}</span>;
}

function OrderStats({ counts }: { counts: z.infer<typeof ordersPage>['counts'] }) {
  return <div className="admin-stats" aria-label="All store orders by status">
    {statuses.map(stage => <div className="admin-panel" key={stage}>
      <Badge status={stage} />
      <p className="mt-2 text-3xl font-bold tabular-nums">{counts[stage]}</p>
    </div>)}
  </div>;
}

function FilterSelect({ name, label, value, options }: {
  name: string; label: string; value: string; options: [string, string][];
}) {
  return <label className="grid gap-1 text-sm font-medium">{label}<select className={input} name={name} aria-label={label} defaultValue={value}>
    {options.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
  </select></label>;
}

function ListFilters({ orders, params, categories, apply }: {
  orders: boolean; params: URLSearchParams; categories: Category[]; apply: (query: URLSearchParams) => void;
}) {
  const [reset, setReset] = useState(0);
  const orderSort: [string, string][] = [['newest', 'Newest'], ['oldest', 'Oldest'], ['total', 'Highest total']];
  const productSort: [string, string][] = [['name', 'Name'], ['newest', 'Newest'], ['price', 'Lowest price'], ['stock', 'Lowest stock']];
  const choices = orders ? statuses : ['DRAFT', 'ACTIVE', 'ARCHIVED'];
  return <form key={reset} className="admin-panel admin-filters" onSubmit={event => {
    event.preventDefault();
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === 'string' && value.trim()) query.set(key, value.trim());
    }
    apply(query);
  }}>
    <label className="grid gap-1 text-sm font-medium">Search<input className={input} name="q" type="search" maxLength={120}
      defaultValue={params.get('q') ?? ''} placeholder={orders ? 'Order ID or recipient' : 'Product name or slug'} /></label>
    <FilterSelect name="status" label="Status" value={params.get('status') ?? ''}
      options={[[ '', 'All statuses'], ...choices.map((value): [string, string] => [value, labels[value]!])]} />
    {!orders && <>
      <FilterSelect name="category" label="Category" value={params.get('category') ?? ''}
        options={[[ '', 'All categories'], ...categories.map((entry): [string, string] => [entry.id, entry.name])]} />
      <FilterSelect name="stock" label="Stock" value={params.get('stock') ?? ''}
        options={[[ '', 'All stock levels'], ['out', 'Out of stock'], ['low', 'Low stock'], ['healthy', 'In stock']]} />
    </>}
    <FilterSelect name="sort" label="Sort by" value={params.get('sort') ?? (orders ? 'newest' : 'name')}
      options={orders ? orderSort : productSort} />
    <div className="flex items-center gap-3">
      <button className={button}>Apply filters</button>
      <button type="button" className="admin-secondary" onClick={() => {
        apply(new URLSearchParams());
        setReset(value => value + 1);
      }}>Reset</button>
    </div>
  </form>;
}

function ProductEditor({ item, categories, refresh }: { item?: Product; categories: Category[]; refresh: () => void }) {
  const navigate = useNavigate();
  const { busy, save, feedback } = useWrite(refresh);
  const path = item ? 'products/' + item.id : 'products';
  const archived = item?.status === 'ARCHIVED';
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE'>(item?.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT');
  const [image, setImage] = useState(item?.imagePath ?? '');
  const imagePath = assetPath(image);
  const invalidImage = Boolean(image.trim()) && !imagePath;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = {
      name: String(form.get('name')), slug: String(form.get('slug')), categoryId: String(form.get('categoryId')),
      description: String(form.get('description')), imagePath: imagePath || fallbackImage, priceMinor: Number(form.get('priceMinor'))
    };
    if (item) {
      await save(path, 'PATCH', { ...data, expectedVersion: item.version, ...(status === item.status ? {} : { status }) });
    } else {
      const result = await save(path, 'POST', { ...data, initialStock: Number(form.get('initialStock')) });
      if (result) {
        const created = envelope(product).safeParse(result.response);
        if (created.success) navigate('/admin/products/' + created.data.data.id);
      }
    }
  }
  return <div className="admin-panel space-y-4">
    <h2 className="text-xl font-semibold">{item ? item.name : 'New draft product'}</h2>
    {categories.length === 0 && <p>Create a category before adding a product.</p>}
    {feedback}
    <form onSubmit={submit}>
      <fieldset disabled={busy || archived || !categories.length} className="admin-editor-grid">
        <div className="grid gap-3"><h3 className="font-semibold">Product details</h3>
        <Field label="Name" name="name" value={item?.name ?? ''} maxLength={160} />
        <Field label="Slug" name="slug" value={item?.slug ?? ''} maxLength={180} />
        <label className="grid gap-1">Category<select className={input} name="categoryId" aria-label="Category" required defaultValue={item?.categoryId ?? ''}>
          <option value="" disabled>Select a category</option>
          {categories.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select></label>
        <label className="grid gap-1">Description<textarea className={input} name="description" required maxLength={5000} defaultValue={item?.description} /></label>
        </div><div className="grid content-start gap-3"><h3 className="font-semibold">Pricing, inventory and image</h3>
        <Field label="Price (sen)" name="priceMinor" type="number" min={1} max={100000000} value={item?.priceMinor ?? ''} />
        {item ? archived ? <p><Badge status="ARCHIVED" /> Hidden from the storefront.</p> :
          <ProductStatusControl saved={item.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT'} selected={status} onChange={setStatus} />
          : <><p><Badge status="DRAFT" /> Hidden from customers until published after creation.</p>
            <Field label="Initial stock" name="initialStock" type="number" min={0} value={0} /></>}
        <label className="grid gap-1">Image path or URL<input className={input} name="imagePath" value={image}
          maxLength={300} aria-invalid={invalidImage || undefined} aria-describedby="image-help"
          onChange={event => setImage(event.target.value)} /></label>
        <p id="image-help" className="text-sm text-slate-600">Use a storefront asset such as /assets/sample-desk.png.</p>
        <ImagePreview key={image} value={image} />
        </div>
        {!archived && <div className="flex flex-wrap gap-3"><button disabled={invalidImage} className={button}>{item ? 'Save product' : 'Create draft'}</button>
          <Link className="admin-secondary" to="/admin/products">Back to products</Link></div>}
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

function Pages({ page, hasNext, params }: { page: number; hasNext: boolean; params: URLSearchParams }) {
  const navigate = useNavigate();
  return <Pagination label="Admin pages" page={page} hasNext={hasNext && page < 99999} change={target => {
    const query = new URLSearchParams(params);
    query.set('page', String(target));
    navigate('?' + query);
  }} />;
}

type Mode = 'dashboard' | 'products' | 'product' | 'create' | 'categories' | 'orders' | 'order';
function AdminContent({ mode }: { mode: Mode }) {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page') ?? '1';
  const page = /^[1-9][0-9]{0,4}$/.test(rawPage) ? Number(rawPage) : 1;
  const query = new URLSearchParams(params);
  query.set('page', String(page));

  if (mode === 'dashboard') return <Remote path="orders?page=1" schema={ordersPage}>{data => <>
    <h2 className="text-xl font-semibold">Order overview</h2>
    <OrderStats counts={data.counts} />
    <div className="admin-panel flex flex-wrap gap-3">
      <Link className={button} to="/admin/orders">Manage orders</Link>
      <Link className="admin-secondary" to="/admin/products">Manage products</Link>
      <Link className="admin-secondary" to="/admin/categories">Manage categories</Link>
    </div>
  </>}</Remote>;

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
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Products</h2>
      <Link className={button} to="/admin/products/new">+ New product</Link></div>
    <Remote path="categories" schema={categoriesSchema}>{categories =>
      <ListFilters key={params.toString()} orders={false} params={params} categories={categories} apply={setParams} />
    }</Remote>
    <Remote path={'products?' + query} schema={productsPage}>{(data, refresh) => <div className="admin-panel">
      {!data.items.length ? <p role="status">No products match these filters.</p> : <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Product results">
        <table className="admin-table"><thead><tr><th scope="col">Product</th><th scope="col">Category</th>
          <th scope="col">Price</th><th scope="col">Stock</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
          <tbody>{data.items.map(item => <ProductRow key={item.id} item={item} refresh={refresh} />)}</tbody>
        </table></div>}
      <Pages page={page} hasNext={data.hasNext} params={params} />
    </div>}</Remote>
  </>;
  if (mode === 'order') return <Remote path={'orders/' + encodeURIComponent(id)} schema={orderDetail}>{(record, refresh) =>
    <><button className="mb-3 underline" onClick={refresh}>Reload order</button><Fulfillment record={record} refresh={refresh} /></>
  }</Remote>;
  return <>
    <ListFilters key={params.toString()} orders params={params} categories={[]} apply={setParams} />
    <Remote path={'orders?' + query} schema={ordersPage}>{data => <>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">All orders by status</h2>
      <OrderStats counts={data.counts} />
      <div className="admin-panel">
        {!data.items.length ? <p role="status">No orders match these filters.</p> : <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Order results">
          <table className="admin-table"><thead><tr><th scope="col">Order</th><th scope="col">Date</th>
            <th scope="col">Status</th><th scope="col">Total</th><th scope="col">Action</th></tr></thead>
            <tbody>{data.items.map(item => <tr key={item.id}>
              <td className="font-mono" title={item.id}>#{item.id.slice(0, 8)}</td>
              <td>{new Date(item.createdAt).toLocaleDateString()}</td>
              <td><Badge status={item.status} /></td><td className="tabular-nums">{money(item.totalMinor)}</td>
              <td><Link className="admin-secondary" to={'/admin/orders/' + item.id} aria-label={'View order ' + item.id}>View</Link></td>
            </tr>)}</tbody>
          </table></div>}
        <Pages page={page} hasNext={data.hasNext} params={params} />
      </div>
    </>}</Remote>
  </>;
}

function ProductRow({ item, refresh }: { item: Product; refresh: () => void }) {
  const { save, busy, feedback } = useWrite(refresh);
  const stock = item.stockQuantity === 0 ? 'out' : item.stockQuantity <= 5 ? 'low' : 'healthy';
  return <tr>
    <td><div className="flex items-center gap-3">
      <ImagePreview key={item.imagePath} value={item.imagePath} compact />
      <div><Link className="font-semibold text-blue-900" to={'/admin/products/' + item.id}>{item.name}</Link>
        <p className="text-xs text-slate-600">{item.slug}</p></div>
    </div></td>
    <td>{item.category?.name ?? '—'}</td><td className="tabular-nums">{money(item.priceMinor)}</td>
    <td><span className="mr-2 tabular-nums">{item.stockQuantity}</span><Badge status={stock} /></td>
    <td><Badge status={item.status} /></td>
    <td><div className="flex flex-wrap gap-2">
      <Link className="admin-secondary" to={'/admin/products/' + item.id}>{item.status === 'ARCHIVED' ? 'View' : 'Edit'}</Link>
      {item.status === 'ACTIVE' && <Link className="admin-secondary" to={'/products/' + item.slug}>Store</Link>}
      {item.status !== 'ARCHIVED' && <button className="admin-danger" disabled={busy} onClick={() => {
        if (window.confirm('Archive ' + item.name + ' and remove it from the shop?')) {
          void save('products/' + item.id, 'DELETE', { expectedVersion: item.version });
        }
      }}>Archive</button>}
    </div>{feedback}</td>
  </tr>;
}

export function Admin({ mode }: { mode: Mode }) {
  const { user, status, refresh } = useSession();
  if (status === 'loading') return <LoadingState message="Checking your account…" />;
  if (status === 'error') return <ErrorState message="Unable to check your account." retry={() => void refresh()} />;
  if (!user) return <div className="admin-panel mt-8"><h1 className="mb-4 text-2xl font-semibold">Admin Portal</h1><Link className={button} to="/admin/sign-in">Sign in as an administrator</Link></div>;
  if (user.role !== 'ADMIN') return <section className="admin-panel mt-8"><h1 className="text-2xl font-semibold">Access pending</h1><p role="alert" className="my-3">Administrator access is required. Ask the store operator to enable access for your account.</p><Link className="admin-secondary" to="/account">Go to account</Link></section>;
  return <section className="space-y-5 py-10">
    <h1 className="text-3xl font-bold tracking-tight">{mode === 'dashboard' ? 'Administration dashboard' : mode === 'orders' ? 'Order management' : mode === 'order' ? 'Order fulfillment' : mode === 'categories' ? 'Categories' : mode === 'create' ? 'Create product' : mode === 'product' ? 'Product details' : 'Product management'}</h1>
    <nav aria-label="Administration" className="admin-tabs">
      <NavLink end to="/admin">Overview</NavLink>
      <NavLink to="/admin/products">Products</NavLink>
      <NavLink to="/admin/categories">Categories</NavLink>
      <NavLink to="/admin/orders">Orders</NavLink>
    </nav>
    <AdminContent key={user.id + ':' + mode} mode={mode} />
  </section>;
}
