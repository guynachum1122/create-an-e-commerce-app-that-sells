import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getStockStatus(stockQuantity: number, lowStockThreshold: number) {
  if (stockQuantity <= 0) return 'OUT_OF_STOCK' as const;
  if (stockQuantity <= lowStockThreshold) return 'LOW_STOCK' as const;
  return 'IN_STOCK' as const;
}

export function getDiscountPercent(price: number, compareAtPrice?: number | null): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${random}`;
}

/** Prevent </script> breakout in JSON-LD blocks */
export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Validate post-login redirect is same-origin relative path */
export function safeCallbackUrl(url: string | null | undefined, fallback = '/account'): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('://')) {
    return fallback;
  }
  return url;
}

/** Only allow https tracking URLs */
export function isValidTrackingUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
