import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { buildSearchText } from '@/lib/products/search-text';
import { adminProductSchema } from '@/lib/validations';

export async function GET() {
  try {
    await requireAdmin();
    const products = await prisma.product.findMany({
      include: {
        variants: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        healthInfo: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const parsed = adminProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });
    }

    const {
      name,
      slug: rawSlug,
      description,
      ingredients,
      shortDescription,
      isPublished,
      isFeatured,
      categoryIds,
      tagIds,
      healthInfo,
      images,
      variants,
    } = parsed.data;

    const slug = rawSlug || slugify(name);
    const tagNames = tagIds?.length
      ? (await prisma.tag.findMany({ where: { id: { in: tagIds } }, select: { name: true } })).map((t) => t.name)
      : [];
    const categoryNames = categoryIds?.length
      ? (await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { name: true } })).map((c) => c.name)
      : [];

    const searchText = buildSearchText({
      name,
      description,
      shortDescription,
      ingredients,
      tagNames,
      categoryNames,
    });

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        ingredients,
        shortDescription,
        isPublished: isPublished ?? false,
        isFeatured: isFeatured ?? false,
        searchText,
        categories: categoryIds?.length ? { create: categoryIds.map((id: string) => ({ categoryId: id })) } : undefined,
        tags: tagIds?.length ? { create: tagIds.map((id: string) => ({ tagId: id })) } : undefined,
        healthInfo: healthInfo
          ? { create: healthInfo as Prisma.HealthInfoCreateWithoutProductInput }
          : undefined,
        images: images?.length
          ? { create: images.map((img: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean }, i: number) => ({
              url: img.url,
              altText: img.altText || name,
              sortOrder: img.sortOrder ?? i,
              isPrimary: img.isPrimary ?? i === 0,
            })) }
          : undefined,
        variants: variants?.length
          ? {
              create: variants.map((v) => ({
                sku: v.sku,
                name: v.name,
                price: v.price,
                compareAtPrice: v.compareAtPrice ?? undefined,
                stockQuantity: v.stockQuantity ?? 0,
                lowStockThreshold: v.lowStockThreshold ?? 5,
                attributes: v.attributes || {},
              })),
            }
          : { create: [{ sku: `${slug}-default`, name: 'Default', price: 999, stockQuantity: 10 }] },
      },
      include: { variants: true },
    });

    const defaultVariant = product.variants[0];
    if (defaultVariant) {
      await prisma.product.update({
        where: { id: product.id },
        data: { defaultVariantId: defaultVariant.id },
      });
    }

    return NextResponse.json({ product });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
