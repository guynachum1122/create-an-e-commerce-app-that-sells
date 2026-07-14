import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { DiscountType } from '@prisma/client';
import { promoSchema } from '@/lib/validations';
import { getOrCreateCart, cartSubtotal } from '@/lib/cart/service';
import { rateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimitAsync(`promo:${ip}`, 10, 60_000);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
    }

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Sign in to apply promo codes.' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = promoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Promo code required' }, { status: 400 });
    }

    const cart = await getOrCreateCart();
    const subtotal = cartSubtotal(cart.items);
    const { code } = parsed.data;

    const promo = await prisma.promoCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!promo || !promo.isActive) {
      return NextResponse.json({ error: 'That promo code isn\'t valid or has expired.' }, { status: 400 });
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return NextResponse.json({ error: 'That promo code isn\'t valid or has expired.' }, { status: 400 });
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ error: 'That promo code isn\'t valid or has expired.' }, { status: 400 });
    }

    if (promo.minOrderCents !== null && subtotal < promo.minOrderCents) {
      return NextResponse.json({
        error: `This code requires a minimum order of $${(promo.minOrderCents / 100).toFixed(2)}.`,
      }, { status: 400 });
    }

    let discountAmount = 0;
    if (promo.discountType === DiscountType.PERCENT) {
      discountAmount = Math.round(subtotal * (promo.discountValue / 100));
    } else {
      discountAmount = Math.min(promo.discountValue, subtotal);
    }

    return NextResponse.json({
      valid: true,
      promoCodeId: promo.id,
      code: promo.code,
      discountAmount,
      subtotal,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to validate promo code' }, { status: 500 });
  }
}
