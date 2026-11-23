import type { Database } from '../../lib/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CatalogQuery } from './catalog.schemas.js';
import { ApiError } from '../../lib/errors.js';

const publicSelect = {
  id: true, slug: true, name: true, imagePath: true, priceMinor: true, stockQuantity: true,
  category: { select: { id: true, name: true, slug: true } }
} satisfies Prisma.ProductSelect;

export function createCatalogService(database: Database) {
  return {
    async list(query: CatalogQuery) {
      const search = query.q?.replace(/[\\%_]/g, '\\$&');
      const where: Prisma.ProductWhereInput = {
        status: 'ACTIVE',
        ...(query.category ? { category: { slug: query.category } } : {}),
        ...(search ? { OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ] } : {})
      };
      const sorts: Record<CatalogQuery['sort'], Prisma.ProductOrderByWithRelationInput> = {
        newest: { createdAt: 'desc' }, 'price-asc': { priceMinor: 'asc' },
        'price-desc': { priceMinor: 'desc' }, name: { name: 'asc' }
      };
      // One consistent snapshot for page/count; Prisma batches category relation reads.
      const [items, totalItems] = await database.$transaction([
        database.product.findMany({ where, select: publicSelect,
          orderBy: [sorts[query.sort], { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
        database.product.count({ where })
      ], { isolationLevel: 'RepeatableRead' });

      return { data: items.map((item) => ({ ...item, currency: 'MYR' as const })),
        meta: { page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) } };
    },
    async detail(slug: string) {
      const product = await database.product.findFirst({ where: { slug, status: 'ACTIVE' },
        select: { ...publicSelect, description: true } });
      if (!product) throw new ApiError(404, 'NOT_FOUND', 'Product not found.');
      return { data: { ...product, currency: 'MYR' as const } };
    },
    async categories() {
      return { data: await database.category.findMany({ select: { id: true, name: true, slug: true },
        orderBy: [{ name: 'asc' }, { id: 'asc' }] }) };
    }
  };
}
