import { z } from 'zod';

export const orderCancellationSchema = z.object({
  reason: z
    .string()
    .max(150, 'Reason cannot exceed 150 characters'),
});

export type OrderCancellationFormData = z.infer<typeof orderCancellationSchema>;

export const stockPriceSchema = z.object({
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(10000, 'Price exceeds maximum allowed limit (₹10,000)'),
});

export type StockPriceFormData = z.infer<typeof stockPriceSchema>;

export const authEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export type AuthEmailFormData = z.infer<typeof authEmailSchema>;
