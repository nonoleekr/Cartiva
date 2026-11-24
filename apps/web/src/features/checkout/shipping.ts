import { z } from 'zod';

export const shippingSchema = z.object({ recipientName: z.string(), addressLine1: z.string(), city: z.string(), postalCode: z.string(), country: z.literal('MY') });
