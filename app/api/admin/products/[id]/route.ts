import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { buildSearchText } from '@/lib/products/search-text';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        healthInfo: true,
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } }, categories: { include: { category: true } } },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tagNames = body.tagIds?.length
      ? (await prisma.tag.findMany({ where: { id: { in: body.tagIds } }, select: { name: true } })).map((t) => t.name)
      : existing.tags.map((t) => t.tag.name);
    const categoryNames = body.categoryIds?.length
      ? (await prisma.category.findMany({ where: { id: { in: body.categoryIds } }, select: { name: true } })).map((c) => c.name)
      : existing.categories.map((c) => c.category.name);

    const searchText = buildSearchText({
      name: body.name ?? existing.name,
      description: body.description ?? existing.description,
      shortDescription: body.shortDescription ?? existing.shortDescription,
      ingredients: body.ingredients ?? existing.ingredients,
      tagNames,
      categoryNames,
    });

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          name: body.name,
          slug: body.slug || (body.name ? slugify(body.name) : undefined),
          description: body.description,
          ingredients: body.ingredients,
          shortDescription: body.shortDescription,
          isPublished: body.isPublished,
          isFeatured: body.isFeatured,
          metaTitle: body.metaTitle,
          metaDescription: body.metaDescription,
          searchText,
        },
      });

      if (body.categoryIds) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        if (body.categoryIds.length) {
          await tx.productCategory.createMany({
            data: body.categoryIds.map((categoryId: string) => ({ productId: id, categoryId })),
          });
        }
      }

      if (body.tagIds) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        if (body.tagIds.length) {
          await tx.productTag.createMany({
            data: body.tagIds.map((tagId: string) => ({ productId: id, tagId })),
          });
        }
      }

      if (body.healthInfo) {
        await tx.healthInfo.upsert({
          where: { productId: id },
          create: {
            productId: id,
            servingSize: body.healthInfo.servingSize,
            calories: body.healthInfo.calories,
            proteinGrams: body.healthInfo.proteinGrams,
            carbohydratesGrams: body.healthInfo.carbohydratesGrams,
            fatGrams: body.healthInfo.fatGrams,
            fiberGrams: body.healthInfo.fiberGrams,
            sugarGrams: body.healthInfo.sugarGrams,
            sodiumMg: body.healthInfo.sodiumMg,
            allergens: body.healthInfo.allergens || [],
            additionalNotes: body.healthInfo.additionalNotes,
          },
          update: {
            servingSize: body.healthInfo.servingSize,
            calories: body.healthInfo.calories,
            proteinGrams: body.healthInfo.proteinGrams,
            carbohydratesGrams: body.healthInfo.carbohydratesGrams,
            fatGrams: body.healthInfo.fatGrams,
            fiberGrams: body.healthInfo.fiberGrams,
            sugarGrams: body.healthInfo.sugarGrams,
            sodiumMg: body.healthInfo.sodiumMg,
            allergens: body.healthInfo.allergens || [],
            additionalNotes: body.healthInfo.additionalNotes,
          },
        });
      }

      if (body.images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (body.images.length) {
          await tx.productImage.createMany({
            data: body.images.map((img: { url: string; altText?: string; sortOrder?: number; isPrimary?: boolean }, i: number) => ({
              productId: id,
              url: img.url,
              altText: img.altText,
              sortOrder: img.sortOrder ?? i,
              isPrimary: img.isPrimary ?? i === 0,
            })),
          });
        }
      }

      if (body.variants?.length) {
        for (const v of body.variants) {
          if (v.id) {
            await tx.variant.update({
              where: { id: v.id },
              data: {
                name: v.name,
                price: v.price,
                compareAtPrice: v.compareAtPrice,
                stockQuantity: v.stockQuantity,
                lowStockThreshold: v.lowStockThreshold,
                attributes: v.attributes || {},
                isActive: v.isActive ?? true,
              },
            });
          }
        }
      }
    });

    const product = await prisma.product.findUnique({ where: { id } });
    return NextResponse.json({ product });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { isPublished: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
