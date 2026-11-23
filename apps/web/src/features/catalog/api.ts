import { z } from 'zod';
import { requestJson } from '../../lib/http';

export const categorySchema = z.object({ id: z.uuid(), name: z.string(), slug: z.string() });
export const productSchema = z.object({
  id: z.uuid(), slug: z.string(), name: z.string(), imagePath: z.string().regex(/^\/assets\/[a-zA-Z0-9/_-]+\.(svg|png|jpg|webp)$/),
  priceMinor: z.number().int().positive().max(100000000), currency: z.literal('MYR'), stockQuantity: z.number().int().nonnegative(), category: categorySchema
});
export const pageSchema = z.object({ data: z.array(productSchema), meta: z.object({ page: z.number().int().positive(), pageSize: z.number().int().positive(), totalItems: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative() }) });
export type Product = z.infer<typeof productSchema>;
export const fetchProducts = (query: string, signal: AbortSignal) => requestJson(`/api/v1/products?${query}`, pageSchema, { signal });
export const fetchCategories = (signal: AbortSignal) => requestJson('/api/v1/categories', z.object({ data: z.array(categorySchema) }), { signal });
export const fetchProduct = (slug: string, signal: AbortSignal) => requestJson(`/api/v1/products/${encodeURIComponent(slug)}`, z.object({ data: productSchema.extend({ description: z.string() }) }), { signal });
