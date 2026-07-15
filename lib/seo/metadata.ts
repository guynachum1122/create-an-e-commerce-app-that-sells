import type { Metadata } from 'next';
import { OG_DEFAULT_IMAGE, SITE_NAME, SITE_URL, TWITTER_HANDLE } from './constants';
import { getDiscountPercent, getStockStatus } from '@/lib/utils';

type ProductMeta = {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  images: { url: string; altText?: string | null }[];
  variants: { price: number; compareAtPrice?: number | null; stockQuantity: number; lowStockThreshold: number }[];
  healthInfo?: { calories: number; proteinGrams: { toString(): string } } | null;
  tags: { name: string }[];
};

export function buildProductMetadata(product: ProductMeta): Metadata {
  const variant = product.variants.find((v) => v.stockQuantity > 0) || product.variants[0];
  const discount = variant ? getDiscountPercent(variant.price, variant.compareAtPrice) : null;
  const primaryTag = product.tags[0]?.name;
  const stockStatus = variant ? getStockStatus(variant.stockQuantity, variant.lowStockThreshold) : 'OUT_OF_STOCK';

  let title = product.metaTitle || `${product.name}${primaryTag ? ` [${primaryTag}]` : ''}`;
  if (discount) title = `${product.name} — ${discount}% Off`;

  let description = product.metaDescription || product.shortDescription || product.description.slice(0, 155);
  if (product.healthInfo && variant) {
    const nutrition = `${product.healthInfo.calories} cal, ${product.healthInfo.proteinGrams}g protein per serving.`;
    description = `${(product.shortDescription || description).slice(0, 120)}. ${nutrition}`;
  }

  const image = product.images.find((i) => i.url)?.url || OG_DEFAULT_IMAGE;
  const canonical = `${SITE_URL}/products/${product.slug}`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [{ url: image, width: 1200, height: 1200, alt: product.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: TWITTER_HANDLE ? `@${TWITTER_HANDLE}` : undefined,
      images: [image],
    },
    other: variant
      ? {
          'product:price:amount': String(variant.price / 100),
          'product:price:currency': 'USD',
          'product:availability': stockStatus === 'OUT_OF_STOCK' ? 'out of stock' : 'in stock',
        }
      : undefined,
  };
}

export function buildCategoryMetadata(category: {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
}): Metadata {
  const title = `${category.name} — Shop Online`;
  const description =
    category.description ||
    `Shop ${category.name} at ${SITE_NAME}. Filter by price, rating & diet tags. Fresh delivery with full nutrition & ingredient info.`;
  const canonical = `${SITE_URL}/category/${category.slug}`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: category.imageUrl || OG_DEFAULT_IMAGE }],
    },
  };
}

export function buildTagMetadata(tag: { name: string; slug: string; description?: string | null }): Metadata {
  const title = `${tag.name} Foods — Shop ${tag.name} Products`;
  const description =
    tag.description ||
    `Browse ${tag.name} foods at ${SITE_NAME}. Filter by nutrition, price, and customer ratings.`;
  const canonical = `${SITE_URL}/search?tags=${tag.slug}`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: canonical, siteName: SITE_NAME, images: [{ url: OG_DEFAULT_IMAGE }] },
  };
}

export function buildSearchMetadata(query?: string): Metadata {
  const title = query ? `Search: ${query}` : 'Search';
  const description = query ? `Results for "${query}" at ${SITE_NAME}.` : `Search foods at ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/search` },
    robots: { index: false, follow: true },
  };
}

export function buildPrivacyMetadata(): Metadata {
  return {
    title: 'Privacy Policy',
    description:
      'How Harvest Basket collects, uses, and protects your personal data. GDPR/CCPA rights, cookies, and account deletion.',
    alternates: { canonical: `${SITE_URL}/privacy` },
    robots: { index: true, follow: true },
  };
}

export function noIndexMetadata(title: string, nofollow = false): Metadata {
  return {
    title,
    robots: nofollow ? 'noindex, nofollow' : 'noindex, follow',
  };
}

export const defaultMetadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Fresh Food, Honest Nutrition`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Shop fresh, nutritious food online. Browse by category, filter by diet tags like vegan & high protein, and get transparent nutrition facts on every product.',
  metadataBase: new URL(SITE_URL),
};
