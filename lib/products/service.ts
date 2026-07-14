import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type ProductFilters = {
  categorySlug?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  attributes?: Record<string, string[]>;
  sort?: string;
  page?: number;
  limit?: number;
  query?: string;
};

async function ftsProductIds(query: string, limit = 100): Promise<string[] | null> {
  try {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p.id
      FROM "Product" p
      WHERE p."isPublished" = true
        AND p."searchText" IS NOT NULL
        AND to_tsvector('english', p."searchText") @@ plainto_tsquery('english', ${query})
      ORDER BY ts_rank(to_tsvector('english', p."searchText"), plainto_tsquery('english', ${query})) DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => r.id);
  } catch {
    return null;
  }
}

export async function searchProducts(filters: ProductFilters) {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    isPublished: true,
    variants: { some: { isActive: true } },
  };

  if (filters.categorySlug) {
    where.categories = { some: { category: { slug: filters.categorySlug, isActive: true } } };
  }

  if (filters.tags?.length) {
    where.tags = { some: { tag: { slug: { in: filters.tags } } } };
  }

  if (filters.rating) {
    where.averageRating = { gte: filters.rating };
  }

  if (filters.inStock) {
    where.variants = { some: { isActive: true, stockQuantity: { gt: 0 } } };
  }

  if (filters.query) {
    const q = filters.query.trim();
    const ftsIds = await ftsProductIds(q);
    if (ftsIds?.length) {
      where.id = { in: ftsIds };
    } else {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { ingredients: { contains: q, mode: 'insensitive' } },
        { shortDescription: { contains: q, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
      ];
    }
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = [];
  switch (filters.sort) {
    case 'price-asc':
    case 'price-desc':
      orderBy.push({ variants: { _count: 'desc' } });
      break;
    case 'rating':
    case 'rating-desc':
      orderBy.push({ averageRating: 'desc' });
      break;
    case 'newest':
      orderBy.push({ createdAt: 'desc' });
      break;
    case 'discount':
      orderBy.push({ orderCount: 'desc' });
      break;
    case 'relevance':
      break;
    case 'name-asc':
      orderBy.push({ name: 'asc' });
      break;
    default:
      orderBy.push({ isFeatured: 'desc' }, { orderCount: 'desc' });
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
        tags: { include: { tag: true } },
        categories: { include: { category: true }, take: 1 },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  let filtered = products;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filtered = products.filter((p) => {
      const minVariantPrice = Math.min(...p.variants.map((v) => v.price));
      if (filters.minPrice !== undefined && minVariantPrice < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && minVariantPrice > filters.maxPrice) return false;
      return true;
    });
  }

  if (filters.attributes && Object.keys(filters.attributes).length > 0) {
    filtered = filtered.filter((p) =>
      p.variants.some((v) => {
        const attrs = v.attributes as Record<string, string>;
        return Object.entries(filters.attributes!).every(([key, values]) => {
          if (!values.length) return true;
          return values.includes(attrs[key]);
        });
      })
    );
  }

  if (filters.sort === 'price-asc' || filters.sort === 'price-desc') {
    filtered.sort((a, b) => {
      const pa = Math.min(...a.variants.map((v) => v.price));
      const pb = Math.min(...b.variants.map((v) => v.price));
      return filters.sort === 'price-asc' ? pa - pb : pb - pa;
    });
  }

  if (
    filters.query &&
    filters.sort !== 'price-asc' &&
    filters.sort !== 'price-desc'
  ) {
    const ftsIds = await ftsProductIds(filters.query.trim());
    if (ftsIds?.length) {
      const rank = new Map(ftsIds.map((id, i) => [id, i]));
      filtered.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
    }
  }

  return { products: filtered, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug, isPublished: true },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
      healthInfo: true,
      tags: { include: { tag: true } },
      categories: { include: { category: true } },
      reviews: {
        where: { isVisible: true },
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}

export async function getRecommendations(productId: string, limit = 4) {
  const coPurchased = await prisma.$queryRaw<{ productId: string; co_occurrence: bigint }[]>`
    SELECT b."productId", COUNT(*) AS co_occurrence
    FROM "OrderItem" a
    JOIN "OrderItem" b ON a."orderId" = b."orderId" AND a."productId" != b."productId"
    WHERE a."productId" = ${productId}
    GROUP BY b."productId"
    HAVING COUNT(*) >= 1
    ORDER BY co_occurrence DESC
    LIMIT ${limit}
  `;

  const coIds = coPurchased.map((r) => r.productId);

  let products = await prisma.product.findMany({
    where: {
      id: { in: coIds, not: productId },
      isPublished: true,
      variants: { some: { stockQuantity: { gt: 0 }, isActive: true } },
    },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      variants: { where: { isActive: true, stockQuantity: { gt: 0 } }, orderBy: { price: 'asc' }, take: 1 },
      tags: { include: { tag: true } },
    },
    take: limit,
  });

  if (products.length < limit) {
    const current = await prisma.product.findUnique({
      where: { id: productId },
      include: { categories: { take: 1 } },
    });
    const categoryId = current?.categories[0]?.categoryId;

    const fallback = await prisma.product.findMany({
      where: {
        id: { not: productId, notIn: products.map((p) => p.id) },
        isPublished: true,
        categories: categoryId ? { some: { categoryId } } : undefined,
        variants: { some: { stockQuantity: { gt: 0 }, isActive: true } },
      },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true, stockQuantity: { gt: 0 } }, orderBy: { price: 'asc' }, take: 1 },
        tags: { include: { tag: true } },
      },
      orderBy: { orderCount: 'desc' },
      take: limit - products.length,
    });

    products = [...products, ...fallback];
  }

  return products.slice(0, limit);
}

export async function searchSuggestions(query: string) {
  if (query.length < 2) return { products: [], categories: [], tags: [] };

  const ftsIds = await ftsProductIds(query, 4);

  const [products, categories, tags] = await Promise.all([
    prisma.product.findMany({
      where: ftsIds?.length
        ? { id: { in: ftsIds }, isPublished: true }
        : {
            isPublished: true,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { ingredients: { contains: query, mode: 'insensitive' } },
            ],
          },
      select: { name: true, slug: true, images: { where: { isPrimary: true }, take: 1, select: { url: true } } },
      take: 4,
    }),
    prisma.category.findMany({
      where: { isActive: true, name: { contains: query, mode: 'insensitive' } },
      select: { name: true, slug: true },
      take: 2,
    }),
    prisma.tag.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      select: { name: true, slug: true },
      take: 2,
    }),
  ]);

  return { products, categories, tags };
}

export async function getCategoryAttributeOptions(categorySlug: string) {
  const products = await prisma.product.findMany({
    where: {
      isPublished: true,
      categories: { some: { category: { slug: categorySlug } } },
    },
    include: { variants: { where: { isActive: true } } },
  });

  const attributeMap: Record<string, Set<string>> = {};
  for (const product of products) {
    for (const variant of product.variants) {
      const attrs = variant.attributes as Record<string, string>;
      for (const [key, value] of Object.entries(attrs)) {
        if (!attributeMap[key]) attributeMap[key] = new Set();
        attributeMap[key].add(value);
      }
    }
  }

  return Object.fromEntries(
    Object.entries(attributeMap).map(([key, values]) => [key, Array.from(values).sort()])
  );
}
