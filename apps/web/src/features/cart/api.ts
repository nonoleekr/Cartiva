import { z } from 'zod';
import { requestJson } from '../../lib/http';
import { productSchema } from '../catalog/api';

const safeMoney = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const cartSchema = z.object({ data: z.object({
  id: z.uuid().nullable(), revision: z.number().int().nonnegative(), currency: z.literal('MYR'),
  totalQuantity: z.number().int().nonnegative(), subtotalMinor: safeMoney,
  items: z.array(z.object({ productId: z.uuid(), slug: z.string(), productName: z.string(), imagePath: productSchema.shape.imagePath,
    unitPriceMinor: safeMoney, lineTotalMinor: safeMoney, quantity: z.number().int().min(1).max(99),
    availableStock: z.number().int().nonnegative(), availability: z.enum(['AVAILABLE', 'INSUFFICIENT_STOCK', 'UNAVAILABLE']) }))
}) });
export type Cart = z.infer<typeof cartSchema>['data'];
export type CartItem = Cart['items'][number];
export const fetchCart = (signal?: AbortSignal) => requestJson('/api/v1/cart', cartSchema, signal ? { signal } : {});

export async function mutateCart(action: 'add' | 'replace' | 'remove', productId: string, quantity = 1) {
  const csrf = await requestJson('/api/v1/csrf', z.object({ data: z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }) }));
  const path = action === 'add' ? '/api/v1/cart/items' : `/api/v1/cart/items/${encodeURIComponent(productId)}`;
  return requestJson(path, cartSchema, { method: action === 'add' ? 'POST' : action === 'replace' ? 'PATCH' : 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.data.token },
    body: JSON.stringify(action === 'add' ? { productId, quantity } : action === 'replace' ? { quantity } : {}) });
}
