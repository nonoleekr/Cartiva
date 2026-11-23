import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { fetchCategories, fetchProducts } from './api';
import { ProductCard } from './ProductCard';
import { useRemote } from '../../lib/useRemote';
import { ErrorState, LoadingState } from '../../components/RequestState';

function CatalogResults({ query, retry }: { query: string; retry: () => void }) {
  const [params, setParams] = useSearchParams();
  const load = useCallback(async (signal: AbortSignal) => {
    const [page, categories] = await Promise.all([fetchProducts(query, signal), fetchCategories(signal)]);
    return { page, categories };
  }, [query]);
  const state = useRemote(load);
  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <><ErrorState message={state.message} retry={retry} /><Link to="/" className="underline">Reset filters</Link></>;
  const { page, categories } = state.data;

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ['q', 'category', 'sort']) {
      const value = String(values.get(key) ?? '').trim();
      if (value && !(key === 'sort' && value === 'newest')) next.set(key, value);
    }
    setParams(next);
  }

  function changePage(page: number) { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); }

  return <>
    <form onSubmit={search} className="mt-3 grid gap-4 border-b border-stone-200 pb-6 sm:grid-cols-[2fr_1fr_1fr]">
      <div className="grid gap-2 text-sm font-semibold"><label htmlFor="catalog-search">Search products</label><div className="flex gap-2"><input id="catalog-search" name="q" type="search" defaultValue={params.get('q') ?? ''} maxLength={100} placeholder="Search for products…" className="min-w-0 flex-1 rounded border border-stone-400 px-3 py-2 font-normal" /><button className="rounded bg-emerald-900 px-3 py-2 text-white">Search</button></div></div>
      <label className="grid gap-2 text-sm font-semibold">Category<select name="category" defaultValue={params.get('category') ?? ''} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="rounded border border-stone-400 px-3 py-2 font-normal"><option value="">All categories</option>{categories.data.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Sort by<select name="sort" defaultValue={params.get('sort') ?? 'newest'} onChange={(event) => event.currentTarget.form?.requestSubmit()} className="rounded border border-stone-400 px-3 py-2 font-normal"><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
    </form>
    <p role="status" className="my-4 text-sm font-semibold">{page.meta.totalItems} {page.meta.totalItems === 1 ? 'product' : 'products'}</p>
    {page.data.length ? <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-x-6">{page.data.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      : <div className="py-12"><h2 className="text-xl font-semibold">No products on this page</h2><p className="mt-3 text-stone-600">Try another search or reset your filters.</p><Link to="/" className="mt-4 inline-block underline">Reset filters</Link></div>}
    {page.meta.totalPages > 0 && <nav aria-label="Catalog pages" className="my-10 flex flex-wrap items-center justify-center gap-5"><button disabled={page.meta.page <= 1} onClick={() => changePage(page.meta.page - 1)} className="rounded border border-stone-300 px-4 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {page.meta.page} of {page.meta.totalPages}</span><button disabled={page.meta.page >= page.meta.totalPages} onClick={() => changePage(page.meta.page + 1)} className="rounded bg-emerald-900 px-4 py-2 text-white disabled:opacity-40">Next</button></nav>}
  </>;
}

export function CatalogPage() {
  const [params] = useSearchParams();
  const [attempt, setAttempt] = useState(0);
  const query = new URLSearchParams(params); query.set('pageSize', '8');
  const serialized = query.toString();
  return <section className="py-4"><h1 className="max-w-4xl text-3xl font-bold tracking-tight text-emerald-950 sm:text-[40px] sm:leading-[48px]">Find your everyday essentials.</h1><p className="mt-2 text-base leading-7 text-stone-600 sm:text-lg">Explore our sample collection for desk, home and travel.</p>
    <CatalogResults key={`${serialized}:${attempt}`} query={serialized} retry={() => setAttempt((value) => value + 1)} />
  </section>;
}
