import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { wishlistSchema } from '@/lib/validations';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Sign in to save items to your wishlist.' }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`wishlist:${session.user.id}:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  }

  const { productId } = parsed.data;

  const product = await prisma.product.findFirst({
    where: { id: productId, isPublished: true },
  });
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId: session.user.id, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ added: false });
  }

  await prisma.wishlistItem.create({
    data: { userId: session.user.id, productId },
  });

  return NextResponse.json({ added: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimitAsync(`wishlist:${session.user.id}:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json();
  const parsed = wishlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
  }

  await prisma.wishlistItem.deleteMany({
    where: { userId: session.user.id, productId: parsed.data.productId },
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ items: [] }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          images: { take: 1 },
          variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
          tags: { include: { tag: true } },
        },
      },
    },
  });

  return NextResponse.json({ items });
}
