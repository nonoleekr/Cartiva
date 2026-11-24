import { z } from 'zod';

const slug = z.string().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const integerQuery = (maximum: number) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(maximum));

// Strict schemas reject accidental unknown filters and repeated query parameters.
export const catalogQuery = z.strictObject({
  q: z.string().trim().max(100).optional(),
  category: slug.max(120).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'name']).default('newest'),
  page: integerQuery(100_000).default(1),
  pageSize: integerQuery(50).default(20)
});
export const productSlug = slug;
export type CatalogQuery = z.infer<typeof catalogQuery>;
