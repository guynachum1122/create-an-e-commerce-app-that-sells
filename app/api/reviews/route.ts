import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { reviewSchema } from '@/lib/validations';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to leave a review.' }, { status: 401 });
    }

    const rl = rateLimit(`review:${session.user.id}`, 5, 60 * 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many reviews. Try again later.' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid review' }, { status: 400 });
    }

    const { productId, rating, title, body: reviewBody } = parsed.data;

    const deliveredOrder = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        status: 'DELIVERED',
        items: { some: { productId } },
        payment: { status: 'SUCCEEDED' },
      },
      orderBy: { placedAt: 'desc' },
    });

    if (!deliveredOrder) {
      return NextResponse.json(
        { error: 'You can only review products you have purchased and received.' },
        { status: 403 }
      );
    }

    const review = await prisma.review.upsert({
      where: { productId_userId: { productId, userId: session.user.id } },
      create: {
        productId,
        userId: session.user.id,
        orderId: deliveredOrder?.id,
        rating,
        title,
        body: reviewBody,
      },
      update: { rating, title, body: reviewBody },
    });

    const agg = await prisma.review.aggregate({
      where: { productId, isVisible: true },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: agg._avg.rating || 0,
        reviewCount: agg._count,
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Review submit failed' }, { status: 500 });
  }
}
