import type { Database } from '../src/lib/database.js';

// Deterministic fictional records, independent of the legacy application.
const categories = [
  { id: '10000000-0000-4000-8000-000000000001', name: 'Desk', slug: 'desk' },
  { id: '10000000-0000-4000-8000-000000000002', name: 'Home', slug: 'home' },
  { id: '10000000-0000-4000-8000-000000000003', name: 'Travel', slug: 'travel' }
];

export async function seedCatalog(database: Database) {
  await database.$transaction(async (tx) => {
    for (const category of categories) {
      await tx.category.upsert({ where: { id: category.id }, create: category, update: category });
    }
    for (let index = 1; index <= 26; index++) {
      const number = String(index).padStart(2, '0');
      const category = categories[(index - 1) % categories.length]!;
      const data = {
        name: `Sample ${category.name} Item ${number}`,
        slug: `sample-item-${number}`,
        description: `Fictional ${category.name.toLowerCase()} product ${number} for Cartiva development. ${index === 25 ? 'Amber telescope special search fixture.' : 'Synthetic demonstration data only.'}`,
        categoryId: category.id,
        imagePath: '/assets/catalog-placeholder.svg',
        priceMinor: index === 2 ? 1100 : 1000 + index * 100,
        stockQuantity: index === 3 ? 0 : 10 + index,
        status: index === 26 ? 'ARCHIVED' as const : index === 24 ? 'DRAFT' as const : 'ACTIVE' as const,
        createdAt: new Date(`2026-01-${number}T00:00:00.000Z`)
      };
      await tx.product.upsert({
        where: { id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}` },
        create: { id: `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`, ...data }, update: data
      });
    }
  });
}
