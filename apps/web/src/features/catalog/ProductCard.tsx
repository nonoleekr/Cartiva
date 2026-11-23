import { Link } from 'react-router';
import type { Product } from './api';
import { money } from '../../lib/money';

export function ProductCard({ product }: { product: Product }) {
  return <article className="min-w-0">
    <Link to={`/products/${product.slug}`} className="block" aria-label={`View ${product.name}`}><img src={product.imagePath} alt={product.name} width={400} height={300} loading="lazy" className="aspect-[12/7] w-full bg-stone-100 object-cover" /></Link>
    <h2 className="mt-2 text-base font-semibold leading-5"><Link to={`/products/${product.slug}`} className="text-emerald-950 underline decoration-emerald-900/40 underline-offset-3">{product.name}</Link></h2>
    <p className="text-sm leading-5 text-stone-600">{product.category.name}</p>
    <p className="font-semibold leading-6">{money(product.priceMinor)}</p>
    <p className={`text-sm leading-5 ${product.stockQuantity > 0 ? 'text-emerald-800' : 'text-stone-600'}`}>{product.stockQuantity > 0 ? 'In stock' : 'Out of stock'}</p>
  </article>;
}
