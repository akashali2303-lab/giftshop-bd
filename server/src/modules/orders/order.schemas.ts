import { z } from 'zod';

export const checkoutItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  customText: z.string().optional(),
  storageKey: z.string().optional(),
  originalFilename: z.string().optional()
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Full name is required (minimum 2 characters)'),
  customerPhone: z.string().trim().regex(/^01[3-9]\d{8}$/, 'Valid 11-digit Bangladesh phone number required (e.g. 01712345678)'),
  deliveryAddress: z.string().trim().min(5, 'Detailed delivery address is required'),
  district: z.enum(['Dhaka', 'Outside Dhaka']),
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.enum(['COD', 'BKASH_MANUAL', 'NAGAD_MANUAL']),
  senderPhone: z.string().optional(),
  transactionReference: z.string().optional(),
  items: z.array(checkoutItemSchema).min(1, 'Cart cannot be empty')
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(5, 'Valid order number is required')
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TrackOrderInput = z.infer<typeof trackOrderSchema>;
