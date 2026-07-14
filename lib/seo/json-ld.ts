import { SITE_NAME, SITE_URL } from './constants';
import { getStockStatus } from '@/lib/utils';

export function productJsonLd(product: {
  name: string;
  slug: string;
  description: string;
  images: { url: string }[];
  averageRating: number;
  reviewCount: number;
  categoryName?: string;
  categorySlug?: string;
  tags: { name: string }[];
  healthInfo?: {
    calories: number;
    proteinGrams: { toString(): string };
    carbohydratesGrams: { toString(): string };
    fatGrams: { toString(): string };
    servingSize: string;
    allergens: string[];
  } | null;
  variants: {
    sku: string;
    price: number;
    compareAtPrice?: number | null;
    stockQuantity: number;
    lowStockThreshold: number;
  }[];
  reviews?: { rating: number; body: string; createdAt: Date; user: { name?: string | null } }[];
}) {
  const variant = product.variants.find((v) => v.stockQuantity > 0) || product.variants[0];
  const canonicalUrl = `${SITE_URL}/products/${product.slug}`;
  const stockStatus = variant
    ? getStockStatus(variant.stockQuantity, variant.lowStockThreshold)
    : 'OUT_OF_STOCK';

  const availabilityMap = {
    IN_STOCK: 'https://schema.org/InStock',
    LOW_STOCK: 'https://schema.org/LimitedAvailability',
    OUT_OF_STOCK: 'https://schema.org/OutOfStock',
  };

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Product',
      '@id': `${canonicalUrl}/#product`,
      name: product.name,
      description: product.description.replace(/<[^>]*>/g, ''),
      image: product.images.map((i) => i.url),
      sku: variant?.sku,
      brand: { '@type': 'Brand', name: SITE_NAME },
      category: product.categoryName,
      url: canonicalUrl,
      additionalProperty: [
        ...(product.healthInfo
          ? [
              { '@type': 'PropertyValue', name: 'Calories', value: `${product.healthInfo.calories} kcal per ${product.healthInfo.servingSize}` },
              { '@type': 'PropertyValue', name: 'Protein', value: `${product.healthInfo.proteinGrams}g` },
              { '@type': 'PropertyValue', name: 'Allergens', value: product.healthInfo.allergens.join(', ') || 'None listed' },
            ]
          : []),
        ...product.tags.map((t) => ({ '@type': 'PropertyValue', name: 'Diet', value: t.name })),
      ],
      offers: variant
        ? {
            '@type': 'Offer',
            url: canonicalUrl,
            priceCurrency: 'USD',
            price: (variant.price / 100).toFixed(2),
            ...(variant.compareAtPrice && variant.compareAtPrice > variant.price
              ? { priceSpecification: {
                  '@type': 'UnitPriceSpecification',
                  price: (variant.price / 100).toFixed(2),
                  priceCurrency: 'USD',
                } }
              : {}),
            priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            availability: availabilityMap[stockStatus],
            itemCondition: 'https://schema.org/NewCondition',
            seller: { '@id': `${SITE_URL}/#organization` },
          }
        : undefined,
    },
  ];

  if (product.reviewCount >= 1) {
    (graph[0] as Record<string, unknown>).aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (product.reviews?.length) {
    (graph[0] as Record<string, unknown>).review = product.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.user.name || 'Customer' },
      datePublished: r.createdAt.toISOString(),
      reviewRating: { '@type': 'Rating', ratingValue: r.rating },
      reviewBody: r.body.replace(/<[^>]*>/g, '').slice(0, 500),
    }));
  }

  if (product.categoryName && product.categorySlug) {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}/#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: product.categoryName, item: `${SITE_URL}/category/${product.categorySlug}` },
        { '@type': 'ListItem', position: 3, name: product.name, item: canonicalUrl },
      ],
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function categoryJsonLd(category: {
  name: string;
  slug: string;
  description?: string | null;
  parentName?: string;
  parentSlug?: string;
  products: { slug: string }[];
}) {
  const url = `${SITE_URL}/category/${category.slug}`;
  const breadcrumbs = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
  ];
  if (category.parentName && category.parentSlug) {
    breadcrumbs.push({ '@type': 'ListItem', position: 2, name: category.parentName, item: `${SITE_URL}/category/${category.parentSlug}` });
    breadcrumbs.push({ '@type': 'ListItem', position: 3, name: category.name, item: url });
  } else {
    breadcrumbs.push({ '@type': 'ListItem', position: 2, name: category.name, item: url });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: category.name,
        description: category.description,
        url,
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'ItemList',
        itemListElement: category.products.slice(0, 24).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/products/${p.slug}`,
        })),
      },
      { '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
    ],
  };
}

export function tagLandingJsonLd(tag: { name: string; slug: string; description?: string | null }, products: { slug: string }[]) {
  const url = `${SITE_URL}/search?tags=${tag.slug}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        name: `${tag.name} Foods`,
        description: tag.description,
        url,
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'ItemList',
        itemListElement: products.slice(0, 24).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/products/${p.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: tag.name, item: url },
        ],
      },
    ],
  };
}

export function homepageJsonLd(featuredProducts: { slug: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'ItemList',
        name: 'Featured Products',
        itemListElement: featuredProducts.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}/products/${p.slug}`,
        })),
      },
    ],
  };
}
