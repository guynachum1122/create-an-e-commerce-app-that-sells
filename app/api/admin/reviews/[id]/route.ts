import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth';
import { prisma } from '@/lib/db';
import { adminReviewUpdateSchema } from '@/lib/validations';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const parsed = adminReviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const review = await prisma.review.update({
      where: { id },
      data: { isVisible: parsed.data.isVisible },
    });

    const agg = await prisma.review.aggregate({
      where: { productId: review.productId, isVisible: true },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: review.productId },
      data: { averageRating: agg._avg.rating || 0, reviewCount: agg._count },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const review = await prisma.review.delete({ where: { id } });

    const agg = await prisma.review.aggregate({
      where: { productId: review.productId, isVisible: true },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: review.productId },
      data: { averageRating: agg._avg.rating || 0, reviewCount: agg._count },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}
