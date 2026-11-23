import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { fetchProduct } from './api';
import { useRemote } from '../../lib/useRemote';
import { money } from '../../lib/money';
import { ErrorState, LoadingState } from '../../components/RequestState';

function ProductDetails({ slug, retry }: { slug: string; retry: () => void }) {
  const load = useCallback((signal: AbortSignal) => fetchProduct(slug, signal), [slug]);
  const state = useRemote(load);
  if (state.status === 'loading') return <LoadingState message="Loading product…" />;
  if (state.status === 'error') return <ErrorState message={state.message} retry={retry} />;
  const product = state.data.data;
  return <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-14"><img src={product.imagePath} alt={product.name} width={640} height={480} className="aspect-4/3 w-full bg-stone-100 object-cover" /><div><p className="text-sm text-stone-600">{product.category.name}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-emerald-950">{product.name}</h1><p className="mt-5 text-2xl font-semibold">{money(product.priceMinor)}</p><p className="mt-3 text-stone-600">{product.stockQuantity > 0 ? `${product.stockQuantity} available` : 'Out of stock'}</p><p className="mt-6 leading-8 text-stone-600">{product.description}</p><p className="mt-4 text-sm text-stone-500">Illustrative sample image. No real purchase or payment.</p></div></div>;
}

export function ProductPage() {
  const { slug = '' } = useParams();
  const [attempt, setAttempt] = useState(0);
  return <section className="py-8 sm:py-12"><Link to="/" className="text-sm font-medium text-emerald-900 underline underline-offset-4">Back to shop</Link><ProductDetails key={`${slug}:${attempt}`} slug={slug} retry={() => setAttempt((value) => value + 1)} /></section>;
}
