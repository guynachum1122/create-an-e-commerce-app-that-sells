import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Enter your full name.').max(100),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  firstName: z.string().min(1, 'Enter a first name.').max(50),
  lastName: z.string().min(1, 'Enter a last name.').max(50),
  line1: z.string().min(1, 'Enter a street address.').max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, 'Enter a city.').max(100),
  state: z.string().max(50).optional().nullable(),
  postalCode: z.string().min(1, 'Enter a valid postal code.').max(20),
  country: z.string().length(2).default('US'),
  phone: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const reviewSchema = z.object({
  productId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  body: z.string().min(20, 'Write at least 20 characters.').max(2000),
});

export const checkoutSchema = z.object({
  addressId: z.string().cuid().optional(),
  newAddress: addressSchema.optional(),
  shippingMethodId: z.string().cuid(),
  intentId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  last4: z.string().length(4).optional(),
  promoCode: z.string().max(50).optional(),
});

export const promoSchema = z.object({
  code: z.string().min(1).max(50),
});

export const cartAddSchema = z.object({
  variantId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const cartUpdateSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().int().min(0).max(99),
});

export const cartRemoveSchema = z.object({
  itemId: z.string().cuid(),
});

export const wishlistSchema = z.object({
  productId: z.string().cuid(),
});

export const accountDeleteSchema = z.object({
  password: z.string().optional(),
  confirm: z.literal(true, { errorMap: () => ({ message: 'Confirmation required' }) }),
});

export const adminReviewUpdateSchema = z.object({
  isVisible: z.boolean(),
});

export const adminCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal('')),
  parentId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const httpsUrl = z.string().url().refine((u) => u.startsWith('https://'), 'Image URL must use HTTPS');

export const adminProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(1).max(10000),
  ingredients: z.string().min(1).max(5000),
  shortDescription: z.string().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  healthInfo: z.record(z.unknown()).optional(),
  images: z.array(z.object({
    url: httpsUrl,
    altText: z.string().max(200).optional(),
    sortOrder: z.number().int().optional(),
    isPrimary: z.boolean().optional(),
  })).optional(),
  variants: z.array(z.object({
    sku: z.string().min(1).max(50),
    name: z.string().min(1).max(100),
    price: z.number().int().min(0),
    compareAtPrice: z.number().int().min(0).optional().nullable(),
    stockQuantity: z.number().int().min(0),
    lowStockThreshold: z.number().int().min(0).optional(),
    attributes: z.record(z.string()).optional(),
  })).optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  themePreference: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  trackingNumber: z.string().max(100).optional().nullable(),
  trackingUrl: z.string().url().optional().nullable().or(z.literal('')),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
