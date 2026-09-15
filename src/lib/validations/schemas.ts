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

export const addonOptionSchema = z.object({
  name: z.string().trim().min(1, 'Option name is required'),
  priceDelta: z
    .number()
    .refine((val) => !isNaN(val) && isFinite(val), 'Price delta must be a valid number'),
  calorieDelta: z.number().optional().nullable(),
});

export type AddonOptionFormData = z.infer<typeof addonOptionSchema>;

export const addonGroupSchema = z.object({
  groupName: z.string().trim().min(1, 'Group name is required'),
  required: z.boolean(),
  multiSelect: z.boolean(),
  options: z
    .array(addonOptionSchema)
    .min(1, 'At least one option is required in each addon group'),
});

export type AddonGroupFormData = z.infer<typeof addonGroupSchema>;

export const menuItemSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters'),
  price: z
    .number()
    .positive('Price must be greater than 0')
    .refine(
      (val) => Number(val.toFixed(2)) === val || /^\d+(\.\d{1,2})?$/.test(String(val)),
      'Price cannot have more than 2 decimal places'
    ),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required'),
  description: z.string().trim(),
  imageUrl: z.string(),
  calories: z
    .number()
    .min(0, 'Calories cannot be negative')
    .optional()
    .nullable(),
  healthTag: z.enum(['light', 'balanced', 'indulgent']),
  isAvailable: z.boolean(),
  addonGroups: z.array(addonGroupSchema),
});

export type MenuItemFormData = z.infer<typeof menuItemSchema>;
